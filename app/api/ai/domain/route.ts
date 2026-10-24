import { structuredChat } from "@/lib/ollama";
import { parseRequestJson } from "@/lib/api-validation";
import { z } from "zod";

const output = z.object({
  summary: z.string(),
  domains: z
    .array(z.object({ domain: z.string(), reason: z.string() }))
    .length(5),
  slogans: z.array(z.string()).length(3),
  tagline: z.string(),
});
const format = {
  type: "object",
  properties: {
    summary: { type: "string" },
    domains: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: { domain: { type: "string" }, reason: { type: "string" } },
        required: ["domain", "reason"],
      },
    },
    slogans: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    tagline: { type: "string" },
  },
  required: ["summary", "domains", "slogans", "tagline"],
};
export async function POST(request: Request) {
  const parsed = await parseRequestJson(
    request,
    z.object({ brand: z.string().min(2).max(80) }),
  );
  if (parsed.response) return parsed.response;
  const { brand } = parsed.data;
  const result = await structuredChat(
    "Bạn là cố vấn thương hiệu Việt Nam. Gợi ý tên miền dễ nhớ, không dấu, chỉ dùng .com, .vn, .com.vn, .shop. Lý do phải ngắn, dễ hiểu với chủ kinh doanh và không dùng thuật ngữ kỹ thuật. Tuyệt đối không khẳng định tên còn trống.",
    `Thương hiệu: ${brand}`,
    output,
    format,
  );
  return Response.json({
    ...result,
    availability: "not-checked",
    disclaimer: "Gợi ý sáng tạo; chưa kiểm tra tình trạng đăng ký tên miền.",
  });
}
