import { imagePayloadSchema, journeyResultSchema, nextJourneyGuidance, sanitizeJourneyResult } from "@/lib/journey-ocr";
import { structuredVision } from "@/lib/ollama";

export const runtime = "nodejs";

const resultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["step", "confidence", "visibleSignals", "blockedReason"],
  properties: {
    step: { type: "string", enum: ["order_lookup", "payment_method", "card_details", "bank_selection", "otp", "payment_result", "refund_request", "website_studio", "hosting_advice", "unknown"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    visibleSignals: { type: "array", maxItems: 6, items: { type: "string", maxLength: 120 } },
    blockedReason: { anyOf: [{ type: "string", maxLength: 240 }, { type: "null" }] },
  },
};

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 7_100_000) return Response.json({ error: "Ảnh vượt quá giới hạn 5 MB." }, { status: 413 });
  const body = await request.json().catch(() => null);
  const parsed = imagePayloadSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Chỉ nhận ảnh PNG, JPEG hoặc WebP tối đa 5 MB." }, { status: 400 });
  try {
    const detected = await structuredVision(
      "Bạn là bộ phân loại màn hình cục bộ của HOSTORA. Chỉ xác định người dùng đang ở bước nào dựa trên giao diện nhìn thấy. Không đọc lại, không sao chép và không trả về số thẻ, CVC, OTP, email, số điện thoại, mã truy cập hoặc dữ liệu định danh. Không suy đoán giá, trạng thái giao dịch hay kết quả thanh toán. Nếu không chắc, chọn unknown.",
      "Phân loại ảnh vào đúng một bước. visibleSignals chỉ mô tả nhãn và loại control chung, tuyệt đối không chứa giá trị người dùng nhập.",
      parsed.data.base64,
      journeyResultSchema,
      resultJsonSchema,
      "journey_ocr",
      120_000,
    );
    const result = sanitizeJourneyResult(detected);
    return Response.json({ result, guidance: nextJourneyGuidance(result) }, {
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "Chưa đọc được ảnh trên máy này. Hãy chụp lại rõ hơn rồi thử lại." }, { status: 503 });
  }
}
