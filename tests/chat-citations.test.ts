import { expect, test } from "vitest";
import { sanitizeCitations } from "@/lib/chat-citations";

test("drops invented citation tokens but preserves supplied source IDs", () => {
  const result = sanitizeCitations(
    "Đúng [K1], sai [K99] và [grounding_rules][2] hoặc [S].",
    new Set(["[K1]"]),
  );
  expect(result).toContain("[K1]");
  expect(result).not.toContain("K99");
  expect(result).not.toContain("grounding_rules");
  expect(result).not.toContain("[S]");
});

test("drops empty editorial labels leaked from training format", () => {
  expect(sanitizeCitations("Câu trả lời. [Dữ kiện nguồn]", new Set())).toBe(
    "Câu trả lời.",
  );
});

test("drops a wildcard customer-source placeholder leaked by the model", () => {
  expect(
    sanitizeCitations("Hãy cho biết thêm nhu cầu. [U*]", new Set()),
  ).toBe("Hãy cho biết thêm nhu cầu.");
});

test("drops hallucinated citation families that are not supplied as sources", () => {
  expect(sanitizeCitations("Xem thêm [K1][C4].", new Set(["[K1]"]))).toBe("Xem thêm [K1].");
});

test("keeps source numbers while moving external URLs out of model prose", () => {
  const answer = sanitizeCitations("Xem [tài liệu](https://example.com/guide) hoặc https://example.com/pay trước. [K1]", new Set(["[K1]"]));
  expect(answer).toContain("[K1]");
  expect(answer).not.toContain("https://");
  expect(answer).toContain("tài liệu");
});
