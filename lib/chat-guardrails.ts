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

import type { ChatMemory } from "@/lib/chat-memory";

function parseBudgetAmount(raw: string, unit = "") {
  const normalized = raw.replace(/\s/g, "").replace(/[.,]/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  const foldedUnit = unit.toLocaleLowerCase("vi");
  return Math.round(value * (foldedUnit === "triệu" || foldedUnit === "trieu" ? 1_000_000 : ["k", "nghìn", "nghin", "ngàn", "ngan"].includes(foldedUnit) ? 1_000 : 1));
}

/** Confirm an explicit budget correction with the exact amount the server stored. */
export function budgetCorrectionAnswer(question: string, memory: ChatMemory) {
  if (!/(sửa|đổi|cập nhật|dùng|thay).{0,30}ngân sách/i.test(question)) return null;
  const match = question.match(/(?:ngân sách|budget)[^\d]{0,30}(\d[\d.,]*)\s*(triệu|trieu|k|nghìn|nghin|ngàn|ngan|đ|d|vnd)?/i);
  if (!match) return null;
  const parsed = parseBudgetAmount(match[1], match[2] ?? "");
  if (parsed === null || memory.facts.monthlyBudget !== parsed) return null;
  return `Mình đã cập nhật ngân sách thành ${parsed.toLocaleString("vi-VN")}đ/tháng và sẽ dùng mức này cho các tư vấn tiếp theo.`;
}

function foldedQuestion(question: string) {
  return question
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Keep short memory-recall questions deterministic. The model still handles
 * normal advice, but a request to repeat stored facts must not silently omit a
 * field such as the monthly budget.
 */
export function memoryRecallAnswer(question: string, memory: ChatMemory) {
  const folded = foldedQuestion(question);
  if (
    !/(nhac lai|nho lai|vua noi|thong tin.{0,30}\b(?:luc nay|truoc)\b|\bngan sach.{0,30}\b(?:vua noi|cu)\b)/i.test(
      folded,
    )
  )
    return null;
  const facts = memory.facts;
  const parts = [
    facts.websiteType
      ? `Loại website: ${facts.websiteType === "blog" ? "blog" : facts.websiteType === "store" ? "website bán hàng" : "website giới thiệu công ty"}.`
      : null,
    facts.monthlyVisits !== null
      ? `Lượt truy cập dự kiến: ${facts.monthlyVisits.toLocaleString("vi-VN")}/tháng.`
      : null,
    facts.monthlyBudget !== null
      ? `Ngân sách: ${facts.monthlyBudget.toLocaleString("vi-VN")}đ/tháng.`
      : null,
    facts.needsDomain === null
      ? null
      : `Tên miền: ${facts.needsDomain ? "cần mua" : "không cần mua thêm"}.`,
  ].filter((part): part is string => Boolean(part));
  if (!parts.length) return null;
  return `Theo thông tin bạn đã nói trước đó: ${parts.join(" ")} Nếu có điểm nào thay đổi, bạn chỉ cần nói số mới để HOSTORA cập nhật.`;
}

/**
 * Reject impossible marketing promises without treating a difficult, in-scope
 * request as a reason to hand the customer to an administrator. This answer is
 * deterministic because load capacity and search ranking must never be
 * invented by the model.
 */
export function unrealisticGuaranteeAnswer(question: string) {
  const folded = foldedQuestion(question);
  const asksExtremeConcurrency =
    /(?:1\s*(?:trieu|[.,]000[.,]000)|1000000).{0,36}(?:khach|nguoi|luot|request).{0,28}(?:cung luc|dong thoi|concurrent)/i.test(
      folded,
    );
  const asksNoSlowdown =
    /(?:khong|chac chan khong).{0,18}(?:cham|lag|sap|loi|downtime)|(?:cam ket|bao dam|100%).{0,24}(?:chiu tai|hieu nang|toc do)/i.test(
      folded,
    );
  const asksTopOne =
    /(?:seo|google|tim kiem).{0,28}(?:top|hang|thu hang)\s*(?:1|mot)\b|(?:top|hang)\s*(?:1|mot)\b.{0,28}(?:seo|google|tim kiem)/i.test(
      folded,
    );

  if (!asksTopOne && !asksExtremeConcurrency && !asksNoSlowdown) return null;

  const performance = knowledgeSource("performance-limits", "K1");
  const seo = knowledgeSource("seo-fundamentals", performance ? "K2" : "K1");
  const sources = [performance, seo].filter(
    (source): source is NonNullable<typeof source> => Boolean(source),
  );
  const performanceCitation = performance ? " [K1]" : "";
  const seoCitation = seo ? ` [${seo.citation}]` : "";
  const budgetMatch = question.match(
    /(?:ngân sách|budget)[^\d]{0,24}(\d[\d.,]*)\s*(triệu|trieu|k|nghìn|nghin|ngàn|ngan|đồng|dong|đ|d|vnd)?/i,
  );
  const budget = budgetMatch
    ? parseBudgetAmount(budgetMatch[1], budgetMatch[2] ?? "")
    : null;
  const parts = [
    asksNoSlowdown || asksExtremeConcurrency
      ? "Mình có thể giúp bạn chọn hướng phù hợp, nhưng chưa thể cam kết website không chậm khi đông khách."
      : "Mình có thể giúp bạn cải thiện khả năng được tìm thấy, nhưng không thể hứa vị trí số một trên Google.",
  ];

  if (asksExtremeConcurrency || asksNoSlowdown)
    parts.push(
      (asksExtremeConcurrency
        ? "Một triệu khách cùng lúc khác hoàn toàn một triệu lượt truy cập trong cả tháng. "
        : "Số người truy cập cùng lúc khác với lượt truy cập cả tháng. ") +
        "Thông số gói chưa chứng minh website của bạn sẽ chạy ổn trong giờ cao điểm; cần thử tải đúng luồng xem sản phẩm, đặt hàng và thanh toán, rồi theo dõi thời gian phản hồi và tỷ lệ lỗi." +
        performanceCitation,
    );
  if (asksTopOne)
    parts.push(
      "Tối ưu tìm kiếm có thể cải thiện khả năng Google hiểu và tìm thấy nội dung, nhưng không có cách nào bảo đảm tự động đứng hạng 1." +
        seoCitation,
    );
  if (budget !== null)
    parts.push(
      `Mình đã ghi nhận ngân sách ${budget.toLocaleString("vi-VN")}đ/tháng. Mức này giúp lọc gói, còn tiền trả trước và sức chịu tải phải kiểm tra riêng.`,
    );
  if (asksNoSlowdown || asksExtremeConcurrency)
    parts.push("Bước tiếp theo là ước lượng bao nhiêu khách chỉ xem và bao nhiêu khách thanh toán trong giờ cao điểm, rồi thử tải từ thấp lên cao. Bạn có số đơn dự kiến trong một giờ bán cao điểm không?");
  if (asksTopOne)
    parts.push("Với Google, hãy kiểm tra trang đã được lập chỉ mục, nội dung có giải quyết đúng điều khách tìm và tốc độ tải thực tế; theo dõi kết quả theo thời gian thay vì mua một gói chỉ vì lời hứa thứ hạng.");

  return { answer: parts.join("\n\n"), sources };
}

/** Keep slang, emoji and vague value requests inside the advisor flow. */
export function ambiguousHostingRequestAnswer(question: string) {
  const folded = foldedQuestion(question);
  const isWebsiteRequest =
    /\b(?:web|website|trang web|hosting|luu tru)\b/i.test(folded);
  const isVagueValueRequest =
    /re ma xin|xin ma re|kieu sao|sao ta|tot nhat.*re|re.*tot nhat/i.test(
      folded,
    );
  if (!isWebsiteRequest || !isVagueValueRequest) return null;

  const decision = knowledgeSource("hosting-decision", "K1");
  const performance = knowledgeSource(
    "performance-limits",
    decision ? "K2" : "K1",
  );
  const sources = [decision, performance].filter(
    (source): source is NonNullable<typeof source> => Boolean(source),
  );
  const decisionCitation = decision ? " [K1]" : "";
  const performanceCitation = performance
    ? ` [${performance.citation}]`
    : "";

  return {
    answer:
      "Có thể làm một website bán hàng gọn, dễ dùng và tiết kiệm, nhưng không có một gói “rẻ mà xịn” phù hợp cho mọi cửa hàng. Cần chọn theo nhu cầu thật, chi phí kỳ đầu lẫn gia hạn và giới hạn của gói." +
      decisionCitation +
      "\n\nĐể HOSTORA trả lời ngay bằng 1 lựa chọn chính và tối đa 2 phương án thay thế, bạn cho biết: (1) lượt truy cập dự kiến mỗi tháng; (2) ngân sách mỗi tháng; (3) đã có hay cần mua tên miền; (4) khách có thanh toán trực tiếp trên web không. Nếu sắp chạy quảng cáo hoặc flash sale, hãy nói thêm số người có thể vào cùng lúc vì lượt truy cập tháng chưa đủ để cam kết website không chậm." +
      performanceCitation,
    sources,
  };
}

/** Do not let a language model turn missing business metrics into an estimate. */
export function unknownBusinessDataAnswer(question: string, hasCustomerSource = false) {
  const folded = foldedQuestion(question);
  if (!/(doanh thu|doanh so|loi nhuan|so lieu kinh doanh)/i.test(folded)) return null;
  if (!/(chinh xac|bao nhieu|cu the|nam ngoai|thang nay|quy nay)/i.test(folded)) return null;
  return {
    answer:
      "Mình chưa có dữ liệu doanh thu chính xác cho thông tin này" +
      (hasCustomerSource ? " trong tài liệu bạn đã gửi [U*]." : ".") +
      " Bạn cần cung cấp báo cáo hoặc số liệu đã xác minh; HOSTORA không tự ước đoán doanh thu từ loại website, lượt truy cập hay ngân sách.",
    sources: [],
  };
}

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
      "Mình chưa tra được tên miền này còn trống hay giá hiện tại ngay trong cuộc chat. Bạn hãy nhập đúng tên miền trên trang đăng ký, rồi xem cả giá năm đầu, phí gia hạn và thời hạn trước khi thanh toán. [K1] [K2] Nếu bạn gửi các mức giá đã thấy, mình sẽ giúp so sánh tổng tiền cần trả.",
    sources: [domain, pricing],
  };
}

