import { hashCustomerPassword } from "@/lib/customer/password";
import { customerRegisterSchema } from "@/lib/customer/schemas";
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
  const parsed = await parseRequestJson(request, customerRegisterSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  if (!store.consumeRateLimit(`register:${parsed.data.email}`, 4, 60 * 60 * 1000))
    return Response.json(
      { error: "Bạn đã thử đăng ký quá nhiều lần. Hãy quay lại sau." },
      { status: 429 },
    );
  if (store.getCustomerWithPassword(parsed.data.email))
    return Response.json(
      { error: "Email này đã có tài khoản. Hãy đăng nhập hoặc đặt lại mật khẩu." },
      { status: 409 },
    );
  try {
    const passwordHash = await hashCustomerPassword(parsed.data.password);
    const customer = store.createCustomer({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    });
    const session = store.createSession(customer.id);
    const response = Response.json(
      {
        customer,
        ...(mobile ? { sessionToken: session.token } : {}),
      },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
    if (!mobile)
      response.headers.set(
        "set-cookie",
        customerSessionCookie(session.token, new URL(request.url).protocol === "https:"),
      );
    return response;
  } catch {
    return Response.json(
      { error: "Chưa tạo được tài khoản. Hãy kiểm tra thông tin rồi thử lại." },
      { status: 400 },
    );
  }
}
