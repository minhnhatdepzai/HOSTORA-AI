import { structuredChat } from "@/lib/ollama";
import { parseRequestJson } from "@/lib/api-validation";
import { redactContactInfo } from "@/lib/privacy";
import { z } from "zod";

const input = z.object({
  topic: z.enum(["recommendation", "cost", "traffic", "growth"]),
  facts: z.string().min(10).max(12000),
});
const output = z.object({
  summary: z.string(),
  tradeoffs: z.array(z.string()).min(1).max(4),
  nextStep: z.string(),
});
const format = {
  type: "object",
  properties: {
    summary: { type: "string", maxLength: 700 },
    tradeoffs: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string", maxLength: 260 },
    },
    nextStep: { type: "string", maxLength: 300 },
  },
  required: ["summary", "tradeoffs", "nextStep"],
};

export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, input);
  if (parsed.response) return parsed.response;
  const { topic, facts } = parsed.data;
  const result = await structuredChat(
    "Bạn là cố vấn hosting Việt Nam. Chỉ giải thích từ FACTS đã tính sẵn; không sửa giá, điểm hay số liệu và không tự thêm cam kết hiệu năng. Với traffic phải nói đây là giả định và cần benchmark thật.",
    `Chủ đề: ${topic}\nFACTS:\n${redactContactInfo(facts)}`,
    output,
    format,
  );
  return Response.json(result);
}
