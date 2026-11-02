import { describe, expect, it } from "vitest";
import { evaluateAiEscalation } from "@/lib/ai-escalation";

describe("AI human handoff", () => {
  it("routes a clearly unrelated question to a human instead of inventing an answer", () => {
    expect(
      evaluateAiEscalation({
        question: "Ngày mai ở Hà Nội có mưa không?",
      }),
    ).toEqual({ reason: "out_of_scope" });
  });

  it("keeps HOSTORA hosting and website questions with the trained assistant", () => {
    expect(
      evaluateAiEscalation({
        question: "Cửa hàng nhỏ nên chọn hosting nào và cần tên miền không?",
      }),
    ).toBeNull();
  });

  it("escalates when the assistant explicitly lacks the requested live data", () => {
    expect(
      evaluateAiEscalation({
        question: "Tên miền mocan.vn hiện còn trống không?",
        answer:
          "Mình chưa thể xác nhận tình trạng tên miền theo thời gian thực.",
      }),
    ).toEqual({ reason: "insufficient_data" });
  });

  it("escalates an unavailable local model without exposing implementation details", () => {
    expect(
      evaluateAiEscalation({
        question: "Tư vấn giúp tôi một gói hosting.",
        assistantUnavailable: true,
      }),
    ).toEqual({ reason: "assistant_unavailable" });
  });
});
