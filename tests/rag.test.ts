import { describe, expect, it } from "vitest";
import { bm25LexicalScores, expandQuery, reciprocalRankFusion } from "@/lib/rag";

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

describe("RAG deep hybrid ranking", () => {
  const docs = [
    {
      id: "focus",
      title: "Focus bàn phím",
      keywords: ["focus", "keyboard", "accessibility"],
      content: "Mọi điều khiển cần có focus hiển thị rõ khi dùng bàn phím.",
    },
    {
      id: "hosting",
      title: "Hosting cơ bản",
      keywords: ["hosting", "server"],
      content: "Hosting lưu dữ liệu website.",
    },
  ];

  it("BM25 ranks a focused document above unrelated keyword noise", () => {
    const scores = bm25LexicalScores("focus bàn phím dễ thấy", docs);
    expect(scores.get("focus")).toBeGreaterThan(scores.get("hosting") ?? 0);
  });

  it("RRF combines semantic and lexical ranks without raw-score coupling", () => {
    const fused = reciprocalRankFusion(
      ["hosting", "focus"],
      ["focus", "hosting"],
    );
    expect(fused.get("hosting")).toBeGreaterThan(0);
    expect(fused.get("focus")).toBeGreaterThan(0);
    expect(Math.abs((fused.get("hosting") ?? 0) - (fused.get("focus") ?? 0))).toBeLessThan(0.001);
  });

  it("expands accessibility and cinematic motion queries deterministically", () => {
    const expanded = expandQuery("website cinematic nhưng phải dễ tiếp cận");
    expect(expanded).toContain("prefers-reduced-motion");
    expect(expanded).toContain("focus visible");
    expect(expanded).toContain("GSAP");
  });
});
