import { describe, expect, it } from "vitest";
import { expandQuery } from "@/lib/rag";

describe("RAG query expansion", () => {
  it("adds deterministic SEO terminology", () => {
    const expanded = expandQuery("SEO shop bán hàng");
    expect(expanded).toContain("canonical");
    expect(expanded).toContain("structured data");
    expect(expanded).toContain("thương mại điện tử");
  });

  it("does not invent expansions for an unrelated query", () => {
    expect(expandQuery("DNS là gì")).toBe("DNS là gì");
  });
});
