import { z } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import {
  notifySaleRequestStatusChanged,
  scheduleOrderEmail,
} from "@/lib/payments/email";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/payments/requests/[id]/cancel">,
) {
  if (!sameOrigin(request))
    return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request))
    return jsonError("Cần đăng nhập quản trị.", 401);
  try {
    const { id } = await context.params;
    const input = await parseSmallJson(
      request,
      z.object({
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().min(8).max(500),
      }),
    );
    const saleRequest = getPaymentStore().resolveSaleRequestCancel(
      id,
      input.action,
      input.note,
    );
    scheduleOrderEmail(() => notifySaleRequestStatusChanged(saleRequest));
    return noStoreJson({ request: saleRequest });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Không xử lý được yêu cầu hủy mua.",
      409,
    );
  }
}
