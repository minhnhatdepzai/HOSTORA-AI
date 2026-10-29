import { recommendPlans, recommendationDecision } from "@/lib/recommendation";
import type { Requirements } from "@/lib/types";
import { formatVnd } from "@/lib/utils";

export const featureState = (value: boolean | null) => value === true ? "Có" : value === false ? "Không" : "Chưa xác minh";

/** AI can select verified fact IDs, never author prices or feature claims. */
export function recommendationFacts(requirements: Requirements) {
  const items = recommendPlans(requirements);
  const decision = recommendationDecision(items);
  const facts = items.flatMap(({ plan, eligibility, upfrontVnd }) => [
    { id: `${plan.id}:cost`, text: `${plan.provider} ${plan.name}: ${formatVnd(plan.promoMonthlyVnd)}/tháng trong kỳ ${plan.billingMonths} tháng, trả trước ${formatVnd(upfrontVnd)}; gia hạn ${plan.renewalMonthlyVnd === null ? "chưa xác minh" : `${formatVnd(plan.renewalMonthlyVnd)}/tháng`}. ${eligibility === "eligible" ? "Đáp ứng ngân sách hosting đã nhập." : "Chỉ tham khảo, chưa đáp ứng đủ điều kiện đã nhập."}` },
    { id: `${plan.id}:cdn`, text: `${plan.provider} ${plan.name} — CDN (phân phối nội dung): ${featureState(plan.cdn)}. Kết nối an toàn SSL: ${featureState(plan.ssl)}.` },
    { id: `${plan.id}:backup`, text: `${plan.provider} ${plan.name} — sao lưu: ${plan.backup === "daily" ? "hàng ngày" : plan.backup === "daily-on-demand" ? "hàng ngày và theo yêu cầu" : plan.backup === "weekly" ? "hàng tuần" : "chưa xác minh"}. Tên miền: ${plan.domainIncluded ? "có theo điều kiện gói, cần xác nhận phí gia hạn riêng" : "không bao gồm, cần báo giá riêng"}.` },
  ]);
  return { items, decision, facts };
}

export function renderRecommendationExplanation(requirements: Requirements, selectedFactIds: string[]) {
  const { items, decision, facts } = recommendationFacts(requirements);
  const mandatoryIds = items.map(({ plan }) => `${plan.id}:cost`);
  // Always include unknown feature states, regardless of model selection.
  const ids = new Set([...mandatoryIds, ...items.map(({ plan }) => `${plan.id}:cdn`), ...selectedFactIds]);
  return {
    summary: decision.message,
    tradeoffs: facts.filter((fact) => ids.has(fact.id)).map((fact) => fact.text),
    nextStep: decision.status === "no-match"
      ? "Sửa ngân sách hoặc trao đổi với tư vấn viên trước khi chọn gói. Không thanh toán gói vượt khả năng chi trả."
      : "Xác nhận tổng tiền trả trước, thuế, phí tên miền và điều kiện gia hạn. Chạy thử website thật trước chiến dịch; dung lượng GB không chứng minh sức chịu tải.",
    grounded: true,
  };
}
