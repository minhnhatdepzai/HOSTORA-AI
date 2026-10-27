import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { accessCode, reason } = await parseSmallJson(request, z.object({
      accessCode: z.string().min(1).max(128), reason: z.string().trim().min(5).max(500),
    }));
    const store = getPaymentStore();
    if (!store.findForCustomer(id, accessCode)) return jsonError("Không tìm thấy hóa đơn với mã truy cập này.", 404);
    const invoice = store.requestCancel(id, accessCode, reason);
    scheduleOrderEmail(() => notifyInvoiceStatusChanged(invoice));
    return noStoreJson({ invoice });
  } catch {
    return jsonError("Hóa đơn không thể hủy ở trạng thái này.", 409);
  }
}
