import { hostingCatalog } from "@/data/hosting-catalog";
import type { StoredStudioProject } from "@/lib/site-studio-store";
import type { ChatFacts, ChatMemoryMessage } from "@/lib/chat-memory";
import type { CustomerPurchaseRequestSummary } from "@/lib/customer/types";
import type { CustomerOrderSummary } from "@/lib/customer/types";
import type { PurchaseProfile } from "@/lib/payments/types";
import { recommendPlans } from "@/lib/recommendation";
import type { HostingPlan } from "@/lib/types";

export type ChatCheckoutQuote = {
  planId: string;
  provider: string;
  planName: string;
  title: string;
  amountVnd: number;
  monthlyVnd: number;
  billingMonths: number;
  renewalMonthlyVnd: number | null;
  verifiedAt: string;
};

const folded = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");

export function isPurchaseConfirmation(value: string) {
  const text = folded(value).trim();
  return /(?:^|\b)(?:toi|minh|em|tui)?\s*(?:chot|dong y mua|mua luon|dat mua|tao hoa don|thanh toan luon|lay goi (?:nay|do))\b/.test(
    text,
  );
}

export function asksForSelectedPlanAdvice(value: string) {
  const text = folded(value);
  const asksForAdvice =
    /(?:tu van|phan tich|uu nhuoc|diem manh|diem yeu|co phu hop|cach dung)/.test(
      text,
    );
  if (!asksForAdvice) return false;
  return hostingCatalog.some((plan) =>
    text.includes(folded(`${plan.provider} ${plan.name}`)),
  );
}

function completeFacts(facts: ChatFacts) {
  if (
    facts.websiteType === null ||
    facts.monthlyVisits === null ||
    facts.monthlyBudget === null ||
    facts.needsDomain === null
  )
    return null;
  return {
    websiteType: facts.websiteType,
    ecommerce: facts.ecommerce ?? facts.websiteType === "store",
    monthlyVisits: facts.monthlyVisits,
    monthlyBudget: facts.monthlyBudget,
    needsDomain: facts.needsDomain,
  };
}

function planMentionedIn(messages: ChatMemoryMessage[]) {
  const recent = [...messages].reverse();
  for (const message of recent) {
    const text = folded(message.content);
    const explicit = hostingCatalog.find((plan) => {
      const fullName = folded(`${plan.provider} ${plan.name}`);
      return text.includes(folded(plan.id)) || text.includes(fullName);
    });
    if (explicit) return explicit;
  }
  return null;
}

export function quoteForConversation(
  facts: ChatFacts,
  messages: ChatMemoryMessage[],
): ChatCheckoutQuote | null {
  const requirements = completeFacts(facts);
  if (!requirements) return null;
  const mentioned = planMentionedIn(messages);
  const recommended = recommendPlans(requirements);
  const plan =
    mentioned ??
    recommended.find((item) => item.eligibility === "eligible")?.plan ??
    null;
  if (!plan) return null;
  return quoteFromPlan(plan);
}

export function quoteFromPlan(plan: HostingPlan): ChatCheckoutQuote {
  return {
    planId: plan.id,
    provider: plan.provider,
    planName: plan.name,
    title: `${plan.provider} ${plan.name}`,
    amountVnd: plan.promoMonthlyVnd * plan.billingMonths,
    monthlyVnd: plan.promoMonthlyVnd,
    billingMonths: plan.billingMonths,
    renewalMonthlyVnd: plan.renewalMonthlyVnd,
    verifiedAt: plan.verifiedAt,
  };
}

export function checkoutQuoteByPlanId(planId: string) {
  const plan = hostingCatalog.find((item) => item.id === planId);
  return plan ? quoteFromPlan(plan) : null;
}

const orderStatusCopy: Record<CustomerOrderSummary["status"], string> = {
  pending: "đang chờ thanh toán",
  cancel_requested: "đã gửi yêu cầu hủy",
  paid: "đã thanh toán",
  refund_requested: "đã gửi yêu cầu hoàn tiền",
  refund_pending: "đang hoàn tiền",
  refunded: "đã hoàn tiền",
  cancelled: "đã hủy",
};

const websiteTypeCopy: Record<NonNullable<ChatFacts["websiteType"]>, string> = {
  store: "website bán hàng",
  company: "website giới thiệu doanh nghiệp",
  blog: "website nội dung / blog",
};

