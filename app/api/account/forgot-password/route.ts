import { parseRequestJson } from "@/lib/api-validation";
import { isMobileAuthRequest } from "@/lib/customer/auth";
import { customerForgotSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";
import {
  notifyCustomerPasswordReset,
  scheduleOrderEmail,
} from "@/lib/payments/email";
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
  const row = store.getCustomerWithPassword(parsed.data.email);
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
        "Nếu email có tài khoản, HOSTORA sẽ gửi liên kết đặt lại trong ít phút.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
