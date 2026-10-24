import { expect, test } from "vitest";
import { citedSources, readChatSources } from "@/lib/chat-sources";

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
