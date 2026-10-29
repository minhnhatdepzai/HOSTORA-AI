import { hostingCatalog } from "@/data/hosting-catalog";
import type {
  HostingPlan,
  RecommendationScore,
  Requirements,
} from "@/lib/types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function scorePlan(
  plan: HostingPlan,
  requirements: Requirements,
): RecommendationScore {
  const renewal = plan.renewalMonthlyVnd;
  const renewalKnown = renewal !== null;
  const upfrontVnd = plan.promoMonthlyVnd * plan.billingMonths;
  const upfrontConfirmed = requirements.upfrontBudget !== undefined;
  const needsCommerce = requirements.ecommerce || requirements.websiteType === "store";
  const eligibility =
    needsCommerce && !plan.ecommerce ? "unsupported" :
    (renewal !== null && renewal > requirements.monthlyBudget) ||
    plan.promoMonthlyVnd > requirements.monthlyBudget ||
    (upfrontConfirmed && upfrontVnd > requirements.upfrontBudget!) ? "over-budget" :
    renewal === null ? "unverified" : "eligible";
  const budgetRatio =
    requirements.monthlyBudget / Math.max(renewal ?? plan.promoMonthlyVnd, 1);
  // Promo price is only evidence for the initial term, not long-term budget.
  const budget = clamp(
    (budgetRatio >= 1 ? 100 - 35 / budgetRatio : budgetRatio * 65) * (renewalKnown ? 1 : 0.65),
  );
  // Storage is not a throughput benchmark. Without a measured workload,
  // resource adequacy remains neutral for every plan.
  const resources = 50;
  const ecommerce = needsCommerce ? (plan.ecommerce ? 100 : 15) : 85;
  const ownership =
    renewal === null
      ? 25
      : renewal <= requirements.monthlyBudget
        ? 100
        : clamp(budget - 10);
  const scalability =
    requirements.monthlyVisits > 50000 && plan.hostingType === "cloud" ? 75 : 50;
  const resilience = clamp(
    (plan.ssl ? 25 : 0) +
      (plan.cdn ? 25 : 0) +
      (plan.backup === "weekly" ? 25 : plan.backup ? 45 : 0),
  );
  const usability = plan.managed ? 95 : 55;
  // Domain inclusion is a published feature, not a verified total domain cost.
  // A customer who already has a domain gets a neutral value here.
  const domain = requirements.needsDomain ? (plan.domainIncluded ? 100 : 0) : 50;
  const breakdown = {
    budget,
    resources,
    ecommerce,
    ownership,
    scalability,
    resilience,
    usability,
    domain,
  };
  // These are transparent selection heuristics, not a measured performance or
  // user-satisfaction score. A company site values confirmed protection and
  // backup more; a blog values the known hosting cost more.
  const weights = requirements.websiteType === "company"
    ? { budget: 0.18, resources: 0.16, ecommerce: 0.10, ownership: 0.13, scalability: 0.09, resilience: 0.18, usability: 0.06, domain: 0.10 }
    : requirements.websiteType === "blog"
      ? { budget: 0.30, resources: 0.14, ecommerce: 0.10, ownership: 0.16, scalability: 0.08, resilience: 0.07, usability: 0.05, domain: 0.10 }
      : { budget: 0.23, resources: 0.14, ecommerce: 0.18, ownership: 0.12, scalability: 0.09, resilience: 0.10, usability: 0.04, domain: 0.10 };
  const total = Math.round(
    budget * weights.budget +
      resources * weights.resources +
      ecommerce * weights.ecommerce +
      ownership * weights.ownership +
      scalability * weights.scalability +
      resilience * weights.resilience +
      usability * weights.usability +
      domain * weights.domain,
  );
  const cautions = [...plan.limitations];
  cautions.push("Dung lượng lưu trữ không chứng minh sức chịu tải; cần chạy thử website thật.");
  if (requirements.needsDomain)
    cautions.push("Chưa tính giá gia hạn tên miền, thuế và dịch vụ mua thêm vào ngân sách hosting.");
  if (renewal === null)
    cautions.unshift(
      "Giá gia hạn chưa xác minh; chưa thể kết luận gói nằm trong ngân sách dài hạn",
    );
  else if (renewal > requirements.monthlyBudget)
    cautions.unshift("Giá gia hạn vượt ngân sách tháng đã nhập");
  if (requirements.monthlyVisits > 50000 && plan.hostingType === "shared")
    cautions.unshift(
      "Lượng khách cao cần được chạy thử trên website thật trước khi chốt",
    );
  if (requirements.needsDomain && !plan.domainIncluded)
    cautions.unshift("Chưa bao gồm tên miền trong gói này");
  if (requirements.needsDomain && plan.domainIncluded)
    cautions.push("Gói có tên miền theo điều kiện công bố; cần xác nhận loại miền, thời hạn và phí gia hạn trước khi mua.");
  if (!upfrontConfirmed)
    cautions.unshift("Cần xác nhận khả năng trả trước toàn bộ kỳ ưu đãi; giá theo tháng không phải trả từng tháng.");
  else if (upfrontVnd > requirements.upfrontBudget!)
    cautions.unshift("Tiền hosting trả trước vượt số tiền bạn có thể thanh toán ban đầu.");
  if (eligibility === "over-budget") cautions.unshift("Gói này vượt ngân sách đã nhập, chỉ để tham khảo.");
  if (eligibility === "unverified") cautions.unshift("Chưa đủ dữ liệu để xác nhận gói trong ngân sách dài hạn.");
  if (eligibility === "unsupported") cautions.unshift("Chưa xác nhận hỗ trợ nhu cầu bán hàng của bạn.");
  return {
    eligibility,
    upfrontVnd,
    upfrontConfirmed,
    plan,
    total,
    breakdown,
    reasons: [
      `Có ${plan.storageGb} GB dung lượng lưu trữ theo công bố`,
      requirements.needsDomain
        ? plan.domainIncluded
          ? "Có tên miền theo điều kiện gói; cần xác nhận phí gia hạn"
          : "Tên miền cần được báo giá riêng"
        : "Bạn đã có hoặc không cần mua thêm tên miền",
      requirements.websiteType === "company"
        ? `Trang doanh nghiệp: SSL ${plan.ssl === true ? "đã công bố" : "chưa xác minh"}, sao lưu ${plan.backup === "daily" || plan.backup === "daily-on-demand" ? "hằng ngày" : plan.backup === "weekly" ? "hằng tuần" : "chưa xác minh"}`
        : requirements.websiteType === "blog"
          ? "Blog: ưu tiên chi phí lưu trữ đã biết; cần xác nhận giá gia hạn"
          : "Cửa hàng: kiểm tra hỗ trợ bán hàng và thử tải website thực tế",
      plan.ecommerce
        ? "Có hỗ trợ thương mại điện tử theo nguồn chính thức"
        : "Phù hợp website nội dung cơ bản",
      plan.managed
        ? "Nhà cung cấp hỗ trợ vận hành, phù hợp người mới"
        : "Phù hợp khi đã có người có kinh nghiệm phụ trách",
    ],
    cautions,
  };
}

