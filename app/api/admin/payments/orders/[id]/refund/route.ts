import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { createStripeRefund, stripeConfigFromEnv } from "@/lib/payments/stripe";
import { requestVnpayRefund, vnpayConfigFromEnv } from "@/lib/payments/vnpay";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";
import { demoPaymentsEnabled } from "@/lib/payments/demo";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const { id } = await context.params;
  let action: "approve" | "reject";
  let note: string;
  try {
    ({ action, note } = await parseSmallJson(request, z.object({
      action: z.enum(["approve", "reject"]), note: z.string().trim().min(8).max(500),
    })));
  } catch {
    return jsonError("Cần ghi lý do xử lý từ 8 đến 500 ký tự.", 400);
  }
  const store = getPaymentStore();
  const invoice = store.getInvoice(id);
  if (!invoice || invoice.status !== "refund_requested") return jsonError("Không có yêu cầu hoàn tiền đang chờ duyệt.", 409);
  const respond = (changed: NonNullable<typeof invoice>) => {
    scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
    return noStoreJson({ invoice: changed });
  };
  if (action === "reject") return respond(store.rejectRefund(id, note));
  if (invoice.provider === "demo") {
    if (!demoPaymentsEnabled()) return jsonError("Thanh toán kiểm thử chưa được bật.", 503);
    return respond(store.completeDemoRefund(id, note));
  }
  const stripe = invoice.provider === "stripe" ? stripeConfigFromEnv() : null;
  const vnpay = invoice.provider === "vnpay" ? vnpayConfigFromEnv() : null;
  if (!stripe && !vnpay) return jsonError("Cổng thanh toán sandbox chưa được cấu hình.", 503);
  const attempt = `hostora-refund-${randomUUID()}`;
  let pending;
  try {
    pending = store.startRefund(id, attempt, note);
  } catch {
    return jsonError("Yêu cầu hoàn tiền đã được xử lý.", 409);
  }
  try {
    if (stripe) {
      const result = await createStripeRefund(pending, stripe);
      if (result.status === "succeeded") return respond(store.markRefunded(id, attempt, result.amount));
      if (result.status === "failed" || result.status === "canceled") return respond(store.markRefundFailed(id, attempt, "Stripe từ chối hoàn tiền." ));
    } else if (vnpay) {
      const result = await requestVnpayRefund(vnpay, pending);
      if (result.vnp_ResponseCode !== "00") return respond(store.markRefundFailed(id, attempt, "VNPay từ chối hoàn tiền." ));
      // VNPay may continue bank processing after accepting the request.
      if (result.vnp_TransactionStatus === "00" && result.vnp_TransactionType === "02") {
        return respond(store.markRefunded(id, attempt, pending.amountVnd));
      }
    }
    const changed = store.getInvoice(id);
    if (changed) scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
    return noStoreJson({ invoice: changed, message: "Đã gửi yêu cầu; đang chờ cổng thanh toán xác nhận." });
  } catch {
    // A timeout can happen after the gateway accepts the request. Keep the pending state for reconciliation.
    return jsonError("Chưa xác định được kết quả hoàn tiền. Hãy đối soát trước khi thao tác tiếp.", 502);
  }
}
