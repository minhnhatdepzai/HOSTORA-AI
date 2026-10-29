import { expect, test } from "vitest";
import { citedSources, parseChatSources, readChatSources } from "@/lib/chat-sources";
import { sanitizeCitations } from "@/lib/chat-citations";

test("resolves only referenced, safe source links", () => {
  const header = encodeURIComponent(
    JSON.stringify([
      {
        citation: "K1",
        title: "DNS",
        sourceUrl: "https://example.com/dns",
        verifiedAt: "2026-10-23",
      },
      {
        citation: "K2",
        title: "Other",
        sourceUrl: "https://example.com/other",
        verifiedAt: "2026-10-23",
      },
      {
        citation: "K3",
        title: "Unsafe",
        sourceUrl: "javascript:alert(1)",
        verifiedAt: "2026-10-23",
      },
    ]),
  );
  const sources = readChatSources(header);
  expect(
    citedSources("Đọc DNS [K1]", sources).map((item) => item.citation),
  ).toEqual(["K1"]);
  expect(sources).toHaveLength(2);
  expect(readChatSources("not-json")).toEqual([]);
});

test("accepts private account citations without exposing unsafe links", () => {
  expect(
    parseChatSources([
      {
        citation: "U1",
        title: "Brief nội bộ",
        sourceUrl: null,
        verifiedAt: "Nguồn riêng của khách",
        kind: "customer",
      },
    ]),
  ).toHaveLength(1);
});

test("normalizes allowed private citations and removes invented citation tokens", () => {
  expect(
    sanitizeCitations("Thông tin từ brief (U1), không phải [U99] hay [P9].", new Set(["[U1]"])),
  ).toBe("Thông tin từ brief [U1], không phải hay.");
});
