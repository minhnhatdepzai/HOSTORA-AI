import { recommendPlans, recommendationDecision } from "@/lib/recommendation";
import { parseRequestJson } from "@/lib/api-validation";
import { requirementsSchema } from "@/lib/requirements";
export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, requirementsSchema);
  if (parsed.response) return parsed.response;
  const requirements = parsed.data;
  const recommendations = recommendPlans(requirements);
  return Response.json({
    requirements,
    recommendations,
    decision: recommendationDecision(recommendations),
    calculatedBy: "eligibility-first-ranking-v2",
    catalogVerifiedAt: "2026-10-23",
  });
}
