import { z } from "zod";
import { adminConfigFromEnv, adminSessionCookie, issueAdminSession, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  try {
    const body = await parseSmallJson(request, z.object({ password: z.string().min(1).max(200) }));
    const token = issueAdminSession(body.password, adminConfigFromEnv());
    if (!token) return jsonError("Mật khẩu quản trị không đúng hoặc chưa được cấu hình.", 401);
    const secure = new URL(request.url).protocol === "https:";
    const response = noStoreJson({ ok: true });
    response.headers.set("set-cookie", adminSessionCookie(token, secure));
    return response;
  } catch {
    return jsonError("Thông tin đăng nhập không hợp lệ.", 400);
  }
}
