import { parseRequestJson } from "@/lib/api-validation";
import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import {
  customerSourceInputSchema,
  extractCustomerSource,
} from "@/lib/customer-ai-sources";
import { sameOrigin } from "@/lib/payments/admin-auth";
import { rateLimitResponse } from "@/lib/security/abuse-protection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const sources = getCustomerStore().listAiSources(customer.id).map((source) => ({
    id: source.id,
    title: source.title,
    kind: source.kind,
    sourceUrl: source.sourceUrl,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    characters: source.content.length,
  }));
  return Response.json({ sources }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const store = getCustomerStore();
  const budget = store.consumeRateLimitDetailed(
    `ai-source:create:${customer.id}`,
    12,
    60 * 60 * 1000,
  );
  if (!budget.allowed) return rateLimitResponse(budget.retryAfterSeconds);
  if (store.listAiSources(customer.id).length >= 30)
    return Response.json(
      { error: "Bạn đã đạt giới hạn 30 nguồn. Hãy xóa nguồn cũ trước." },
      { status: 409 },
    );
  const parsed = await parseRequestJson(
    request,
    customerSourceInputSchema,
    11_200_000,
  );
  if (parsed.response) return parsed.response;
  try {
    const extracted = await extractCustomerSource(parsed.data);
    const source = store.createAiSource(customer.id, extracted);
    return Response.json(
      {
        source: {
          id: source.id,
          title: source.title,
          kind: source.kind,
          sourceUrl: source.sourceUrl,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
          characters: source.content.length,
        },
      },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chưa đọc được nguồn này.",
      },
      { status: 422, headers: { "cache-control": "no-store" } },
    );
  }
}
