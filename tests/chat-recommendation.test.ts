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
  expect(result?.answer).toContain("không phải cam kết chịu tải");
  expect(result?.sources).toHaveLength(4);
});

test("asks chatbot to clarify when needs are incomplete", () => {
  expect(explicitChatRecommendation("Tư vấn gói hosting cho tôi")).toBeNull();
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
