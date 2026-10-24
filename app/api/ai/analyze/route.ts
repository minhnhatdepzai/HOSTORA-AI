import { structuredChat } from "@/lib/ollama";
import { parseRequestJson } from "@/lib/api-validation";
import { redactContactInfo } from "@/lib/privacy";
import { z } from "zod";

const resultSchema = z.object({
  websiteType: z.enum(["store", "company", "blog", "unknown"]),
  monthlyVisits: z.number().nonnegative().nullable(),
  monthlyBudget: z.number().nonnegative().nullable(),
  needsDomain: z.boolean().nullable(),
  ecommerce: z.boolean(),
  known: z.array(z.string()),
  missing: z.array(z.string()),
  followUpQuestion: z.string(),
});
const jsonSchema = {
  type: "object",
  properties: {
    websiteType: { enum: ["store", "company", "blog", "unknown"] },
    monthlyVisits: { type: ["number", "null"] },
    monthlyBudget: { type: ["number", "null"] },
    needsDomain: { type: ["boolean", "null"] },
    ecommerce: { type: "boolean" },
    known: {
      type: "array",
      maxItems: 8,
      items: { type: "string", maxLength: 160 },
    },
    missing: {
      type: "array",
      maxItems: 8,
      items: { type: "string", maxLength: 160 },
    },
    followUpQuestion: { type: "string", maxLength: 300 },
  },
  required: [
    "websiteType",
    "monthlyVisits",
    "monthlyBudget",
    "needsDomain",
    "ecommerce",
    "known",
    "missing",
    "followUpQuestion",
  ],
};

export async function POST(request: Request) {
  const parsed = await parseRequestJson(
    request,
    z.object({ text: z.string().min(10).max(2000) }),
  );
  if (parsed.response) return parsed.response;
  const { text } = parsed.data;
  const result = await structuredChat(
    "Bạn trích xuất nhu cầu hosting bằng tiếng Việt. Chỉ dùng dữ kiện có trong câu; thiếu thì null/unknown. Ngân sách trả về VND mỗi tháng. Cụm 'bán ... online', 'shop', 'cửa hàng', 'đơn hàng' hoặc 'thanh toán' nghĩa là websiteType=store và ecommerce=true. Website giới thiệu doanh nghiệp là company; trang nội dung/bài viết là blog. Không hỏi về dung lượng, băng thông hay database vì wizard không thu các trường đó. Không tự bịa.",
    redactContactInfo(text),
    resultSchema,
    jsonSchema,
  );
  return Response.json({
    ...result,
    model: process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:9b-q8_0",
    local: true,
  });
}
