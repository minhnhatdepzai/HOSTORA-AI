export type CostPlan = {
  promo: number;
  renewal: number | null;
  billingMonths: number;
};

export function hostingCost(plan: CostPlan, months: 12 | 24 | 36 | 48) {
  // A rate advertised for a longer commitment cannot be assumed for a shorter checkout.
  if (months < plan.billingMonths) return null;
  const promoMonths = Math.min(months, plan.billingMonths);
  const renewalMonths = Math.max(0, months - promoMonths);
  if (renewalMonths > 0 && plan.renewal == null) return null;
  const initial = promoMonths * plan.promo;
  const renewal = renewalMonths * (plan.renewal ?? 0);
  return {
    initial,
    renewal,
    total: initial + renewal,
    promoMonths,
    renewalMonths,
  };
}
