import type {
  CustomerOrderSummary,
  CustomerPurchaseRequestSummary,
} from "@/lib/customer/types";
import type { StoredStudioProject } from "@/lib/site-studio-store";
import { redactContactInfo } from "@/lib/privacy";
import type { ChatFacts } from "@/lib/chat-memory";

const fold = (value: string) =>
  value.toLocaleLowerCase("vi").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d");

export function asksAboutOwnPurchase(question: string) {
  const text = fold(question);
  return /(?:toi|minh|em|tui|cua toi|cua minh|da dang ky|da mua|dang dung|dang ky|don hang cua)/.test(text) &&
    /(?:goi|hosting|host|dich vu|don hang|mua gi|dang ky gi)/.test(text) &&
    /(?:da mua|da dang ky|dang dung|dang ky goi|goi cua|goi toi mua|goi minh mua|hosting cua|don hang cua|mua goi nao|mua hosting gi)/.test(text);
}

export function asksAboutOwnWebsite(question: string) {
  const text = fold(question);
  if (/(?:tu van|nen mua|chon goi|goi nao|goi y|hosting nao)/.test(text)) return false;
  return /(?:toi|minh|em|tui|cua toi|cua minh)/.test(text) &&
    /(?:(?:da tao|tao roi).{0,30}(?:web|website|trang web)|(?:web|website|trang web).{0,25}(?:da tao|tao roi)|(?:web|website|trang web) nao (?:toi|minh|em) (?:da )?tao)/.test(text);
}

export function asksAboutOwnProfile(question: string) {
  const text = fold(question);
  if (/(?:tu van|nen lam|uu tien|ke hoach|chien luoc|toi uu|goi y|buoc tiep)/.test(text))
    return false;
  const ownsQuestion = /(?:toi|minh|em|tui|cua toi|cua minh)/.test(text);
  return ownsQuestion && (
    /(?:da dien|da khai|da dang ky|thong tin|ho so|nhu cau)/.test(text) &&
      /(?:gi|nao|nhung|xem lai|nhac lai|da)/.test(text) ||
    /(?:dang kinh doanh gi|kinh doanh (?:mat hang|san pham|dich vu) gi|dang ban gi|doanh nghiep .{0,20} lam gi)/.test(text)
  );
}

export function asksForProfileBasedAdvice(question: string) {
  const text = fold(question).trim();
  const asksForAdvice =
    /(?:tu van|nen lam|uu tien|ke hoach|chien luoc|toi uu|goi y|buoc tiep)/.test(text);
  const explicitlyUsesProfile =
    /(?:da dien|da chon|ho so|thong tin|nhu cau)/.test(text) &&
    /(?:toi|minh|em|tui|cua toi|cua minh)/.test(text);
  const shortGenericAdvice =
    /^(?:hay\s+)?(?:tu van|goi y)(?:\s+giup)?(?:\s+cho)?(?:\s+(?:toi|minh|em|tui))?(?:\s+(?:di|voi))?\s*[.!?]*$/.test(text);
  const asksPersonalAdvice =
    /(?:tu van|goi y)(?:\s+giup)?(?:\s+cho)?\s+(?:toi|minh|em|tui)\b/.test(text);
  const namesSpecificTopic =
    /\b(?:hosting|host|goi|ten mien|domain|cdn|dns|backup|email|ssl|vps|cloud|seo|google|gia|chi phi)\b/.test(text);
  const genericPersonalAdvice = shortGenericAdvice ||
    (asksPersonalAdvice && !namesSpecificTopic);
  return asksForAdvice && (explicitlyUsesProfile || genericPersonalAdvice);
}

const safe = (value: string, max = 100) =>
  redactContactInfo(value).replace(/\s+/gu, " ").trim().slice(0, max);

const trafficCopy: Record<string, string> = {
  under_1k: "dưới 1.000 lượt/tháng",
  "1k_10k": "1.000–10.000 lượt/tháng",
  "10k_50k": "10.000–50.000 lượt/tháng",
  over_50k: "trên 50.000 lượt/tháng",
};

const budgetCopy: Record<string, string> = {
  under_500k: "dưới 500.000đ/tháng",
  "500k_1m": "500.000đ–1 triệu/tháng",
  "1m_3m": "1–3 triệu/tháng",
  over_3m: "trên 3 triệu/tháng",
};

