import { useEffect, useState } from "react";
import { postJson } from "@/lib/api";
import { rankPlans, type Requirements } from "@/lib/catalog";

type BackendPlan = {
  plan: {
    id: string;
    provider: string;
    name: string;
    promoMonthlyVnd: number;
    renewalMonthlyVnd: number | null;
    billingMonths: number;
    storageGb: number;
    storageType: string;
    bandwidth: string | null;
    ssl: boolean | null;
    backup: "weekly" | "daily" | "daily-on-demand" | null;
    cdn: boolean | null;
    domainIncluded: boolean;
    ecommerce: boolean;
    sourceUrl: string;
    verifiedAt: string;
    limitations: string[];
  };
  total: number;
  reasons: string[];
  cautions: string[];
};

export type RecommendedPlan = {
  id: string;
  provider: string;
  name: string;
  promo: number;
  renewal: number | null;
  billingMonths: number;
  storage: string;
  bandwidth: string | null;
  ssl: boolean | null;
  backup: string;
  cdn: string;
  domain: string;
  ecommerce: boolean;
  score: number;
  reasons: string[];
  caution: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
};

function fallbackPlans(requirements: Requirements): RecommendedPlan[] {
  return rankPlans(requirements).map((plan) => ({
    ...plan,
    billingMonths: 48,
    ssl: true,
    sourceUrl: "https://www.hostinger.com/vn/web-hosting",
    verifiedAt: "2026-10-23",
    caution:
      "Dữ liệu được lưu ngày 23/10/2026 và có thể chưa phải giá hiện tại. Hãy kiểm tra trang chính thức trước khi mua.",
  }));
}

export function useRecommendedPlans(requirements: Requirements) {
  const key = JSON.stringify(requirements);
  const [result, setResult] = useState<{
    key: string;
    plans: RecommendedPlan[];
    status: "loading" | "verified" | "offline";
  }>(() => ({ key, plans: fallbackPlans(requirements), status: "loading" }));
  useEffect(() => {
    let active = true;
    postJson<{ recommendations: BackendPlan[] }>("/api/recommend", requirements)
      .then((response) => {
        if (!active) return;
        if (
          !Array.isArray(response.recommendations) ||
          response.recommendations.length !== 3
        ) {
          throw new Error("Chưa nhận đủ ba gói để so sánh.");
        }
        setResult({
          key,
          status: "verified",
          plans: response.recommendations.map(
            ({ plan, total, reasons, cautions }) => ({
              id: plan.id,
              provider: plan.provider,
              name: plan.name,
              promo: plan.promoMonthlyVnd,
              renewal: plan.renewalMonthlyVnd,
              billingMonths: plan.billingMonths,
              storage: `${plan.storageGb} GB ${plan.storageType}`,
              bandwidth: plan.bandwidth,
              ssl: plan.ssl,
              backup:
                plan.backup === "daily-on-demand"
                  ? "Hàng ngày + theo yêu cầu"
                  : plan.backup === "daily"
                    ? "Hàng ngày"
                    : plan.backup === "weekly"
                      ? "Hàng tuần"
                      : "Chưa xác minh",
              cdn:
                plan.cdn === true
                  ? "Có"
                  : plan.cdn === false
                    ? "Không"
                    : "Chưa xác minh",
              domain: plan.domainIncluded
                ? "Có theo điều kiện gói"
                : "Không gồm",
              ecommerce: plan.ecommerce,
              score: total,
              reasons,
              caution:
                cautions[0] ??
                "Kiểm tra điều khoản tại nguồn trước khi thanh toán.",
              sourceUrl: plan.sourceUrl,
              verifiedAt: plan.verifiedAt,
            }),
          ),
        });
      })
      .catch(() => {
        if (active) {
          setResult({
            key,
            plans: fallbackPlans(requirements),
            status: "offline",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [key, requirements]);
  return result.key === key
    ? { plans: result.plans, status: result.status }
    : { plans: fallbackPlans(requirements), status: "loading" as const };
}