export function customerSourceBusinessAnswer(
  question: string,
  sources: Array<{ citation: string; content: string; title?: string }>,
) {
  if (
    !/(?:(?:tài liệu|nguồn)\s+riêng|tài liệu\s+(?:doanh nghiệp|công ty)\s+của tôi)/i.test(question) ||
    !/(bán gì|sản phẩm gì|giới thiệu sản phẩm gì|phục vụ nhóm khách|đối tượng khách)/i.test(question)
  )
    return null;
  const source = sources.find((item) => item.content.length > 20);
  if (!source) return null;
  const safeSentence = source.content
    .split(/(?<=[.!?])\s+/u)
    .filter((sentence) => !/(bỏ qua|tự điền|giả sử|prompt|quy tắc)/i.test(sentence))
    .slice(0, 2)
    .join(" ")
    .trim();
  if (!safeSentence) return null;
  return {
    answer: `Theo tài liệu riêng của bạn: ${safeSentence} [${source.citation}]`,
    sources: [{
      citation: source.citation,
      title: source.title ?? "Tài liệu bạn đã cung cấp",
      sourceUrl: null,
      verifiedAt: "Nguồn riêng của bạn",
      kind: "customer",
    }],
  };
}

export function cdnVsHostingAnswer(question: string) {
  if (!/\bCDN\b/i.test(question) || !/hosting/i.test(question) || !/(thay thế|thay the|thay cho)/i.test(question)) return null;
  const source = knowledgeSource("ssl-cdn-backup", "K1");
  return {
    answer:
      "CDN không thay thế hosting. Hosting lưu và chạy website; CDN phân phối bản sao nội dung tĩnh gần người truy cập để giảm thời gian chờ. Hai thành phần bổ trợ nhau, còn giá và khả năng phục vụ nhiều khách cùng lúc cần được kiểm tra theo cấu hình và tải thực tế." + (source ? " [K1]" : ""),
    sources: source ? [source] : [],
  };
}

