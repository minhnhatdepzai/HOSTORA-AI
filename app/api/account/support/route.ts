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
import { rateLimitResponse } from "@/lib/security/abuse-protection";

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
  const budget = store.consumeRateLimitDetailed(
    `support:${customer.id}`,
    8,
    60 * 60 * 1000,
  );
  if (!budget.allowed) return rateLimitResponse(budget.retryAfterSeconds);
  const supportCase = store.createSupportCase(customer.id, parsed.data);
  scheduleOrderEmail(() => notifyCustomerSupportCreated(customer, supportCase));
  return Response.json(
    { supportCase },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
