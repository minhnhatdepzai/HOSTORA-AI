import { parseRequestJson } from "@/lib/api-validation";
import { isMobileAuthRequest } from "@/lib/customer/auth";
import { customerForgotSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";
import {
  notifyCustomerPasswordReset,
  scheduleOrderEmail,
} from "@/lib/payments/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isMobileAuthRequest(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, customerForgotSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  const allowed = store.consumeRateLimit(
    `reset:${parsed.data.email}`,
    4,
    60 * 60 * 1000,
  );
  const row = allowed ? store.getCustomerWithPassword(parsed.data.email) : null;
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