export function cdnSlowCheckoutAnswer(question: string) {
  if (!/\bCDN\b/i.test(question) ||
      !/(chậm|lag|treo|quá tải|lỗi)/i.test(question) ||
      !/(đặt hàng|thanh toán|checkout|mua hàng|cùng lúc|đồng thời)/i.test(question))
    return null;
  const cdn = knowledgeSource("ssl-cdn-backup", "K1");
  const performance = knowledgeSource("performance-limits", "K2");
  return {
    answer:
      "CDN chủ yếu giúp tải ảnh và nội dung ít thay đổi; giỏ hàng và thanh toán vẫn cần website xử lý riêng, nên bật CDN rồi mà giờ đông khách vẫn chậm là điều có thể xảy ra. [K1] " +
      "Trước khi đổi gói, hãy thử lại đúng lúc nhiều khách đặt hàng: đo bước giỏ hàng, thanh toán và thời gian đọc, lưu dữ liệu; xem máy chủ có quá tải hay phát sinh lỗi không. [K2] " +
      "Nếu phần xử lý đơn hàng vẫn chậm sau khi đã tối ưu, lúc đó mới so sánh gói hosting theo số đo thật. Bạn thấy chậm nhất ở giỏ hàng hay khi bấm thanh toán?",
    sources: [cdn, performance].filter((source): source is NonNullable<typeof source> => Boolean(source)),
  };
}

