import { sameOrigin } from "@/lib/payments/admin-auth";
import { emailConfigFromEnv, notifyAdminLoginCode, scheduleOrderEmail } from "@/lib/payments/email";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { getCustomerStore } from "@/lib/customer/store";
import { protectRateLimitedAction } from "@/lib/security/abuse-protection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  const abuseResponse = protectRateLimitedAction({
    action: "admin-email-code-request",
    limit: 4,
    request,
    store: getCustomerStore(),
    windowMs: 60 * 60 * 1000,
  });
  if (abuseResponse) return abuseResponse;
  if (!emailConfigFromEnv()) return jsonError("Email quản trị chưa được cấu hình.", 503);
  try {
    const login = getPaymentStore().createAdminEmailCode();
    scheduleOrderEmail(() => notifyAdminLoginCode(login.code, login.expiresAt));
    return noStoreJson({ ok: true, expiresAt: login.expiresAt });
  } catch {
    return jsonError("Mã vừa được gửi. Vui lòng đợi một phút trước khi yêu cầu lại.", 429);
  }
}
