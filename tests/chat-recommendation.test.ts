import { expect, test } from "vitest";
import {
  explicitChatRecommendation,
  needsRecommendationRequirements,
  recommendationClarificationAnswer,
} from "@/lib/chat-recommendation";
import type { ChatFacts } from "@/lib/chat-memory";

test("ranks three catalog plans deterministically for explicit shop needs", () => {
  const result = explicitChatRecommendation(
    "Shop WooCommerce dự kiến 15.000 lượt/tháng, có flash sale, ngân sách khoảng 300.000đ/tháng và cần tên miền. Hãy nêu hướng chọn gói, 2 phương án dự phòng.",
  );
  expect(result).not.toBeNull();
  expect(result?.answer).toContain("Gói chính:");
  expect(result?.answer).toContain("Thay thế 1:");
  expect(result?.answer).toContain("Thay thế 2:");
  expect(result?.answer).toContain("chưa cho biết website có chịu được giờ cao điểm");
  expect(result?.answer).not.toContain("..");
  expect(result?.sources).toHaveLength(4);
});

test("asks chatbot to clarify when needs are incomplete", () => {
  expect(explicitChatRecommendation("Tư vấn gói hosting cho tôi")).toBeNull();
});

test("respects a request for exactly one plan and omits unrelated performance source for a blog", () => {
  const result = explicitChatRecommendation("Tôi có blog mới 1.000 lượt mỗi tháng, ngân sách 100.000 đồng, đã có tên miền. Chọn giúp đúng một gói và giải thích ngắn.");
  expect(result).not.toBeNull();
  expect(result?.answer).toContain("Gói chính:");
  expect(result?.answer).not.toContain("Thay thế 1:");
  expect(result?.answer).toContain("trả 955.200đ cho 48 tháng");
  expect(result?.answer).not.toContain("cần xác nhận giá gia hạn");
  expect(result?.answer.length).toBeLessThan(550);
  expect(result?.sources).toHaveLength(1);
});

test("generic plan question requests missing business inputs before ranking", () => {
  expect(needsRecommendationRequirements("Shop mới nên chọn gói nào?")).toBe(
    true,
  );
  expect(needsRecommendationRequirements("CDN giúp gì khi flash sale?")).toBe(
    false,
  );
});

test("clarification keeps known hard-case facts and asks only for missing inputs", () => {
  const facts: ChatFacts = {
    websiteType: null,
    ecommerce: null,
    monthlyVisits: 12_000,
    monthlyBudget: 450_000,
    upfrontBudget: null,
    needsDomain: null,
  };

  const answer = recommendationClarificationAnswer(
    "Website WordPress 12.000 lượt/tháng, ngân sách 450.000đ, cần backup hằng ngày và 20 email; hãy chọn gói chính xác.",
    facts,
  );

  expect(answer).toContain("12.000 lượt/tháng");
  expect(answer).toContain("450.000đ/tháng");
  expect(answer).toContain("loại website");
  expect(answer).toContain("có cần mua tên miền");
  expect(answer).toContain("backup hằng ngày");
  expect(answer).toContain("20 hộp thư");
  expect(answer).not.toContain("bao nhiêu lượt truy cập");
  expect(answer).not.toContain("bao nhiêu đồng mỗi tháng");
});