const readableTraffic = (value: string) => trafficCopy[value] ?? safe(value, 80);
const readableBudget = (value: string) => budgetCopy[value] ?? safe(value, 80);

export function ownWebsiteAnswer(projects: StoredStudioProject[]) {
  if (!projects.length)
    return "Mình chưa thấy website nào được tạo trong Xưởng tạo trang web bằng tài khoản đang đăng nhập. Nếu bạn dùng tài khoản khác, hãy đăng nhập tài khoản đó để xem lại.";
  const lines = projects.slice(0, 5).map((project) =>
    `• ${safe(project.idea.brand, 60)} — ${safe(project.brief.headline, 90)}; mục tiêu ${project.idea.goal === "sell" ? "bán hàng" : project.idea.goal === "book" ? "đặt lịch" : project.idea.goal === "contact" ? "liên hệ" : "giới thiệu"}. Mở: /website-studio/p/${project.id}`,
  );
  return `Tài khoản bạn đang đăng nhập đã tạo ${projects.length} website gần đây:\n${lines.join("\n")}`;
}

export function ownProfileAnswer(requests: CustomerPurchaseRequestSummary[], projects: StoredStudioProject[], facts: ChatFacts) {
  const request = requests[0];
  const project = projects[0];
  if (!request && !project && facts.websiteType === null)
    return "Mình chưa thấy hồ sơ mua hàng hoặc website Studio gắn với tài khoản này. Nhu cầu chỉ điền trong wizard trên thiết bị có thể đang lưu cục bộ; hãy mở lại mục Chọn gói để xem.";
  const lines: string[] = [];
  if (request) {
    const profile = request.profile;
    lines.push(`Hồ sơ mua gần nhất: ${safe(request.provider)} ${safe(request.productName)} (${request.status === "new" ? "đang chờ xử lý" : request.status === "invoiced" ? "đã có hóa đơn" : request.status === "cancelled" ? "đã hủy" : "đã bị từ chối"}).`);
    for (const [label, value] of [
      ["Doanh nghiệp", profile.companyName], ["Ngành", profile.businessType],
      ["Website hiện tại", profile.currentWebsite], ["Sản phẩm chính", profile.mainOffer],
      ["Khu vực", profile.serviceArea], ["Mục tiêu website", profile.websiteGoal],
      ["Khách hàng mục tiêu", profile.targetCustomers], ["Mục tiêu SEO", profile.seoGoals],
      ["Lưu lượng dự kiến", readableTraffic(profile.estimatedTraffic)],
      ["Ngân sách dự kiến", readableBudget(profile.budgetRange)],
    ] as const)
      if (value) lines.push(`${label}: ${safe(value, 140)}.`);
  }
  if (project)
    lines.push(`Website Studio gần nhất: ${safe(project.idea.brand, 60)}, ${project.idea.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng và ngân sách ${project.idea.monthlyBudget.toLocaleString("vi-VN")}đ/tháng.`);
  if (facts.websiteType !== null)
    lines.push(`Nhu cầu tư vấn đã ghi nhận: website ${facts.websiteType === "store" ? "bán hàng" : facts.websiteType === "blog" ? "blog" : "giới thiệu"}; ${facts.monthlyVisits?.toLocaleString("vi-VN") ?? "chưa rõ"} lượt/tháng; ngân sách ${facts.monthlyBudget?.toLocaleString("vi-VN") ?? "chưa rõ"}đ/tháng; ${facts.needsDomain === null ? "chưa rõ nhu cầu tên miền" : facts.needsDomain ? "cần tên miền" : "đã có hoặc không cần tên miền"}.`);
  return lines.join("\n");
}

