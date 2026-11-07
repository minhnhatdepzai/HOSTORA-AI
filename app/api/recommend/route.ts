import { recommendPlans, recommendationDecision } from "@/lib/recommendation";
import { parseRequestJson } from "@/lib/api-validation";
import { requirementsSchema } from "@/lib/requirements";
import { getPaymentStore } from "@/lib/payments/store";
export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, requirementsSchema);
  if (parsed.response) return parsed.response;
  const requirements = parsed.data;
  const inventory = new Map(
    getPaymentStore().listPlanInventory().map((item) => [item.planId, item]),
  );
  const recommendations = recommendPlans(requirements).map((item) => ({
    ...item,
    inventory: inventory.get(item.plan.id) ?? null,
  }));
  return Response.json({
    requirements,
    recommendations,
    decision: recommendationDecision(recommendations),
    calculatedBy: "eligibility-first-ranking-v2",
    catalogVerifiedAt: "2026-10-23",
  });
}
