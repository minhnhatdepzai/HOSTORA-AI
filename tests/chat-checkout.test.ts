import { describe, expect, it } from "vitest";
import {
  asksForSelectedPlanAdvice,
  checkoutPrompt,
  isPurchaseConfirmation,
  quoteForConversation,
  selectedPlanAdviceAnswer,
} from "@/lib/chat-checkout";
import type { ChatFacts } from "@/lib/chat-memory";
import { recommendPlans } from "@/lib/recommendation";

const facts: ChatFacts = {
  websiteType: "store",
  ecommerce: true,
  monthlyVisits: 5_000,
  monthlyBudget: 500_000,
  upfrontBudget: null,
  needsDomain: false,
};

describe("chốt đơn trong hội thoại", () => {
  it.each(["Tôi chốt", "mua luôn gói đó", "đồng ý mua", "tạo hóa đơn cho mình"])(
    "nhận ra câu xác nhận: %s",
    (message) => expect(isPurchaseConfirmation(message)).toBe(true),
  );

  it("nhận ra lựa chọn phương án thứ hai kèm yêu cầu thanh toán ngay", () => {
    expect(
      isPurchaseConfirmation(
        "Tôi chọn phương án thứ hai. Hãy tư vấn ngắn gọn lần cuối rồi cho tôi thanh toán ngay trong cuộc trò chuyện này.",
      ),
    ).toBe(true);
  });

  it("giữ đúng gói vừa được nhắc và tính kỳ đầu tất định", () => {
    const quote = quoteForConversation(facts, [
      {
        role: "assistant",
        content: "Gói chính: AZDIGI AZ Pro 2 cho website của bạn.",
      },
      { role: "user", content: "Tôi chốt gói đó" },
    ]);
    expect(quote).toMatchObject({
      planId: "azdigi-az-pro-2",
      amountVnd: 540_000,
      billingMonths: 12,
    });
    expect(checkoutPrompt(quote!)).toContain("mỗi lần chốt tạo một hóa đơn riêng");
  });

  it("ánh xạ phương án thứ hai sang đúng gói xếp hạng thứ hai", () => {
    const recommended = recommendPlans({
      websiteType: facts.websiteType!,
      ecommerce: facts.ecommerce!,
      monthlyVisits: facts.monthlyVisits!,
      monthlyBudget: facts.monthlyBudget!,
      needsDomain: facts.needsDomain!,
    });
    const quote = quoteForConversation(facts, [
      {
        role: "assistant",
        content: `Gói chính: ${recommended[0].plan.provider} ${recommended[0].plan.name}. Thay thế 1: ${recommended[1].plan.provider} ${recommended[1].plan.name}. Thay thế 2: ${recommended[2].plan.provider} ${recommended[2].plan.name}.`,
      },
      {
        role: "user",
        content:
          "Tôi chọn phương án thứ hai. Hãy tư vấn ngắn gọn lần cuối rồi cho tôi thanh toán ngay trong cuộc trò chuyện này.",
      },
    ]);
    expect(quote?.planId).toBe(recommended[1].plan.id);
  });

  it("tư vấn sâu đúng gói đã chọn và không mời chốt lại khi đã thanh toán", () => {
    const message =
      "Tôi đang chọn Hostinger Không giới hạn. Hãy tư vấn ưu nhược điểm và cách dùng gói này cho hồ sơ hiện tại của tôi.";
    expect(asksForSelectedPlanAdvice(message)).toBe(true);
    const quote = quoteForConversation(facts, [{ role: "user", content: message }]);
    const advice = selectedPlanAdviceAnswer({
      quote: quote!,
      facts,
      orderStatus: "paid",
      businessFocus: "Cà phê tại TP.HCM",
    });
    expect(advice?.answer).toContain("50 GB NVMe");
    expect(advice?.answer).toContain("đã thanh toán");
    expect(advice?.answer).toContain("Bạn không cần chốt lại");
    expect(advice?.answer).not.toContain("Trước khi chốt");
    expect(advice?.sources[0]).toMatchObject({ citation: "P1" });
  });
});
