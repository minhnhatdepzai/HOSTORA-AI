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
