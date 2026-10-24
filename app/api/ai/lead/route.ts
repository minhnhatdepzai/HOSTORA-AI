import { structuredChat } from "@/lib/ollama";
import { parseRequestJson } from "@/lib/api-validation";
import { redactContactInfo } from "@/lib/privacy";
import { z } from "zod";

const input = z.object({
  plan: z.string().max(120),
  websiteType: z.enum(["store", "company", "blog"]),
  monthlyBudget: z.number().nonnegative(),
  monthlyVisits: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
});
const output = z.object({
  segment: z.enum([
    "new-site",
    "upgrade",
    "price-sensitive",
    "technical-consulting",
  ]),
  unansweredQuestions: z.array(z.string()).max(4),
  suggestedNextMessage: z.string(),
});
const format = {
  type: "object",
  properties: {
    segment: {
      enum: ["new-site", "upgrade", "price-sensitive", "technical-consulting"],
    },
    unansweredQuestions: {
      type: "array",
      maxItems: 4,
      items: { type: "string", maxLength: 180 },
    },
    suggestedNextMessage: { type: "string", maxLength: 400 },
  },
  required: ["segment", "unansweredQuestions", "suggestedNextMessage"],
};

export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, input);
  if (parsed.response) return parsed.response;
  const facts = parsed.data;
  const result = await structuredChat(
    "Phân loại nhu cầu lead để hỗ trợ nhân viên tư vấn. Đây là suy luận hỗ trợ, không đánh giá con người. Chỉ dùng dữ kiện cung cấp; không suy đoán PII.",
    JSON.stringify({ ...facts, notes: redactContactInfo(facts.notes ?? "") }),
    output,
    format,
  );
  return Response.json(result);
}
