import { adminSessionFromRequest } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const { id } = await context.params;
  if (!/^HST-[A-F0-9]{12}$/.test(id)) return jsonError("Mã đơn không hợp lệ.", 400);
  const store = getPaymentStore();
  const invoice = store.getInvoice(id);
  if (!invoice) return jsonError("Không tìm thấy hóa đơn.", 404);
  return noStoreJson({ invoice, events: store.getEvents(id) });
}