export function botSaleAnswer(question: string) {
  const folded = foldedQuestion(question);
  if (!/(bot|spam|quet)/i.test(folded) ||
      !/(don hang|dat hang|mo ban|flash sale|checkout|thanh toan)/i.test(folded) ||
      !/(rot|cham|loi|qua tai|mat don|khong vao)/i.test(folded))
    return null;
  const cdn = knowledgeSource("ssl-cdn-backup", "K1");
  const performance = knowledgeSource("performance-limits", "K2");
  return {
    answer:
      "Nếu đơn rớt đúng lúc bot quét và khách thật cùng vào, nên kiểm tra luồng đặt hàng trước khi đổi gói. CDN giúp tải nội dung tĩnh và hỗ trợ hấp thụ một phần lưu lượng tấn công, nhưng riêng việc bật CDN chưa chứng minh được bot đã bị chặn hoặc thanh toán sẽ ổn. [K1] " +
      "Hãy đối chiếu thời điểm bot tăng với lỗi đặt hàng, thời gian xử lý thanh toán và mức tải máy chủ; sau đó thử lại bằng lượng khách thật dự kiến. [K2] Nếu đã hạn chế truy cập tự động mà đơn vẫn rớt khi máy chủ quá tải, lúc đó mới dùng số đo để chọn gói mạnh hơn. Bot tập trung ở trang xem sản phẩm hay bước thanh toán?",
    sources: [cdn, performance].filter((source): source is NonNullable<typeof source> => Boolean(source)),
  };
}

