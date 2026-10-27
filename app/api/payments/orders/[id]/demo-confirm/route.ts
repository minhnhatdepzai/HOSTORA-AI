import { z } from "zod";
import { demoPaymentsEnabled } from "@/lib/payments/demo";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";
import { sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!demoPaymentsEnabled()) return jsonError("Thanh toán kiểm thử chưa được bật.", 503);
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);

  try {
    const { id } = await context.params;
    if (!/^HST-[A-F0-9]{12}$/.test(id)) return jsonError("Mã hóa đơn không hợp lệ.", 400);
    const input = await parseSmallJson(request, z.object({
      accessCode: z.string().min(20).max(128),
      method: z.enum(["stripe", "vnpay"]),
    }));
    const invoice = getPaymentStore().completeDemoPayment(id, input.accessCode, input.method);
    scheduleOrderEmail(() => notifyInvoiceStatusChanged(invoice));
    return noStoreJson({ invoice, mode: "demo", charged: false });
  } catch {
    return jsonError("Không thể xác nhận thanh toán kiểm thử cho hóa đơn này.", 409);
  }
}
