import type { HostingPlan } from "@/lib/types";
import { hostingCatalog } from "@/data/hosting-catalog";
import { productCatalog, type ProductOffering } from "@/data/product-catalog";

export type CatalogPriceSnapshot = {
  baseAmountVnd: number;
  monthlyVnd: number | null;
  billingMonths: number | null;
  verifiedAt: string;
  note?: string;
};

function priceSnapshotForPlan(plan: HostingPlan): CatalogPriceSnapshot {
  return {
    baseAmountVnd: plan.promoMonthlyVnd * plan.billingMonths,
    monthlyVnd: plan.promoMonthlyVnd,
    billingMonths: plan.billingMonths,
    verifiedAt: plan.verifiedAt,
    note: `Giá ưu đãi ${plan.billingMonths} tháng; kiểm tra điều kiện gia hạn tại nguồn.`,
  };
}

export function priceSnapshotForOffering(product: ProductOffering): CatalogPriceSnapshot | null {
  if (product.priceFromVnd === null) return null;
  const exactPlan = hostingCatalog.find(
    (plan) =>
      plan.provider.toLocaleLowerCase("vi") === product.provider.toLocaleLowerCase("vi") &&
      plan.promoMonthlyVnd === product.priceFromVnd,
  );
  if (exactPlan) return priceSnapshotForPlan(exactPlan);
  return {
    baseAmountVnd: product.priceFromVnd,
    monthlyVnd: product.billingUnit === "month" ? product.priceFromVnd : null,
    billingMonths:
      product.billingUnit === "month" ? 1 : product.billingUnit === "year" ? 12 : null,
    verifiedAt: product.verifiedAt,
    note: product.priceNote ?? `Giá theo đơn vị ${product.billingUnit}.`,
  };
}

export function priceSnapshotForProductId(productId: string): CatalogPriceSnapshot | null {
  const plan = hostingCatalog.find((item) => item.id === productId);
  if (plan) return priceSnapshotForPlan(plan);
  const product = productCatalog.find((item) => item.id === productId);
  return product ? priceSnapshotForOffering(product) : null;
}

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