export function multiSiteHostingAnswer(question: string) {
  const folded = foldedQuestion(question);
  if (!/(dung chung|chung mot|gom chung|gop chung|nhieu website.*chung)/i.test(folded) ||
      !/(goi|hosting|may chu|server)/i.test(folded) ||
      !/(website|trang web|web|blog|shop)/i.test(folded))
    return null;
  const capacity = knowledgeSource("azdigi-pro-hosting", "K1");
  const basics = knowledgeSource("hosting-basics", "K2");
  const performance = knowledgeSource("performance-limits", "K3");
  const mailNote = /email|mail|hop thu|thu dien tu/i.test(folded)
    ? " Với email theo tên miền, hãy ghi lại nơi đang cung cấp hộp thư và cấu hình DNS trước khi chuyển."
    : "";
  return {
    answer:
      "Có thể dùng chung nếu gói cho phép nhiều website; không có quy tắc bắt buộc mỗi trang phải thuê một gói riêng. Bảng gói AZDIGI đã kiểm tra cho biết AZ Pro 1 cho một website, AZ Pro 2 cho hai và AZ Pro 3 cho ba; đây là giới hạn số trang công bố, chưa phải cam kết tốc độ. [K1] " +
      "Điểm cần cân nhắc là các trang cùng dùng dung lượng và sức xử lý của một gói vào giờ đông khách. [K2] Hãy kiểm tra dung lượng, bản sao lưu và quyền quản trị của từng khách trước khi gộp; website có video cần xác định video lưu ngay trên hosting hay nhúng từ nơi khác." + mailNote + " " +
      "Nếu một khách bán hàng hoặc học trực tuyến có giờ cao điểm, nên thử tải riêng luồng quan trọng của khách đó trước khi quyết định dùng chung. [K3] Bạn dự kiến hai website có bao nhiêu khách truy cập cùng lúc?",
    sources: [capacity, basics, performance].filter((source): source is NonNullable<typeof source> => Boolean(source)),
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
    !/(hosting|nhà cung cấp lưu trữ|máy chủ|server|dns|domain cũ|tên miền cũ)/i.test(question)
  )
    return null;
  const source = knowledgeSource("domain-basics", "K1");
  if (!source) return null;
  const mentionsMail = /email|mail|hộp thư|thư điện tử/i.test(question);
  const mentionsSeo = /seo|google|thứ hạng|thu hang/i.test(question);
  const mentionsOrders = /đơn hàng|don hang|woocommerce|dữ liệu bán hàng|du lieu ban hang/i.test(question);
  const seoSource = mentionsSeo ? knowledgeSource("seo-canonical", "K2") : null;
  const checks = [
    mentionsMail ? "chép lại thiết lập email và kiểm tra gửi, nhận thư sau khi đổi DNS" : null,
    mentionsOrders ? "đồng bộ đơn hàng phát sinh sát giờ chuyển và thử đặt một đơn kiểm tra" : null,
    mentionsSeo ? "giữ URL cũ nếu có thể; nếu đổi URL, kiểm tra chuyển hướng, canonical và sitemap khớp nhau" + (seoSource ? " [K2]" : "") : null,
  ].filter((item): item is string => Boolean(item));
  return {
    answer:
      "Bạn thường có thể giữ tên miền cũ khi đổi hosting vì tên miền và nơi lưu website là hai phần riêng nhau. [K1]\n\nĐể giảm rủi ro, hãy sao lưu và thử website trên gói mới trước, ghi lại thiết lập DNS hiện tại, rồi mới đổi kết nối tên miền. " +
      (checks.length ? `Với trường hợp của bạn, cần thêm: ${checks.join("; ")}. ` : "") +
      "Sau khi đổi, kiểm tra website, đăng nhập, biểu tượng ổ khóa và giữ cấu hình cũ để quay lại nếu cần. Bạn đang dùng email theo tên miền này hay email ở dịch vụ riêng?",
    sources: seoSource ? [source, seoSource] : [source],
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
