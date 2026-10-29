import { describe, expect, it } from "vitest";
import { getRecommendationDisclosure } from "../mobile/src/lib/recommendation-disclosure";

describe("mobile recommendation cost disclosure", () => {
  it("keeps the known billing term, upfront amount and renewal price available", () => {
    const disclosure = getRecommendationDisclosure({
      hasEligiblePlan: true,
      upfrontBudgetProvided: true,
      plan: {
        billingMonths: 12,
        promo: 80_000,
        upfrontVnd: 960_000,
        renewal: 150_000,
      },
    });

    expect(disclosure.summary).toBe(
      "Có gói đáp ứng ngân sách đã nhập. HOSTORA sẽ xác nhận tổng tiền cuối trước khi tạo hóa đơn.",
    );
    expect(disclosure.details).toEqual([
      "Giá ưu đãi 80.000đ/tháng áp dụng cho kỳ 12 tháng.",
      "Tiền hosting trả trước 960.000đ, chưa gồm thuế và dịch vụ bổ sung.",
      "Giá gia hạn đã công bố: 150.000đ/tháng.",
    ]);
  });

  it("does not invent an unknown renewal price", () => {
    const disclosure = getRecommendationDisclosure({
      hasEligiblePlan: false,
      upfrontBudgetProvided: false,
      plan: {
        billingMonths: 24,
        promo: 55_900,
        upfrontVnd: 1_341_600,
        renewal: null,
      },
    });

    expect(disclosure.summary).toBe(
      "Chưa có gói đáp ứng ngân sách này. Các gói bên dưới chỉ để tham khảo; tổng tiền cuối được xác nhận trước khi tạo hóa đơn.",
    );
    expect(disclosure.details[2]).toBe("Giá gia hạn: Chưa xác minh.");
  });

  it("states when only monthly hosting budget was compared", () => {
    const disclosure = getRecommendationDisclosure({
      hasEligiblePlan: true,
      upfrontBudgetProvided: false,
      plan: {
        billingMonths: 12,
        promo: 80_000,
        upfrontVnd: 960_000,
        renewal: 150_000,
      },
    });

    expect(disclosure.summary).toBe(
      "Có gói đáp ứng ngân sách hosting theo tháng; bạn chưa nhập giới hạn trả trước. HOSTORA sẽ xác nhận tổng tiền cuối trước khi tạo hóa đơn.",
    );
  });
});
