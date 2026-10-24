import { recommendPlans } from "@/lib/recommendation";
import { parseRequestJson } from "@/lib/api-validation";
import { z } from "zod";

const schema = z.object({
  websiteType: z.enum(["store", "company", "blog"]),
  monthlyVisits: z.number().int().min(1).max(100000000),
  monthlyBudget: z.number().int().min(10000).max(100000000),
  needsDomain: z.boolean(),
  ecommerce: z.boolean(),
  notes: z.string().max(1000).optional(),
});
export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, schema);
  if (parsed.response) return parsed.response;
  const requirements = parsed.data;
  return Response.json({
    requirements,
    recommendations: recommendPlans(requirements),
    calculatedBy: "deterministic-weighted-ranking-v1",
    catalogVerifiedAt: "2026-10-23",
  });
}
