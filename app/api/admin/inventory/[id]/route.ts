import { z, ZodError } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

const inventoryPatchSchema = z.union([
  z.object({ quantity: z.number().int().min(0).max(100_000), lowStockThreshold: z.number().int().min(0).max(10_000).optional() }).strict(),
  z.object({ delta: z.number().int().min(-10_000).max(10_000).refine((value) => value !== 0) }).strict(),
]);

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  try {
    const { id } = await context.params;
    const input = await parseSmallJson(request, inventoryPatchSchema, 2_000);
    const inventory = "delta" in input
      ? getPaymentStore().adjustPlanInventory(id, input.delta)
      : getPaymentStore().setPlanInventory(id, input.quantity, input.lowStockThreshold);
    return noStoreJson({ inventory });
  } catch (error) {
    if (error instanceof ZodError) return jsonError("Số lượng chưa hợp lệ.", 400);
    const message = error instanceof Error ? error.message : "Không thể cập nhật số lượng.";
    return jsonError(message, message === "Không tìm thấy gói lưu trữ." ? 404 : 400);
  }
}
