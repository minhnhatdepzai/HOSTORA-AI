import {
  consumeDummyPasswordCheck,
  verifyCustomerPassword,
} from "@/lib/customer/password";
import { customerLoginSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import {
  customerSessionCookie,
  isMobileAuthRequest,
} from "@/lib/customer/auth";
import { parseRequestJson } from "@/lib/api-validation";
import { sameOrigin } from "@/lib/payments/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const mobile = isMobileAuthRequest(request);
  if (!mobile && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, customerLoginSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  if (!store.consumeRateLimit(`login:${parsed.data.email}`, 12, 15 * 60 * 1000))
    return Response.json(
      { error: "Đăng nhập tạm khóa vì thử quá nhiều lần. Hãy đợi 15 phút." },
      { status: 429 },
    );
  const row = store.getCustomerWithPassword(parsed.data.email);
  if (!row) {
    await consumeDummyPasswordCheck(parsed.data.password);
    return Response.json(
      { error: "Email hoặc mật khẩu chưa đúng." },
      { status: 401 },
    );
  }
  if (row.locked_until && new Date(row.locked_until).valueOf() > Date.now())
    return Response.json(
      { error: "Tài khoản tạm khóa. Hãy thử lại sau 15 phút." },
      { status: 423 },
    );
  if (!(await verifyCustomerPassword(parsed.data.password, row.password_hash))) {
    store.recordLoginFailure(row.id);
    return Response.json(
      { error: "Email hoặc mật khẩu chưa đúng." },
      { status: 401 },
    );
  }
  store.clearLoginFailures(row.id);
  const session = store.createSession(row.id);
  const response = Response.json(
    {
      customer: session.customer,
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
