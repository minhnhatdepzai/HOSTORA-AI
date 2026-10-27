import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { notifySaleRequestCancelled, scheduleOrderEmail } from "@/lib/payments/email";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/payments/requests/[id]/cancel">) {
  try {
    const { id } = await context.params;
    if (!/^HSR-[A-F0-9]{10}$/.test(id)) return jsonError("Mã yêu cầu không hợp lệ.", 400);
    const input = await parseSmallJson(request, z.object({
      accessCode: z.string().min(20).max(128),
      reason: z.string().trim().min(5).max(500),
    }));
    const saleRequest = getPaymentStore().cancelSaleRequest(id, input.accessCode, input.reason);
    scheduleOrderEmail(() => notifySaleRequestCancelled(saleRequest));
    return noStoreJson({ request: saleRequest });
  } catch {
    return jsonError("Không thể hủy yêu cầu này hoặc yêu cầu đã được xử lý.", 409);
  }
}
