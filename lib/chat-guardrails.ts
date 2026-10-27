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

export function customerJourneyAnswer(question: string) {
  const folded = question
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (
    /(tru tien|da thanh toan|da tra tien)/i.test(folded) &&
    /(cho thanh toan|chua cap nhat|chua doi|chua thanh cong)/i.test(folded)
  )
    return {
      answer:
        "Bạn **không thanh toán lại**. Hãy mở mục **Đơn hàng**, tải lại trạng thái và giữ mã giao dịch của ngân hàng/cổng thanh toán. Nếu đơn vẫn là “Chờ thanh toán”, gửi mã đơn cùng mã giao dịch cho HOSTORA để quản trị viên bấm đối soát trực tiếp với Stripe hoặc VNPay; không gửi số thẻ, CVC hay OTP.",
      sources: [],
    };
  if (
    /(hoan tien|hoan lai tien)/i.test(folded) &&
    /(bao lau|khi nao|may ngay|may gio)/i.test(folded)
  )
    return {
      answer:
        "Mình không thể hứa chính xác thời điểm tiền về khi cổng thanh toán chưa xác nhận. Bạn mở **Đơn hàng** để xem trạng thái: “Cần duyệt hoàn” nghĩa là HOSTORA đang kiểm tra, “Đang hoàn tiền” nghĩa là yêu cầu đã gửi tới cổng, còn “Đã hoàn tiền” chỉ xuất hiện sau khi có xác nhận đối soát. Hãy giữ mã đơn và mã giao dịch; không gửi lại yêu cầu nhiều lần.",
      sources: [],
    };
  if (
    /(khong nhan duoc|chua thay|khong thay)/i.test(folded) &&
    /(email|mail|thu xac nhan|hoa don)/i.test(folded)
  )
    return {
      answer:
        "Hãy kiểm tra **Thư rác/Spam** và tìm theo từ khóa HOSTORA hoặc mã đơn. Nếu vẫn chưa có, kiểm tra email đã nhập trong hồ sơ mua; quản trị viên có thể xem đơn trên cùng backend và gửi lại thông tin tra cứu. Không tạo thêm đơn chỉ vì email đến chậm.",
      sources: [],
    };
  if (
    /(man hinh nay|dang o buoc nao|lam gi tiep|bam gi|khong biet.*tiep theo)/i.test(
      folded,
    )
  )
    return {
      answer:
        "Bạn có thể gửi ảnh màn hình bằng nút hình ảnh cạnh ô chat. Trước khi gửi, hãy che số thẻ, CVC, OTP, email, số điện thoại và mã truy cập. HOSTORA sẽ đọc ảnh trên hệ thống cục bộ, xác định bạn đang ở bước nào và hướng dẫn thao tác tiếp theo; ảnh không được lưu vào lịch sử trò chuyện.",
      sources: [],
      nextAction: "upload-screen" as const,
    };
  return null;
}

export function websiteIdeaDiscoveryAnswer(question: string) {
  const normalized = question.toLocaleLowerCase("vi");
  const folded = normalized.normalize("NFD").replace(/\p{M}/gu, "");
  const hasNoWebsite =
    /(?:chua|khong)\s+(?:co|lam|tao)\s+(?:website|trang web|web)\b/i.test(folded) ||
    /(?:website|trang web|web)\s+(?:thi\s+)?(?:chua|khong)\s+co\b/i.test(folded);
  if (
    !hasNoWebsite &&
    !/(chua biet|khong biet|nen lam|tao).{0,30}(website|trang web|web).{0,20}(gi|nao|the nao|de ban)|website.{0,20}(gi|nao).{0,20}(phu hop|nen lam)/i.test(
      folded,
    )
  )
    return null;
  return {
    answer:
      "Bạn chưa cần chọn hosting ngay. Hãy [Mở Xưởng tạo website](/website-studio), cho HOSTORA biết bạn bán gì, khách chính là ai, muốn khách mua hàng, đặt lịch hay liên hệ, rồi chọn phong cách và màu sắc. Sau khi có bản xem trước, hãy gửi lại liên kết website trong cuộc trò chuyện này; mình sẽ dựa trên mục tiêu, chức năng, lượng khách dự kiến và ngân sách đã chọn để tư vấn gói hosting phù hợp, không ép chọn gói đắt nhất.",
    sources: [],
  };
}

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
      "Tôi không thể xác nhận tên miền còn trống hay giá đăng ký hôm nay nếu chưa kiểm tra trực tiếp. HOSTORA sẽ xác minh tình trạng tên miền, giá và thời hạn trước khi tạo hóa đơn; dữ liệu trong ứng dụng luôn có ngày kiểm tra rõ ràng. [K1] [K2]",
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
        "Chưa có dữ liệu phù hợp để xác minh. Đừng xem robots.txt là biện pháp bảo vệ dữ liệu riêng tư; hãy kiểm tra quyền truy cập thực tế của trang.",
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
