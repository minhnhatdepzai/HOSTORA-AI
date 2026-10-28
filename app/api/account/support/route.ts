import { parseRequestJson } from "@/lib/api-validation";
import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { customerSupportSchema } from "@/lib/customer/schemas";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";
import {
  notifyCustomerSupportCreated,
  scheduleOrderEmail,
} from "@/lib/payments/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập để được hỗ trợ." }, { status: 401 });
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, customerSupportSchema);
  if (parsed.response) return parsed.response;
  const store = getCustomerStore();
  if (!store.consumeRateLimit(`support:${customer.id}`, 8, 60 * 60 * 1000))
    return Response.json(
      { error: "Bạn đã gửi nhiều yêu cầu. Hãy chờ đội hỗ trợ phản hồi." },
      { status: 429 },
    );
  const supportCase = store.createSupportCase(customer.id, parsed.data);
  scheduleOrderEmail(() => notifyCustomerSupportCreated(customer, supportCase));
  return Response.json(
    { supportCase },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
