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
  const budgetRatio =
    requirements.monthlyBudget / Math.max(renewal ?? plan.promoMonthlyVnd, 1);
  // Promo price is only evidence for the initial term, not long-term budget.
  const budget = clamp(
    (budgetRatio >= 1 ? 100 : budgetRatio * 100) * (renewalKnown ? 1 : 0.65),
  );
  const visitTargetGb =
    requirements.monthlyVisits <= 5000
      ? 10
      : requirements.monthlyVisits <= 30000
        ? 20
        : requirements.monthlyVisits <= 100000
          ? 50
          : 100;
  const resources = clamp(
    (plan.storageGb / visitTargetGb) * 75 +
      (plan.hostingType === "cloud" ? 25 : 0),
  );
  const ecommerce = requirements.ecommerce ? (plan.ecommerce ? 100 : 15) : 85;
  const ownership =
    renewal === null
      ? 25
      : renewal <= requirements.monthlyBudget
        ? 100
        : clamp(budget - 10);
  const scalability =
    plan.hostingType === "cloud"
      ? 100
      : plan.storageGb >= 50
        ? 78
        : plan.storageGb >= 20
          ? 62
          : 42;
  const resilience = clamp(
    (plan.ssl ? 25 : 0) +
      (plan.cdn ? 25 : 0) +
      (plan.backup === "weekly" ? 25 : plan.backup ? 45 : 0),
  );
  const usability = plan.managed ? 95 : 55;
  const breakdown = {
    budget,
    resources,
    ecommerce,
    ownership,
    scalability,
    resilience,
    usability,
  };
  const total = Math.round(
    budget * 0.25 +
      resources * 0.18 +
      ecommerce * 0.16 +
      ownership * 0.14 +
      scalability * 0.11 +
      resilience * 0.1 +
      usability * 0.06,
  );
  const cautions = [...plan.limitations];
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
  return {
    plan,
    total,
    breakdown,
    reasons: [
      `Có ${plan.storageGb} GB dung lượng lưu trữ theo công bố`,
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
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
}
