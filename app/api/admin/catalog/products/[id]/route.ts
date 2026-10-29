import { ZodError } from "zod";
import {
  getCatalogStore,
  productPatchSchema,
} from "@/lib/admin/catalog-store";
import {
  adminSessionFromRequest,
  sameOrigin,
} from "@/lib/payments/admin-auth";
import {
  jsonError,
  noStoreJson,
  parseSmallJson,
} from "@/lib/payments/route-utils";

export const runtime = "nodejs";

type ProductContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: ProductContext) {
  if (!sameOrigin(request)) {
    return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  }
  if (!adminSessionFromRequest(request)) {
    return jsonError("Cần đăng nhập quản trị.", 401);
  }
  try {
    const { id } = await context.params;
    const input = await parseSmallJson(request, productPatchSchema, 12_000);
    return noStoreJson(getCatalogStore().updateProduct(id, input));
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Thông tin dịch vụ chưa hợp lệ.", 400);
    }
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật dịch vụ.";
    return jsonError(message, message === "Không tìm thấy dịch vụ." ? 404 : 400);
  }
}

export async function DELETE(request: Request, context: ProductContext) {
  if (!sameOrigin(request)) {
    return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  }
  if (!adminSessionFromRequest(request)) {
    return jsonError("Cần đăng nhập quản trị.", 401);
  }
  try {
    const { id } = await context.params;
    return noStoreJson(getCatalogStore().archiveProduct(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể lưu trữ dịch vụ.";
    return jsonError(message, message === "Không tìm thấy dịch vụ." ? 404 : 400);
  }
}
