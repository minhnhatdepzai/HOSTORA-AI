import { describe, expect, it } from "vitest";
import { imagePayloadSchema, journeyResultSchema, nextJourneyGuidance, sanitizeJourneyResult } from "@/lib/journey-ocr";

describe("trợ lý đọc bước tiếp theo từ ảnh", () => {
  it("chỉ nhận ảnh cục bộ đúng loại và giới hạn kích thước", () => {
    expect(imagePayloadSchema.parse({ mimeType: "image/png", base64: "aGVsbG8=" })).toEqual({
      mimeType: "image/png",
      base64: "aGVsbG8=",
    });
    expect(() => imagePayloadSchema.parse({ mimeType: "image/svg+xml", base64: "PHN2Zz4=" })).toThrow();
    expect(() => imagePayloadSchema.parse({ mimeType: "image/png", base64: "not base64!" })).toThrow();
  });

  it("biến bước thanh toán thành hướng dẫn cụ thể và không suy đoán giá", () => {
    const result = journeyResultSchema.parse({
      step: "card_details",
      confidence: 0.94,
      visibleSignals: ["Có ô số thẻ", "Có ô ngày hết hạn", "Có ô CVC"],
      blockedReason: null,
    });
    const guidance = nextJourneyGuidance(result);
    expect(guidance.title).toBe("Bạn đang ở bước nhập thông tin thẻ");
    expect(guidance.actions).toEqual([
      "Điền tên chủ thẻ, số thẻ, ngày hết hạn và CVC.",
      "Kiểm tra lại tổng tiền trên hóa đơn HOSTORA trước khi xác nhận.",
      "Không gửi ảnh có đầy đủ số thẻ hoặc CVC cho người khác.",
    ]);
    expect(guidance).not.toHaveProperty("amountVnd");
  });

  it("không bịa bước tiếp theo khi ảnh không đủ rõ", () => {
    const guidance = nextJourneyGuidance({
      step: "unknown",
      confidence: 0.31,
      visibleSignals: [],
      blockedReason: "Ảnh bị mờ",
    });
    expect(guidance.title).toBe("Chưa xác định được màn hình");
    expect(guidance.actions[0]).toContain("chụp lại");
  });

  it("loại dữ liệu nhạy cảm khỏi tín hiệu OCR trước khi trả về", () => {
    expect(sanitizeJourneyResult({
      step: "otp",
      confidence: 0.9,
      visibleSignals: ["OTP 123456", "Email owner@example.com", "Có nút xác nhận"],
      blockedReason: null,
    }).visibleSignals).toEqual(["Có nút xác nhận"]);
  });

  it("sửa bước nhập thẻ khi model gọi nhầm là chọn phương thức", () => {
    const result = sanitizeJourneyResult({
      step: "payment_method",
      confidence: 0.91,
      visibleSignals: ["Tên chủ thẻ", "Số thẻ", "Ngày hết hạn", "CVC"],
      blockedReason: null,
    });
    expect(result.step).toBe("card_details");
    expect(nextJourneyGuidance(result).title).toBe(
      "Bạn đang ở bước nhập thông tin thẻ",
    );
  });
});
