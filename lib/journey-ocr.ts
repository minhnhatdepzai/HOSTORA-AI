import { z } from "zod";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imagePayloadSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(8).max(Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8).refine(
    (value) => /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.byteLength(value, "base64") <= MAX_IMAGE_BYTES,
    "Ảnh không hợp lệ hoặc vượt quá 5 MB.",
  ),
});

export const journeySteps = [
  "order_lookup",
  "payment_method",
  "card_details",
  "bank_selection",
  "otp",
  "payment_result",
  "refund_request",
  "website_studio",
  "hosting_advice",
  "unknown",
] as const;

export const journeyResultSchema = z.object({
  step: z.enum(journeySteps),
  confidence: z.number().min(0).max(1),
  visibleSignals: z.array(z.string().trim().min(1).max(120)).max(6),
  blockedReason: z.string().trim().min(1).max(240).nullable(),
});

export type JourneyResult = z.infer<typeof journeyResultSchema>;
export type JourneyGuidance = { title: string; summary: string; actions: string[] };

const sensitiveSignal = /(?:\b\d[\d\s-]{4,}\d\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b(?:otp|cvc|cvv)\b.*\d)/i;

export function sanitizeJourneyResult(result: JourneyResult): JourneyResult {
  const signals = result.visibleSignals
    .join(" ")
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const cardFields =
    /(so the|card number)/i.test(signals) &&
    /(cvc|cvv)/i.test(signals) &&
    /(ngay het han|expiry|expiration)/i.test(signals);
  return {
    ...result,
    step: cardFields ? "card_details" : result.step,
    visibleSignals: result.visibleSignals.filter((signal) => !sensitiveSignal.test(signal)),
    blockedReason: result.blockedReason && sensitiveSignal.test(result.blockedReason) ? "Ảnh có thể chứa dữ liệu nhạy cảm." : result.blockedReason,
  };
}

const guidance: Record<Exclude<JourneyResult["step"], "unknown">, JourneyGuidance> = {
  order_lookup: {
    title: "Bạn đang ở bước tra cứu đơn",
    summary: "Cần mã đơn và mã truy cập trong email xác nhận của HOSTORA.",
    actions: ["Mở email xác nhận đơn hàng.", "Nhập đúng mã đơn và mã truy cập.", "Nếu chưa có email, kiểm tra Thư rác rồi liên hệ HOSTORA."],
  },
  payment_method: {
    title: "Bạn đang chọn phương thức thanh toán",
    summary: "Hãy chọn Stripe hoặc VNPay theo phương thức bạn muốn dùng.",
    actions: ["Kiểm tra tên dịch vụ và tổng tiền.", "Chọn cổng thanh toán phù hợp.", "Tiếp tục sang màn hình nhập thông tin thanh toán."],
  },
  card_details: {
    title: "Bạn đang ở bước nhập thông tin thẻ",
    summary: "Điền đủ trường bắt buộc rồi kiểm tra lại hóa đơn trước khi xác nhận.",
    actions: ["Điền tên chủ thẻ, số thẻ, ngày hết hạn và CVC.", "Kiểm tra lại tổng tiền trên hóa đơn HOSTORA trước khi xác nhận.", "Không gửi ảnh có đầy đủ số thẻ hoặc CVC cho người khác."],
  },
  bank_selection: {
    title: "Bạn đang chọn ngân hàng",
    summary: "Chọn đúng ngân hàng phát hành tài khoản hoặc thẻ của bạn.",
    actions: ["Chọn ngân hàng.", "Nhập mã khách hàng theo hướng dẫn trên màn hình.", "Tiếp tục để nhận mã xác thực."],
  },
  otp: {
    title: "Bạn đang ở bước xác thực OTP",
    summary: "Mã OTP chỉ dùng một lần và không được chia sẻ.",
    actions: ["Đối chiếu số tiền và tên đơn vị nhận.", "Nhập OTP trong thời hạn hiển thị.", "Không gửi OTP cho HOSTORA hoặc bất kỳ ai."],
  },
  payment_result: {
    title: "Bạn đang ở màn hình kết quả thanh toán",
    summary: "Trạng thái cuối cùng phải được đối chiếu với hóa đơn trên HOSTORA.",
    actions: ["Quay lại trang Đơn hàng.", "Tải lại trạng thái hóa đơn.", "Nếu cổng đã trừ tiền nhưng đơn chưa đổi trạng thái, giữ mã giao dịch và liên hệ HOSTORA."],
  },
  refund_request: {
    title: "Bạn đang ở bước yêu cầu hoàn tiền",
    summary: "Cần nêu rõ lý do để bộ phận vận hành kiểm tra.",
    actions: ["Nhập lý do hoàn tiền cụ thể.", "Gửi yêu cầu và theo dõi email xác nhận.", "Chờ trạng thái cổng thanh toán được đối soát trước khi gửi lại."],
  },
  website_studio: {
    title: "Bạn đang trong Xưởng tạo website",
    summary: "Hoàn thiện mô tả doanh nghiệp để tạo bản xem trước phù hợp hơn.",
    actions: ["Nhập ngành nghề và sản phẩm chính.", "Chọn phong cách, màu sắc và mức chuyển động.", "Tạo bản xem trước rồi gửi liên kết cho AI tư vấn hosting."],
  },
  hosting_advice: {
    title: "Bạn đang ở bước tư vấn hosting",
    summary: "AI cần nhu cầu thật của website để so sánh đúng gói.",
    actions: ["Cho biết loại website.", "Ước tính lượt truy cập và ngân sách tháng.", "Gửi liên kết website đã tạo nếu bạn đã có bản xem trước."],
  },
};

export function nextJourneyGuidance(result: JourneyResult): JourneyGuidance {
  if (result.step === "unknown" || result.confidence < 0.55) {
    return {
      title: "Chưa xác định được màn hình",
      summary: result.blockedReason ?? "Ảnh chưa có đủ dấu hiệu để hướng dẫn an toàn.",
      actions: ["Hãy chụp lại toàn bộ màn hình, đủ sáng và không bị mờ.", "Che số thẻ, CVC, OTP, email và số điện thoại trước khi gửi."],
    };
  }
  return guidance[result.step];
}
