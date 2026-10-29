import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";
import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { sameOrigin } from "@/lib/payments/admin-auth";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const customer = customerFromRequest(request);
  if (!customer)
    return jsonError("Bạn cần đăng nhập trước khi yêu cầu hoàn tiền.", 401);
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  try {
    const { id } = await context.params;
    const { accessCode, reason } = await parseSmallJson(request, z.object({
      accessCode: z.string().min(1).max(128),
      reason: z.string().trim().min(8).max(500),
    }));
    const store = getPaymentStore();
    const ownedInvoice = store.findForCustomer(id, accessCode);
    if (
      !ownedInvoice ||
      ownedInvoice.customerEmail?.toLowerCase() !== customer.email
    )
      return jsonError("Hóa đơn không thuộc tài khoản đang đăng nhập.", 403);
    const invoice = store.requestRefund(id, accessCode, reason);
    scheduleOrderEmail(() => notifyInvoiceStatusChanged(invoice));
    return noStoreJson({ invoice });
  } catch {
    return jsonError("Đơn chưa đủ điều kiện yêu cầu hoàn tiền.", 409);
  }
}
