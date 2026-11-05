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
  const primary = items.find((item) => item.eligibility === "eligible");
  const lead = primary ?? items[0];
  const alternative = items.find((item) => item.plan.id !== lead?.plan.id);
  const ids = new Set([
    ...(lead ? [`${lead.plan.id}:cost`, ...(lead.plan.cdn === true ? [] : [`${lead.plan.id}:cdn`])] : []),
    ...(alternative ? [`${alternative.plan.id}:cost`] : []),
  ]);
  const extra = selectedFactIds.find((id) =>
    lead && id === `${lead.plan.id}:backup` && facts.some((fact) => fact.id === id),
  );
  if (extra && !(requirements.websiteType === "store" && primary?.plan.cdn === true && alternative?.plan.cdn !== true)) ids.add(extra);
  const upfront = lead?.upfrontVnd.toLocaleString("vi-VN") ?? "";
  const storeDifference = primary && alternative && requirements.websiteType === "store" &&
    primary.plan.cdn === true && alternative.plan.cdn !== true
      ? ` Gói này có CDN đã công bố cho ảnh và sao lưu ${primary.plan.backup === "daily" ? "hằng ngày" : "theo điều kiện gói"}; ${alternative.plan.provider} ${alternative.plan.name} rẻ hơn nhưng ${alternative.plan.cdn === null ? "CDN chưa được xác minh" : "không có CDN"}.`
      : "";
  return {
    summary: primary
      ? `Với ${requirements.websiteType === "store" ? "cửa hàng" : requirements.websiteType === "blog" ? "blog" : "trang giới thiệu"} của bạn, mình nghiêng về ${primary.plan.provider} ${primary.plan.name}: giá kỳ đầu và gia hạn đã công bố nằm trong ngân sách hosting.${storeDifference} ${requirements.upfrontBudget === undefined || requirements.upfrontBudget === null ? "Bạn chưa cho biết có thể trả trước bao nhiêu, nên chưa thể chốt tổng tiền cần thanh toán." : "Đây là lựa chọn để đối chiếu thêm trước khi mua."}`
      : decision.message,
    tradeoffs: facts.filter((fact) => ids.has(fact.id)).map((fact) => fact.text),
    nextStep: decision.status === "no-match"
      ? "Sửa ngân sách hoặc trao đổi với tư vấn viên trước khi chọn gói. Không thanh toán gói vượt khả năng chi trả."
      : `${requirements.upfrontBudget === undefined || requirements.upfrontBudget === null ? `Bạn có thể trả trước ${upfront}đ cho kỳ đầu không? ` : ""}Kiểm tra thuế và điều kiện gia hạn trước khi mua. Nếu sắp chạy chiến dịch, hãy thử luồng đặt hàng và thanh toán với lượng khách dự kiến.`,
    grounded: true,
  };
}
