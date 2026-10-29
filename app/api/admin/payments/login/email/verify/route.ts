import { z } from "zod";
import { adminConfigFromEnv, adminSessionCookie, issueAdminEmailSession, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { getCustomerStore } from "@/lib/customer/store";
import { protectRateLimitedAction } from "@/lib/security/abuse-protection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  const abuseResponse = protectRateLimitedAction({
    action: "admin-email-code-verify",
    limit: 8,
    request,
    store: getCustomerStore(),
    windowMs: 15 * 60 * 1000,
  });
  if (abuseResponse) return abuseResponse;
  try {
    const body = await parseSmallJson(request, z.object({ code: z.string().regex(/^\d{6}$/) }));
    if (!getPaymentStore().verifyAdminEmailCode(body.code)) return jsonError("Mã không đúng, đã hết hạn hoặc đã dùng.", 401);
    const token = issueAdminEmailSession(adminConfigFromEnv());
    if (!token) return jsonError("Phiên quản trị chưa thể khởi tạo.", 503);
    const secure = new URL(request.url).protocol === "https:";
    const response = noStoreJson({ ok: true });
    response.headers.set("set-cookie", adminSessionCookie(token, secure));
    return response;
  } catch {
    return jsonError("Mã đăng nhập không hợp lệ.", 400);
  }
}
