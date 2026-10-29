import { formatVnd } from "./catalog";

type DisclosurePlan = {
  billingMonths: number;
  promo: number;
  upfrontVnd: number;
  renewal: number | null;
};

export function getRecommendationDisclosure(input: {
  hasEligiblePlan: boolean;
  upfrontBudgetProvided: boolean;
  plan: DisclosurePlan;
}): { summary: string; details: string[] } {
  const summary = input.hasEligiblePlan
    ? input.upfrontBudgetProvided
      ? "Có gói đáp ứng ngân sách đã nhập. HOSTORA sẽ xác nhận tổng tiền cuối trước khi tạo hóa đơn."
      : "Có gói đáp ứng ngân sách hosting theo tháng; bạn chưa nhập giới hạn trả trước. HOSTORA sẽ xác nhận tổng tiền cuối trước khi tạo hóa đơn."
    : "Chưa có gói đáp ứng ngân sách này. Các gói bên dưới chỉ để tham khảo; tổng tiền cuối được xác nhận trước khi tạo hóa đơn.";

  return {
    summary,
    details: [
      `Giá ưu đãi ${formatVnd(input.plan.promo)}/tháng áp dụng cho kỳ ${input.plan.billingMonths} tháng.`,
      `Tiền hosting trả trước ${formatVnd(input.plan.upfrontVnd)}, chưa gồm thuế và dịch vụ bổ sung.`,
      input.plan.renewal == null
        ? "Giá gia hạn: Chưa xác minh."
        : `Giá gia hạn đã công bố: ${formatVnd(input.plan.renewal)}/tháng.`,
    ],
  };
}
