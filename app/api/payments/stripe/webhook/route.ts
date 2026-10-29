import { getPaymentStore } from "@/lib/payments/store";
import { stripeClient, stripeConfigFromEnv, verifiedStripeCheckout } from "@/lib/payments/stripe";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";
import { readLimitedText, RequestBodyTooLargeError } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = stripeConfigFromEnv();
  if (!config) return new Response("Stripe sandbox chưa được cấu hình.", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Thiếu chữ ký Stripe.", { status: 400 });
  let event;
  try {
    const rawBody = await readLimitedText(request, 1_048_576);
    event = stripeClient(config).webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return new Response("Payload Stripe vượt quá giới hạn.", { status: 413 });
    return new Response("Chữ ký Stripe không hợp lệ.", { status: 400 });
  }
  const store = getPaymentStore();
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) return new Response("Thiếu mã hóa đơn.", { status: 400 });
      const invoice = store.getInvoice(invoiceId);
      if (!invoice || invoice.provider !== "stripe" || invoice.providerReference !== session.id) return new Response("Phiên Stripe không khớp đơn.", { status: 409 });
      verifiedStripeCheckout(invoice, session);
      const changed = store.markPaid(invoice.id, "stripe", session.id, invoice.amountVnd, "vnd");
      if (["pending", "cancel_requested"].includes(invoice.status)) {
        scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
      }
    }
    if (event.type === "refund.updated" || event.type === "refund.created") {
      const refund = event.data.object;
      const invoiceId = refund.metadata?.invoiceId;
      const attempt = refund.metadata?.refundAttempt;
      const invoice = invoiceId ? store.getInvoice(invoiceId) : null;
      if (!invoice || invoice.provider !== "stripe" || !attempt || invoice.refundReference !== attempt || refund.amount !== invoice.amountVnd || refund.currency !== "vnd") {
        return new Response("Khoản hoàn Stripe không khớp đơn.", { status: 409 });
      }
      if (refund.status === "succeeded") {
        const changed = store.markRefunded(invoice.id, attempt, refund.amount);
        if (invoice.status !== "refunded") scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
      }
      if (refund.status === "failed" || refund.status === "canceled") {
        const changed = store.markRefundFailed(invoice.id, attempt, "Stripe báo hoàn tiền không thành công.");
        scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
      }
    }
  } catch {
    return new Response("Không thể ghi nhận giao dịch; Stripe sẽ gửi lại.", { status: 409 });
  }
  return Response.json({ received: true });
}