export function selectedPlanAdviceAnswer(input: {
  quote: ChatCheckoutQuote;
  facts: ChatFacts;
  orderStatus?: CustomerOrderSummary["status"] | null;
  businessFocus?: string;
}) {
  const plan = hostingCatalog.find((item) => item.id === input.quote.planId);
  if (!plan) return null;
  const facts = input.facts;
  const website = facts.websiteType
    ? websiteTypeCopy[facts.websiteType]
    : "website trong hồ sơ";
  const traffic = facts.monthlyVisits
    ? `${facts.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng`
    : "lưu lượng chưa chốt";
  const budget = facts.monthlyBudget
    ? `${facts.monthlyBudget.toLocaleString("vi-VN")}đ/tháng`
    : "ngân sách tháng chưa chốt";
  const monthlyFit =
    facts.monthlyBudget === null
      ? "Chưa thể kết luận theo ngân sách tháng vì hồ sơ chưa có con số này."
      : input.quote.monthlyVnd <= facts.monthlyBudget
        ? `Mức quy đổi ${input.quote.monthlyVnd.toLocaleString("vi-VN")}đ/tháng nằm trong ngân sách ${budget}.`
        : `Mức quy đổi ${input.quote.monthlyVnd.toLocaleString("vi-VN")}đ/tháng vượt ngân sách ${budget}.`;
  const upfrontFit =
    facts.upfrontBudget === null
      ? `Hồ sơ chưa khai mức có thể trả trước, trong khi kỳ đầu cần thanh toán ${input.quote.amountVnd.toLocaleString("vi-VN")}đ một lần.`
      : input.quote.amountVnd <= facts.upfrontBudget
        ? `Tổng kỳ đầu ${input.quote.amountVnd.toLocaleString("vi-VN")}đ nằm trong mức trả trước ${facts.upfrontBudget.toLocaleString("vi-VN")}đ đã khai.`
        : `Tổng kỳ đầu ${input.quote.amountVnd.toLocaleString("vi-VN")}đ vượt mức trả trước ${facts.upfrontBudget.toLocaleString("vi-VN")}đ đã khai.`;
  const renewal =
    input.quote.renewalMonthlyVnd === null
      ? "Giá gia hạn chưa được xác minh; cần kiểm tra lại trước kỳ tiếp theo."
      : `Giá gia hạn đang ghi nhận ${input.quote.renewalMonthlyVnd.toLocaleString("vi-VN")}đ/tháng, cao hơn giá kỳ đầu.`;
  const capabilities = [
    `${plan.storageGb} GB ${plan.storageType}`,
    plan.backup === "daily" || plan.backup === "daily-on-demand"
      ? "sao lưu hằng ngày"
      : plan.backup === "weekly"
        ? "sao lưu hằng tuần"
        : "chưa xác minh lịch sao lưu",
    plan.cdn ? "có CDN" : "CDN chưa được xác minh",
    plan.domainIncluded ? "có tên miền theo điều kiện gói" : "không kèm tên miền",
  ].join(", ");
  const status = input.orderStatus
    ? `Đơn gần nhất của đúng gói này ${orderStatusCopy[input.orderStatus]}.`
    : "Chưa có hóa đơn của đúng gói này trong tài khoản.";
  const nextStep =
    input.orderStatus === "paid"
      ? "Bạn không cần chốt lại. Bước tiếp theo là gắn tên miền, bật SSL/CDN, kiểm tra bản sao lưu và thử trọn luồng đặt hàng trên website trước khi quảng bá."
      : input.orderStatus === "pending"
        ? "Hãy mở Đơn hàng để hoàn tất hoặc kiểm tra lại thanh toán; không tạo hóa đơn mới nếu bạn chỉ muốn tiếp tục đơn hiện tại."
        : "Nếu chọn mua, hãy kiểm tra lại tổng tiền trên hóa đơn rồi dùng nút thanh toán; mỗi lần bấm chốt sẽ tạo một đơn riêng.";
  const focus = input.businessFocus?.trim()
    ? ` Trọng tâm kinh doanh đã lưu là ${input.businessFocus.trim().slice(0, 180)}.`
    : "";

  return {
    answer: `**${input.quote.title} có phù hợp không?**\n\nVới hồ sơ ${website}, ${traffic} và ${budget}, đây là phương án có thể dùng.${focus} ${monthlyFit} Tuy nhiên, ${upfrontFit.toLocaleLowerCase("vi")}\n\n**Điểm mạnh:** ${capabilities}. Những điểm này thuận lợi cho việc vận hành nhiều nội dung và khôi phục khi có sự cố. [P1]\n\n**Điểm cần cân nhắc:** ${renewal} ${plan.limitations.join("; ")}. “Không giới hạn” vẫn chịu chính sách sử dụng hợp lý và không phải cam kết chịu mọi mức tải; hãy thử tốc độ, giỏ hàng và thanh toán ở giờ cao điểm. [P1]\n\n**Trạng thái và bước tiếp theo:** ${status} ${nextStep}`,
    sources: [
      {
        citation: "P1",
        title: input.quote.title,
        sourceUrl: plan.sourceUrl,
        verifiedAt: plan.verifiedAt,
        kind: "plan",
      },
    ],
  };
}

