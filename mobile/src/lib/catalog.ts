export type WebsiteType = "store" | "company" | "blog";

export type Requirements = {
  websiteType: WebsiteType;
  monthlyVisits: number;
  monthlyBudget: number;
  needsDomain: boolean;
  ecommerce: boolean;
  notes?: string;
};

export type Plan = {
  id: string;
  name: string;
  provider: string;
  promo: number;
  renewal: number;
  storage: string;
  bandwidth: string;
  backup: string;
  cdn: string;
  domain: string;
  ecommerce: boolean;
};

export type RankedPlan = Plan & {
  score: number;
  reasons: string[];
  caution: string;
};

export const defaultRequirements: Requirements = {
  websiteType: "store",
  monthlyVisits: 5000,
  monthlyBudget: 300000,
  needsDomain: true,
  ecommerce: true,
  notes: "",
};

export const plans: Plan[] = [
  {
    id: "hostinger-premium",
    name: "Premium",
    provider: "Hostinger",
    promo: 38900,
    renewal: 125900,
    storage: "20 GB SSD",
    bandwidth: "Chưa xác minh",
    backup: "Hàng tuần",
    cdn: "Chưa có dữ liệu",
    domain: "Có theo điều kiện gói",
    ecommerce: true,
  },
  {
    id: "hostinger-unlimited",
    name: "Không giới hạn",
    provider: "Hostinger",
    promo: 55900,
    renewal: 181900,
    storage: "50 GB NVMe",
    bandwidth: "Không giới hạn (theo chính sách sử dụng hợp lý)",
    backup: "Hàng ngày",
    cdn: "Có",
    domain: "Có theo điều kiện gói",
    ecommerce: true,
  },
  {
    id: "hostinger-cloud-startup",
    name: "Cloud Startup",
    provider: "Hostinger",
    promo: 167900,
    renewal: 447900,
    storage: "100 GB NVMe",
    bandwidth: "Không giới hạn (theo chính sách sử dụng hợp lý)",
    backup: "Hàng ngày + theo yêu cầu",
    cdn: "Có",
    domain: "Có theo điều kiện gói",
    ecommerce: true,
  },
];

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function rankPlans(requirements: Requirements): RankedPlan[] {
  return plans
    .map((plan) => {
      let score = 54;
      const reasons: string[] = [];
      const inBudget = plan.renewal <= requirements.monthlyBudget;
      if (inBudget) {
        score += 20;
        reasons.push("Giá gia hạn nằm trong ngân sách đã chọn");
      } else {
        score -= Math.min(
          18,
          Math.round((plan.renewal / requirements.monthlyBudget) * 5),
        );
      }
      if (requirements.ecommerce && plan.ecommerce) {
        score += 13;
        reasons.push("Có nền tảng phù hợp website bán hàng");
      }
      if (
        requirements.monthlyVisits >= 30000 &&
        plan.id === "hostinger-cloud-startup"
      )
        score += 16;
      else if (
        requirements.monthlyVisits >= 10000 &&
        plan.id === "hostinger-unlimited"
      )
        score += 12;
      else if (
        requirements.monthlyVisits < 10000 &&
        plan.id === "hostinger-premium"
      )
        score += 10;
      if (requirements.needsDomain) {
        score += 5;
        reasons.push("Có tên miền miễn phí năm đầu theo nguồn công bố");
      }
      if (plan.backup.includes("Hàng ngày")) {
        score += 6;
        reasons.push("Backup hàng ngày giảm rủi ro vận hành");
      }
      return {
        ...plan,
        score: Math.max(1, Math.min(98, score)),
        reasons: reasons.slice(0, 3),
        caution: inBudget
          ? "Giá khuyến mại và giá gia hạn khác nhau; hãy xem tổng chi phí."
          : "Giá gia hạn có thể vượt ngân sách hiện tại.",
      };
    })
    .sort((a, b) => b.score - a.score);
}
