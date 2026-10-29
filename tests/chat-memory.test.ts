import { describe, expect, it } from "vitest";
import {
  buildConversationMemory,
  extractConversationFacts,
  mergeConversationMemory,
  recommendationContextQuestion,
  recentChatMessages,
} from "@/lib/chat-memory";

const user = (content: string) => ({ role: "user" as const, content });
const assistant = (content: string) => ({ role: "assistant" as const, content });

describe("chat memory", () => {
  it("retains requirements after a long conversation while keeping only recent turns", () => {
    const messages = [
      user("Tôi làm blog, 3000 lượt mỗi tháng, ngân sách 500 nghìn, không cần mua kèm tên miền."),
      ...Array.from({ length: 18 }, (_, index) => assistant(`Trao đổi thêm ${index}`)),
      user("Với ngân sách cũ, gợi ý gói nào?"),
    ];
    const memory = buildConversationMemory(messages);
    expect(memory.facts).toMatchObject({
      websiteType: "blog",
      ecommerce: null,
      monthlyVisits: 3000,
      monthlyBudget: 500000,
      needsDomain: false,
    });
    expect(recentChatMessages(messages)).toHaveLength(14);
    expect(recommendationContextQuestion(messages.at(-1)!.content, memory.facts)).toContain("3000 lượt/tháng");
  });

  it("lets a newer message correct an earlier requirement", () => {
    const first = buildConversationMemory([
      user("Tôi bán hàng online, 10.000 lượt/tháng, ngân sách 1 triệu, cần tên miền."),
    ]);
    const corrected = mergeConversationMemory(first, [
      user("Tôi đổi ý, chỉ làm blog chia sẻ, không bán hàng trên web và không cần mua thêm domain."),
    ]);
    expect(corrected.facts).toMatchObject({
      websiteType: "blog",
      ecommerce: false,
      needsDomain: false,
    });
    expect(corrected.facts.monthlyBudget).toBe(1_000_000);
  });

  it("does not turn a blog topic about selling into ecommerce", () => {
    expect(
      extractConversationFacts([
        user("Blog chia sẻ kinh nghiệm bán hàng, chỉ đăng bài viết, không kinh doanh trên web."),
      ]),
    ).toMatchObject({ websiteType: "blog", ecommerce: false });
  });

  it("does not retain contact details or order identifiers", () => {
    const memory = buildConversationMemory([
      user("Email a@example.com, số 0912345678, mã đơn ORD-ABC123. Tôi làm blog 1000 lượt/tháng."),
    ]);
    expect(memory.summary).not.toMatch(/a@example|091234|ORD-ABC123/i);
    expect(memory.summary).toContain("blog");
  });

  it("keeps unresolved fields explicit instead of guessing", () => {
    const memory = buildConversationMemory([user("Tôi chưa biết ngân sách và chưa quyết định có mua domain.")]);
    expect(memory.facts.monthlyBudget).toBeNull();
    expect(memory.facts.needsDomain).toBeNull();
    expect(memory.unresolved).toContain("ngân sách mỗi tháng");
  });
});