export function recommendPlans(
  requirements: Requirements,
): RecommendationScore[] {
  return hostingCatalog
    .map((plan) => scorePlan(plan, requirements))
    .sort((a, b) => {
      const eligible = Number(b.eligibility === "eligible") - Number(a.eligibility === "eligible");
      if (eligible) return eligible;
      if (a.eligibility !== "eligible") {
        const verified = Number(b.plan.renewalMonthlyVnd !== null) - Number(a.plan.renewalMonthlyVnd !== null);
        if (verified) return verified;
        return (a.plan.renewalMonthlyVnd ?? a.plan.promoMonthlyVnd) - (b.plan.renewalMonthlyVnd ?? b.plan.promoMonthlyVnd) || a.upfrontVnd - b.upfrontVnd;
      }
      return b.total - a.total || a.upfrontVnd - b.upfrontVnd;
    })
    .slice(0, 3);
}

export function recommendationDecision(items: RecommendationScore[]) {
  const eligibleCount = items.filter((item) => item.eligibility === "eligible").length;
  return {
    status: eligibleCount ? "matched" as const : "no-match" as const,
    eligibleCount,
    message: eligibleCount
      ? items.some((item) => item.eligibility === "eligible" && !item.upfrontConfirmed)
        ? "Có gói đáp ứng ngân sách lưu trữ theo tháng. Bạn chưa nhập giới hạn trả trước, nên chưa xác nhận tổng tiền cần thanh toán; hãy kiểm tra thêm thuế và tên miền."
        : "Có gói đáp ứng ngân sách lưu trữ và giới hạn trả trước đã nhập. Cần xác nhận thêm thuế và tên miền trước khi quyết định."
      : "Chưa có gói đáp ứng ngân sách và nhu cầu đã nhập. Các gói bên dưới chỉ để tham khảo; bạn có thể sửa ngân sách hoặc nhờ tư vấn thêm.",
  };
}
