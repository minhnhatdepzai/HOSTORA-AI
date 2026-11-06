import { randomBytes } from "node:crypto";
import { parseRequestJson } from "@/lib/api-validation";
import { isMobileAuthRequest } from "@/lib/customer/auth";
import { hashCustomerPassword } from "@/lib/customer/password";
import { customerForgotSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";
import {
  notifyCustomerPasswordReset,
  scheduleOrderEmail,
} from "@/lib/payments/email";
import { getPaymentStore } from "@/lib/payments/store";
import { protectPublicAuthAction } from "@/lib/security/abuse-protection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const mobile = isMobileAuthRequest(request);
  if (!mobile && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, customerForgotSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  const abuseResponse = await protectPublicAuthAction({
    action: "customer_forgot",
    challengeAfter: 2,
    identity: parsed.data.email,
    limit: 4,
    mobile,
    request,
    store,
    token: parsed.data.turnstileToken,
    windowMs: 60 * 60 * 1000,
  });
  if (abuseResponse) return abuseResponse;
  let row = store.getCustomerWithPassword(parsed.data.email);
  if (!row) {
    const identity = getPaymentStore().findPasswordRecoveryIdentity(
      parsed.data.email,
    );
    if (identity) {
      const passwordHash = await hashCustomerPassword(
        randomBytes(48).toString("base64url"),
      );
      try {
        store.createCustomer({
          name: identity.name,
          email: parsed.data.email,
          passwordHash,
        });
      } catch {
        // A concurrent recovery request may have created the unique email first.
      }
      row = store.getCustomerWithPassword(parsed.data.email);
    }
  }
  if (row) {
    const reset = store.createPasswordReset(row.id);
    scheduleOrderEmail(() =>
      notifyCustomerPasswordReset(
        store.getCustomer(row.id)!,
        reset.token,
        reset.expiresAt,
      ),
    );
  }
  return Response.json(
    {
      ok: true,
      message:
        "Nếu email khớp tài khoản hoặc giao dịch HOSTORA, liên kết đặt lại sẽ được gửi trong ít phút.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
