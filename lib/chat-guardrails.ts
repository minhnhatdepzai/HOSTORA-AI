import knowledge from "@/data/knowledge.json";
import { hostingCatalog } from "@/data/hosting-catalog";
import { calculateCost } from "@/lib/pricing";

type KnowledgeSource = {
  id: string;
  citation: string;
  title: string;
  sourceUrl: string;
  verifiedAt: string;
};

function knowledgeSource(id: string, citation: string) {
  const doc = knowledge.find((item) => item.id === id);
  if (!doc) return null;
  return {
    citation,
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    verifiedAt: doc.verifiedAt,
    kind: "knowledge",
  };
}

export function domainAvailabilityAnswer(question: string) {
  if (
    !/[a-z0-9-]+(?:\.[a-z0-9-]+)+/i.test(question) ||
    !/(còn trống|đăng ký hôm nay|giá.*hôm nay|chắc chắn.*(?:còn|giá))/i.test(
      question,
    )
  )
    return null;
  const domain = knowledgeSource("domain-basics", "K1");
  const pricing = knowledgeSource("pricing-snapshot", "K2");
  if (!domain || !pricing) return null;
  return {
    answer:
      "Tôi không thể xác nhận tên miền còn trống hay giá đăng ký hôm nay nếu chưa kiểm tra trực tiếp. Hãy mở trang của nhà cung cấp tên miền để xác nhận. [K1] Giá và thời hạn thanh toán cũng cần kiểm tra lại trên trang mua hàng; dữ liệu trong ứng dụng luôn có ngày kiểm tra rõ ràng. [K2]",
    sources: [domain, pricing],
  };
}

export function structuredDataPenaltyAnswer(question: string) {
  if (
    !/(schema|json-ld|structured data)/i.test(question) ||
    !/(phạt|thứ hạng|bao nhiêu bậc|mất hạng)/i.test(question)
  )
    return null;
  const source = knowledgeSource("seo-structured-data", "K1");
  if (!source) return null;
  return {
    answer:
      "Không thể khẳng định Google sẽ phạt hay dự đoán số bậc tụt hạng từ dữ kiện này. Structured data phải khớp nội dung người dùng nhìn thấy; schema hợp lệ cũng không bảo đảm rich result. [K1] Hãy sửa giá/tình trạng chưa xác minh và kiểm tra trang bằng Rich Results Test trước khi kết luận.",
    sources: [source],
  };
}

export function dnsMigrationAnswer(question: string) {
  if (
    !/(chuyển|đổi)/i.test(question) ||
    !/(hosting|web)/i.test(question) ||
    !/(dns|domain cũ|tên miền cũ)/i.test(question)
  )
    return null;
  const source = knowledgeSource("domain-basics", "K1");
  if (!source) return null;
  return {
    answer:
      "Bạn thường có thể giữ tên miền cũ khi đổi hosting vì địa chỉ website và nơi lưu website là hai phần riêng nhau. [K1]\n" +
      "Các bước đề xuất: (1) sao lưu toàn bộ website; (2) cài và chạy thử ở gói mới; (3) lấy thông tin kết nối tên miền từ nhà cung cấp mới; (4) cập nhật trong tài khoản quản lý tên miền; (5) kiểm tra website, biểu tượng ổ khóa và email sau khi chuyển. Hãy lưu lại thiết lập cũ để có thể quay lại nếu cần. Thời gian hoàn tất phụ thuộc từng nhà cung cấp nên cần xác nhận trước.",
    sources: [source],
  };
}

export function unknownRenewalCostAnswer(question: string) {
  const normalized = question.toLocaleLowerCase("vi");
  if (
    !normalized.includes("gia hạn") ||
    !/(chưa|không có|giả định|bằng giá kỳ đầu)/i.test(normalized) ||
    !/(tổng chi phí|tính|2\s*năm|24\s*tháng)/i.test(normalized) ||
    !/(2\s*năm|24\s*tháng)/i.test(normalized)
  )
    return null;
  const provider = hostingCatalog.find((plan) =>
    normalized.includes(plan.provider.toLocaleLowerCase("vi")),
  )?.provider;
  if (!provider) return null;
  const plans = hostingCatalog.filter((plan) => plan.provider === provider);
  const plan =
    plans.find((item) =>
      normalized.includes(item.name.toLocaleLowerCase("vi")),
    ) ??
    (normalized.includes("rẻ nhất")
      ? [...plans].sort((a, b) => a.promoMonthlyVnd - b.promoMonthlyVnd)[0]
      : null);
  if (!plan || plan.renewalMonthlyVnd !== null) return null;
  const cost = calculateCost(plan, 24);
  if (cost.total !== null || plan.billingMonths >= 24) return null;
  const initial = plan.promoMonthlyVnd * plan.billingMonths;
  return {
    answer:
      "Không thể tính tổng chi phí hosting 24 tháng vì giá gia hạn của " +
      plan.provider +
      " " +
      plan.name +
      " chưa được xác minh. [P1] Theo snapshot ngày " +
      plan.verifiedAt +
      ", kỳ đầu " +
      plan.billingMonths +
      " tháng có giá quy đổi " +
      plan.promoMonthlyVnd.toLocaleString("vi-VN") +
      "đ/tháng, nên riêng tiền hosting kỳ đầu là " +
      initial.toLocaleString("vi-VN") +
      "đ. [P1] Phần còn lại chưa có giá; không được giả định bằng giá kỳ đầu. Thuế, tên miền và dịch vụ mua thêm cũng cần kiểm tra trên trang thanh toán.",
    sources: [
      {
        citation: "P1",
        title: plan.provider + " " + plan.name,
        sourceUrl: plan.sourceUrl,
        verifiedAt: plan.verifiedAt,
        kind: "plan",
      },
    ],
  };
}

export function robotsPrivacyAnswer(
  question: string,
  sources: KnowledgeSource[],
) {
  if (
    !/robots\.txt/i.test(question) ||
    !/(bí mật|riêng tư|bảo mật|dữ liệu.{0,20}an toàn)/i.test(question)
  )
    return null;
  const source = sources.find((item) => item.id === "seo-crawling-indexing");
  if (!source)
    return {
      answer:
        "Chưa có nguồn phù hợp để xác minh. Đừng xem robots.txt là biện pháp bảo vệ dữ liệu riêng tư; hãy kiểm tra quyền truy cập thực tế của trang.",
      sources: [],
    };
  return {
    answer:
      "Không. robots.txt chỉ kiểm soát URL crawler được phép request, không phải cơ chế bảo mật dữ liệu. [" +
      source.citation +
      "] Trang riêng tư cần xác thực và kiểm soát quyền truy cập; hãy thử mở URL khi chưa đăng nhập để kiểm tra.",
    sources: [
      {
        citation: source.citation,
        title: source.title,
        sourceUrl: source.sourceUrl,
        verifiedAt: source.verifiedAt,
        kind: "knowledge",
      },
    ],
  };
}