export function customerAdviceContext(
  orders: CustomerOrderSummary[],
  requests: CustomerPurchaseRequestSummary[],
  projects: StoredStudioProject[],
) {
  const profile = requests[0]?.profile;
  return {
    orders: orders.slice(0, 3).map((order) => ({
      service: (() => {
        const matchingRequest = requests.find((request) => request.invoiceId === order.id);
        return matchingRequest
          ? `${safe(matchingRequest.provider)} ${safe(matchingRequest.productName)}`
          : "Dịch vụ HOSTORA";
      })(),
      status: order.status,
    })),
    requests: requests.slice(0, 3).map((request) => ({
      service: `${safe(request.provider)} ${safe(request.productName)}`,
      status: request.status,
    })),
    website: projects.slice(0, 2).map((project) => ({
      business: project.idea.business,
      goal: project.idea.goal,
      audience: safe(project.idea.audience, 300),
      monthlyVisits: project.idea.monthlyVisits,
      monthlyBudget: project.idea.monthlyBudget,
      needsDomain: project.idea.needsDomain,
    })),
    ...(profile ? {
      profile: {
        businessType: safe(profile.businessType, 120),
        mainOffer: safe(profile.mainOffer, 500),
        serviceArea: safe(profile.serviceArea, 160),
        websiteStatus: profile.websiteStatus,
        websiteGoal: safe(profile.websiteGoal, 500),
        targetCustomers: safe(profile.targetCustomers, 500),
        seoGoals: safe(profile.seoGoals, 500),
        estimatedTraffic: profile.estimatedTraffic,
        budgetRange: profile.budgetRange,
      },
    } : {}),
  };
}

const requestStatus: Record<CustomerPurchaseRequestSummary["status"], string> = {
  new: "đã gửi yêu cầu, đang chờ xử lý và chưa phải gói đã mua",
  invoiced: "đã có hóa đơn nhưng cần xem trạng thái thanh toán trước khi coi là đã mua",
  declined: "yêu cầu đã bị từ chối",
  cancelled: "yêu cầu đã hủy",
};

const orderStatus: Record<CustomerOrderSummary["status"], string> = {
  pending: "chờ thanh toán",
  cancel_requested: "đã yêu cầu hủy",
  paid: "đã thanh toán",
  refund_requested: "đã yêu cầu hoàn tiền",
  refund_pending: "đang hoàn tiền",
  refunded: "đã hoàn tiền",
  cancelled: "đã hủy",
};

const websiteTypeCopy: Record<NonNullable<ChatFacts["websiteType"]>, string> = {
  store: "website bán hàng",
  company: "website giới thiệu doanh nghiệp",
  blog: "website nội dung / blog",
};

