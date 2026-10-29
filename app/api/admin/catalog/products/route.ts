import { ZodError } from "zod";
import {
  adminProductSchema,
  getCatalogStore,
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

export function GET(request: Request) {
  if (!adminSessionFromRequest(request)) {
    return jsonError("Cần đăng nhập quản trị.", 401);
  }
  return noStoreJson({ products: getCatalogStore().listAdminProducts() });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  }
  if (!adminSessionFromRequest(request)) {
    return jsonError("Cần đăng nhập quản trị.", 401);
  }
  try {
    const input = await parseSmallJson(request, adminProductSchema, 12_000);
    return noStoreJson(getCatalogStore().createProduct(input), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("Thông tin dịch vụ chưa hợp lệ.", 400);
    }
    if (
      error instanceof Error &&
      (error.message.includes("UNIQUE constraint") ||
        error.message.includes("already exists"))
    ) {
      return jsonError("Mã dịch vụ đã tồn tại.", 409);
    }
    return jsonError(
      error instanceof Error ? error.message : "Không thể thêm dịch vụ.",
      400,
    );
  }
}
