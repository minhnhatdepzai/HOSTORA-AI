import { expect, test } from "vitest";
import {
  explicitChatRecommendation,
  needsRecommendationRequirements,
} from "@/lib/chat-recommendation";

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
