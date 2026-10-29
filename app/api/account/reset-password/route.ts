import { parseRequestJson } from "@/lib/api-validation";
import {
  customerSessionCookie,
  isMobileAuthRequest,
} from "@/lib/customer/auth";
import { hashCustomerPassword } from "@/lib/customer/password";
import { customerResetSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const mobile = isMobileAuthRequest(request);
  if (!mobile && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, customerResetSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  if (!store.consumeRateLimit(`reset-token:${parsed.data.token}`, 6, 60 * 60 * 1000))
    return Response.json(
      { error: "Liên kết đã được thử quá nhiều lần." },
      { status: 429 },
    );
  const passwordHash = await hashCustomerPassword(parsed.data.password);
  const customer = store.resetPassword(parsed.data.token, passwordHash);
  if (!customer)
    return Response.json(
      { error: "Liên kết đặt lại không đúng, đã dùng hoặc đã hết hạn." },
      { status: 400 },
    );
  const session = store.createSession(customer.id);
  const response = Response.json(
    {
      customer,
      ...(mobile ? { sessionToken: session.token } : {}),
    },
    { headers: { "cache-control": "no-store" } },
  );
  if (!mobile)
    response.headers.set(
      "set-cookie",
      customerSessionCookie(session.token, new URL(request.url).protocol === "https:"),
    );
  return response;
}
