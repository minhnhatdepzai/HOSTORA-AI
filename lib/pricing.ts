import type { HostingPlan } from "@/lib/types";

export function calculateCost(
  plan: HostingPlan,
  months: 12 | 24 | 36 | 48,
  domainAnnual = 0,
  addonsMonthly = 0,
) {
  const promoMonths = Math.min(months, plan.billingMonths);
  const renewalMonths = Math.max(0, months - promoMonths);
  const reason =
    months < plan.billingMonths
      ? `Giá ưu đãi công bố cho kỳ ${plan.billingMonths} tháng; chưa có giá chắc chắn cho kỳ ${months} tháng.`
      : renewalMonths > 0 && plan.renewalMonthlyVnd === null
        ? "Chưa có giá gia hạn đã xác minh cho kỳ này."
        : null;
  const hosting =
    reason === null
      ? promoMonths * plan.promoMonthlyVnd +
        renewalMonths * (plan.renewalMonthlyVnd ?? 0)
      : null;
  const domainYears = Math.ceil(months / 12);
  const domain =
    Math.max(0, domainYears - (plan.domainIncluded ? 1 : 0)) *
    Math.max(0, domainAnnual);
  const addons = Math.max(0, addonsMonthly) * months;
  const total = hosting === null ? null : hosting + domain + addons;
  return {
    months,
    hosting,
    domain,
    addons,
    total,
    effectiveMonthly: total === null ? null : Math.round(total / months),
    reason,
  };
}