const trafficFromFacts = (
  monthlyVisits: number | null,
): PurchaseProfile["estimatedTraffic"] =>
  monthlyVisits === null || monthlyVisits < 1_000
    ? "under_1k"
    : monthlyVisits < 10_000
      ? "1k_10k"
      : monthlyVisits < 50_000
        ? "10k_50k"
        : "over_50k";

const budgetFromFacts = (
  monthlyBudget: number | null,
): PurchaseProfile["budgetRange"] =>
  monthlyBudget === null || monthlyBudget < 500_000
    ? "under_500k"
    : monthlyBudget < 1_000_000
      ? "500k_1m"
      : monthlyBudget < 3_000_000
        ? "1m_3m"
        : "over_3m";

/** Build the commercial dossier from authenticated account data, never from LLM prose. */
export function purchaseProfileForChat(input: {
  customerName: string;
  facts: ChatFacts;
  requests: CustomerPurchaseRequestSummary[];
  projects: StoredStudioProject[];
}): PurchaseProfile {
  const previous = input.requests[0]?.profile;
  const project = input.projects[0];
  const websiteGoal =
    previous?.websiteGoal ||
    (project
      ? `${project.idea.goal === "sell" ? "Bán hàng" : project.idea.goal === "book" ? "Nhận đặt lịch" : project.idea.goal === "contact" ? "Nhận liên hệ" : "Giới thiệu thương hiệu"} qua website ${project.idea.brand}`
      : input.facts.websiteType === "store"
        ? "Tạo website bán hàng và nhận đơn"
        : input.facts.websiteType === "blog"
          ? "Tạo website nội dung và phát triển lượt truy cập"
          : "Tạo website giới thiệu doanh nghiệp");
  const targetCustomers =
    previous?.targetCustomers || project?.idea.audience || "Khách hàng mục tiêu của doanh nghiệp";
  return {
    customerName: input.customerName.trim().slice(0, 100) || "Khách hàng HOSTORA",
    phone: "",
    companyName: previous?.companyName?.slice(0, 160) || project?.idea.brand?.slice(0, 160) || "",
    businessType: previous?.businessType?.slice(0, 120) || project?.idea.business || "Kinh doanh trực tuyến",
    currentWebsite: previous?.currentWebsite?.slice(0, 253) || "",
    mainOffer: previous?.mainOffer?.slice(0, 500) || project?.idea.offerings?.slice(0, 500) || project?.idea.idea?.slice(0, 500) || "",
    serviceArea: previous?.serviceArea?.slice(0, 160) || "",
    seoGoals: previous?.seoGoals?.slice(0, 500) || "",
    websiteStatus: project ? "building" : previous?.websiteStatus === "live" || previous?.websiteStatus === "migrating" || previous?.websiteStatus === "building" ? previous.websiteStatus : "idea",
    websiteGoal: websiteGoal.slice(0, 500),
    targetCustomers: targetCustomers.slice(0, 500),
    estimatedTraffic: trafficFromFacts(input.facts.monthlyVisits),
    budgetRange: budgetFromFacts(input.facts.monthlyBudget),
  };
}

export function checkoutPrompt(quote: ChatCheckoutQuote) {
  const renewal =
    quote.renewalMonthlyVnd === null
      ? "giá gia hạn chưa được xác minh"
      : `giá gia hạn hiện ghi nhận ${quote.renewalMonthlyVnd.toLocaleString("vi-VN")}đ/tháng`;
  return `Mình đã giữ đúng phương án ${quote.title}: ${quote.monthlyVnd.toLocaleString("vi-VN")}đ/tháng, thanh toán ${(quote.amountVnd).toLocaleString("vi-VN")}đ cho kỳ đầu ${quote.billingMonths} tháng; ${renewal}. Đây là giá theo dữ liệu kiểm tra ngày ${quote.verifiedAt}; hóa đơn sẽ ghi rõ số tiền trước khi bạn mở cổng thanh toán.\n\nBấm **Chốt & mở thanh toán** bên dưới để tạo một đơn mới. Bạn có thể mua lại cùng gói hoặc chọn gói khác; mỗi lần chốt tạo một hóa đơn riêng và gửi về email tài khoản.`;
}
