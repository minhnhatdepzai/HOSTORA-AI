import { describe, expect, it } from "vitest";
import { auditSeoHtml } from "@/lib/seo";
import { buildSeoAutomationPlan } from "@/lib/seo-automation";

describe("SEO audit", () => {
  it("scores a complete public HTML page deterministically", () => {
    const html = `<!doctype html><html lang="vi"><head><title>HOSTORA AI</title><meta name="description" content="Tư vấn hosting"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://example.com/"><meta property="og:title" content="HOSTORA AI"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization"}</script></head><body><h1>HOSTORA AI</h1><h2>Hosting</h2><a href="/hosting">Xem gói</a><img src="a.jpg" alt="Máy chủ"></body></html>`;
    const result = auditSeoHtml(html, new URL("https://example.com"), {
      robots: true,
      sitemap: true,
    });
    expect(result.score).toBe(100);
    expect(result.structuredData.types).toContain("Organization");
    expect(result.links.internal).toBe(1);
  });

  it("flags noindex and missing high-impact signals", () => {
    const result = auditSeoHtml(
      '<html><head><meta name="robots" content="noindex"></head><body><h1>A</h1><h1>B</h1></body></html>',
      new URL("http://example.com"),
      { robots: false, sitemap: false },
    );
    expect(result.score).toBeLessThan(50);
    expect(
      result.findings.find((item) => item.id === "indexable")?.status,
    ).toBe("fail");
    expect(result.findings.find((item) => item.id === "https")?.status).toBe(
      "fail",
    );
    const plan = buildSeoAutomationPlan(result.findings, {
      keyword: "hosting bán hàng",
      url: new URL("http://example.com"),
      title: result.title,
    });
    expect(plan[0].priority).toBe("P0");
    expect(plan.find((task) => task.id === "https")?.mode).toBe("verify");
    expect(plan.find((task) => task.id === "title")?.draft).toContain(
      "hosting bán hàng",
    );
  });
});