export function profileBasedAdviceAnswer(
  orders: CustomerOrderSummary[],
  requests: CustomerPurchaseRequestSummary[],
  projects: StoredStudioProject[],
  facts: ChatFacts,
) {
  const request = requests[0];
  const profile = request?.profile;
  const project = projects[0];
  const linkedOrder = request?.invoiceId
    ? orders.find((order) => order.id === request.invoiceId)
    : undefined;
  const latestPaidOrder = orders.find((order) => order.status === "paid");
  if (!profile && !project && facts.websiteType === null && !latestPaidOrder)
    return "Mình chưa thấy hồ sơ hoặc website nào gắn với tài khoản này để cá nhân hóa. Nếu bạn vừa hoàn thành phần Chọn gói trên thiết bị khác, hãy đăng nhập đúng tài khoản hoặc gửi yêu cầu mua để đồng bộ hồ sơ.";

  const known: string[] = [];
  if (profile?.businessType) known.push(`ngành ${safe(profile.businessType, 120)}`);
  if (profile?.mainOffer) known.push(`trọng tâm ${safe(profile.mainOffer, 180)}`);
  if (profile?.targetCustomers) known.push(`phục vụ ${safe(profile.targetCustomers, 180)}`);
  if (profile?.serviceArea) known.push(`tại ${safe(profile.serviceArea, 100)}`);
  if (project?.idea.audience && !profile?.targetCustomers)
    known.push(`phục vụ ${safe(project.idea.audience, 180)}`);
  if (known.length === 0 && facts.websiteType)
    known.push(websiteTypeCopy[facts.websiteType]);

  const websiteGoal = safe(profile?.websiteGoal ?? "", 220);
  const seoGoals = safe(profile?.seoGoals ?? "", 180);
  const mainOffer = safe(profile?.mainOffer ?? project?.idea.idea ?? "sản phẩm hoặc dịch vụ chính", 180);
  const targetCustomers = safe(profile?.targetCustomers ?? project?.idea.audience ?? "nhóm khách hàng mục tiêu", 180);
  const serviceArea = safe(profile?.serviceArea ?? "", 100);
  const traffic = facts.monthlyVisits
    ? `${facts.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng`
    : profile?.estimatedTraffic
      ? readableTraffic(profile.estimatedTraffic)
      : "chưa có con số cụ thể";
  const budget = facts.monthlyBudget
    ? `${facts.monthlyBudget.toLocaleString("vi-VN")}đ/tháng`
    : profile?.budgetRange
      ? readableBudget(profile.budgetRange)
      : "chưa có con số cụ thể";
  const selected = request
    ? linkedOrder
      ? `Bạn đã chọn ${safe(request.provider)} ${safe(request.productName)}; đơn hàng hiện ${orderStatus[linkedOrder.status]}.`
      : `Bạn đã chọn ${safe(request.provider)} ${safe(request.productName)}; trạng thái hiện tại là ${requestStatus[request.status]}.`
    : latestPaidOrder
      ? `Tài khoản có ${safe(latestPaidOrder.title, 140)} và đơn hàng này ${orderStatus[latestPaidOrder.status]}.`
      : "Mình chưa thấy yêu cầu mua gắn với hồ sơ này, nên chưa coi bất kỳ gói nào là đã mua.";

  return [
    `Dựa trên hồ sơ hiện tại của bạn, mình thấy ${known.join(", ") || "bạn đang chuẩn bị một website mới"}${websiteGoal ? `; mục tiêu website là ${websiteGoal}` : ""}.`,
    `1. Ưu tiên luồng tạo khách: đưa ${mainOffer} lên phần đầu trang, sau đó dẫn thẳng ${targetCustomers} đến một hành động chính như đặt mua, đặt lịch hoặc liên hệ phù hợp với mục tiêu đã khai. Đừng chia sự chú ý vào quá nhiều nút ngang nhau.`,
    `2. Ưu tiên nội dung dễ được tìm thấy: làm một trang hoặc cụm nội dung riêng cho ${mainOffer}${serviceArea ? ` tại ${serviceArea}` : ""}${seoGoals ? `, bám sát mục tiêu SEO “${seoGoals}”` : ""}. Nội dung cần trả lời vấn đề của khách, quy trình, phạm vi phục vụ và cách liên hệ trước khi viết nhiều bài rời rạc.`,
    `3. Ưu tiên hạ tầng và ra mắt: hồ sơ đang ở mức lưu lượng ${traffic}, ngân sách ${budget}. ${selected} Trước khi chốt, hãy đối chiếu giá kỳ đầu, giá gia hạn và thử trọn luồng liên hệ/đặt hàng ở giờ cao điểm; yêu cầu mua chưa có nghĩa là dịch vụ đã hoạt động.`,
    "Việc nên làm ngay là hoàn thiện trang chính và một hành động chuyển đổi duy nhất, rồi mới mở rộng SEO và nâng hạ tầng theo số liệu truy cập thật.",
  ].join("\n\n");
}

export function ownPurchaseAnswer(
  orders: CustomerOrderSummary[],
  requests: CustomerPurchaseRequestSummary[],
) {
  const paid = orders.filter((order) => order.status === "paid");
  const otherOrders = orders.filter((order) => order.status !== "paid");
  const outstandingRequests = requests.filter(
    (request) => !request.invoiceId && request.status !== "cancelled",
  );
  if (!paid.length && !otherOrders.length && !outstandingRequests.length)
    return "Mình chưa thấy gói hosting hay yêu cầu mua nào gắn với tài khoản bạn đang đăng nhập. Yêu cầu tư vấn chỉ lưu trên thiết bị chưa phải gói đã mua. Nếu bạn dùng email khác khi gửi hồ sơ, hãy đăng nhập đúng tài khoản hoặc mở mục Đơn hàng để kiểm tra.";

  const lines = [
    ...paid.slice(0, 3).map((order) => `• ${order.title}: đã thanh toán.`),
    ...otherOrders.slice(0, 3).map((order) =>
      `• ${order.title}: ${orderStatus[order.status]}.`,
    ),
    ...outstandingRequests.slice(0, 3).map((request) =>
      `• ${request.provider} ${request.productName}: ${request.status === "new" ? "đã gửi yêu cầu mua, chưa có hóa đơn hoặc xác nhận thanh toán" : "yêu cầu đã bị từ chối"}.`,
    ),
  ];
  return `Theo tài khoản bạn đang đăng nhập, mình thấy:\n${lines.join("\n")}\n\nYêu cầu mua chưa có nghĩa là đã mua xong. Bạn mở mục Đơn hàng để xem chi tiết và trạng thái mới nhất.`;
}
