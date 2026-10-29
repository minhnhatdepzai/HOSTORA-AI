import { structuredChat } from "@/lib/ollama";
import { parseRequestJson } from "@/lib/api-validation";
import { redactContactInfo } from "@/lib/privacy";
import { z } from "zod";
import { analysisSchema, reconcileAnalysis } from "@/lib/advisor-analysis";

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
  try {
  const result = await structuredChat(
    "Bạn hiểu nhu cầu chọn hosting bằng tiếng Việt. Chỉ dùng dữ kiện có trong câu; thiếu thì để trống. Ngân sách trả về VND mỗi tháng. Cụm 'bán ... online', 'shop', 'cửa hàng', 'đơn hàng' hoặc 'thanh toán' nghĩa là website bán hàng. Website giới thiệu doanh nghiệp là company; trang nội dung/bài viết là blog. Câu hỏi tiếp theo phải ngắn, thân thiện và chỉ hỏi một trong bốn thông tin: loại website, lượt khách dự kiến, ngân sách hoặc nhu cầu tên miền. Không dùng thuật ngữ lập trình và không tự bịa.",
    redactContactInfo(text),
    analysisSchema,
    jsonSchema,
    "requirements_analysis",
  );
  return Response.json({
    ...reconcileAnalysis(text, result),
    model: process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:9b-q8_0",
    local: true,
  });
  } catch {
    return Response.json({ error: "Trợ lý đang không khả dụng. Bạn có thể tự điền bốn bước bên cạnh để nhận đề xuất." }, { status: 503 });
  }
}
