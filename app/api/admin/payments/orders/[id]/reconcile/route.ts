import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { stripeClient, stripeConfigFromEnv, verifiedStripeCheckout } from "@/lib/payments/stripe";
import { queryVnpayTransaction, vnpayConfigFromEnv } from "@/lib/payments/vnpay";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const { id } = await context.params;
  const store = getPaymentStore();
  const invoice = store.getInvoice(id);
  if (!invoice || !invoice.provider || !invoice.providerReference) return jsonError("Chưa có giao dịch để đối soát.", 409);
  try {
    if (invoice.provider === "stripe") {
      const config = stripeConfigFromEnv();
      if (!config) return jsonError("Stripe sandbox chưa được cấu hình.", 503);
      const stripe = stripeClient(config);
      const session = await stripe.checkout.sessions.retrieve(invoice.providerReference);
      if (["pending", "cancel_requested"].includes(invoice.status) && session.payment_status === "paid") {
        verifiedStripeCheckout(invoice, session);
        store.markPaid(id, "stripe", session.id, invoice.amountVnd, "vnd");
      }
      if (invoice.status === "refund_pending" && invoice.refundReference) {
        const intent = verifiedStripeCheckout(invoice, session);
        const refunds = await stripe.refunds.list({ payment_intent: intent, limit: 100 });
        const matched = refunds.data.find((item) => item.metadata?.invoiceId === id && item.metadata?.refundAttempt === invoice.refundReference && item.amount === invoice.amountVnd && item.currency === "vnd");
        if (matched?.status === "succeeded") store.markRefunded(id, invoice.refundReference, matched.amount);
        if (matched?.status === "failed" || matched?.status === "canceled") store.markRefundFailed(id, invoice.refundReference, "Stripe báo hoàn tiền không thành công.");
      }
    } else {
      const config = vnpayConfigFromEnv();
      if (!config) return jsonError("VNPay sandbox chưa được cấu hình.", 503);
      const result = await queryVnpayTransaction(config, invoice);
      if (result.vnp_ResponseCode === "00" && result.vnp_TransactionStatus === "00" &&
        ["pending", "cancel_requested"].includes(invoice.status) && /^\d{14}$/.test(String(result.vnp_PayDate ?? "")) && /^\d{1,20}$/.test(String(result.vnp_TransactionNo ?? ""))) {
        store.markPaid(id, "vnpay", id, invoice.amountVnd, "vnd", String(result.vnp_PayDate), String(result.vnp_TransactionNo));
      }
      if (invoice.status === "refund_pending" && invoice.refundReference && result.vnp_ResponseCode === "00" && result.vnp_TransactionType === "02") {
        if (result.vnp_TransactionStatus === "00") store.markRefunded(id, invoice.refundReference, invoice.amountVnd);
        if (result.vnp_TransactionStatus === "09") store.markRefundFailed(id, invoice.refundReference, "VNPay báo yêu cầu hoàn tiền bị từ chối.");
      }
    }
    const updated = store.getInvoice(id);
    if (updated && updated.status !== invoice.status) {
      scheduleOrderEmail(() => notifyInvoiceStatusChanged(updated));
    }
    return noStoreJson({ invoice: updated });
  } catch {
    return jsonError("Không thể xác minh trạng thái tại cổng thanh toán lúc này.", 502);
  }
}
