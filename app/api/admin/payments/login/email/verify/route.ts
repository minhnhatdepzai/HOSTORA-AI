import { z } from "zod";
import { ADMIN_COOKIE, adminConfigFromEnv, issueAdminEmailSession, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  try {
    const body = await parseSmallJson(request, z.object({ code: z.string().regex(/^\d{6}$/) }));
    if (!getPaymentStore().verifyAdminEmailCode(body.code)) return jsonError("Mã không đúng, đã hết hạn hoặc đã dùng.", 401);
    const token = issueAdminEmailSession(adminConfigFromEnv());
    if (!token) return jsonError("Phiên quản trị chưa thể khởi tạo.", 503);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    const response = noStoreJson({ ok: true });
    response.headers.set("set-cookie", `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin/payments; Max-Age=28800${secure}`);
    return response;
  } catch {
    return jsonError("Mã đăng nhập không hợp lệ.", 400);
  }
}
