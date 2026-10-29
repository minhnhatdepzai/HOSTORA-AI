import { adminConfigFromEnv, adminSessionFromRequest, clearedAdminSessionCookie, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { emailStatusFromEnv } from "@/lib/payments/email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = adminConfigFromEnv();
  const passwordLoginEnabled = config.password.length >= 16 && config.secret.length >= 32;
  const emailLoginEnabled = emailStatusFromEnv().configured && config.secret.length >= 32;
  return noStoreJson({
    configured: passwordLoginEnabled || emailLoginEnabled,
    passwordLoginEnabled,
    emailLoginEnabled,
    authenticated: adminSessionFromRequest(request),
  });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  const response = noStoreJson({ ok: true });
  response.headers.set("set-cookie", clearedAdminSessionCookie(new URL(request.url).protocol === "https:"));
  return response;
}
