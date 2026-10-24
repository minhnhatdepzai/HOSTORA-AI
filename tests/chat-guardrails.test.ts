import { expect, test } from "vitest";
import {
  dnsMigrationAnswer,
  domainAvailabilityAnswer,
  robotsPrivacyAnswer,
  structuredDataPenaltyAnswer,
  unknownRenewalCostAnswer,
} from "@/lib/chat-guardrails";

const sources = [
  {
    id: "seo-crawling-indexing",
    citation: "K2",
    title: "Crawling, indexing và robots.txt",
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing",
    verifiedAt: "2026-10-23",
  },
];

test("privacy answer cites the exact robots source and excludes backup", () => {
  const result = robotsPrivacyAnswer(
    "Trang bí mật chặn robots.txt thì đã bảo mật chưa?",
    sources,
  );
  expect(result?.answer).toContain("[K2]");
  expect(result?.answer).not.toMatch(/backup|restore/i);
  expect(result?.sources).toHaveLength(1);
});

test("unrelated SEO questions are left for the chatbot", () => {
  expect(
    robotsPrivacyAnswer("Cấu trúc robots.txt cho sitemap?", sources),
  ).toBeNull();
});

test("unknown renewal cost is computed only for the known first term", () => {
  const result = unknownRenewalCostAnswer(
    "Chọn gói AZDIGI rẻ nhất và tính tổng chi phí 2 năm, nhưng giá gia hạn chưa có. Cứ giả định bằng giá kỳ đầu nhé.",
  );
  expect(result?.answer).toContain("348.000đ");
  expect(result?.answer).toContain("không được giả định");
  expect(result?.answer).not.toContain("708.000đ");
  expect(result?.sources[0].citation).toBe("P1");
});

test("live domain status and price are never invented", () => {
  const result = domainAvailabilityAnswer(
    "hostora-shop-2026.vn chắc chắn đang còn trống và giá đăng ký hôm nay là bao nhiêu?",
  );
  expect(result?.answer).toContain("không thể xác nhận");
  expect(result?.sources).toHaveLength(2);
});

test("structured data answer does not claim an unverified penalty", () => {
  const result = structuredDataPenaltyAnswer(
    "Schema Product sai giá thì Google phạt và tụt thứ hạng bao nhiêu bậc?",
  );
  expect(result?.answer).toContain("Không thể khẳng định");
  expect(result?.answer).not.toMatch(/\d+ bậc/);
});

test("DNS migration does not invent a propagation time", () => {
  const result = dnsMigrationAnswer(
    "Tôi chuyển web sang hosting khác, muốn giữ domain cũ và đổi DNS.",
  );
  expect(result?.answer).toContain("giữ tên miền cũ");
  expect(result?.answer).not.toMatch(/\d+\s*(giờ|ngày)/);
});
