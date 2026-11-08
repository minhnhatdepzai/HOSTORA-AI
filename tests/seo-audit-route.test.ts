import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  structuredChat: vi.fn(),
  retrieve: vi.fn(),
}));

vi.mock("@/lib/ollama", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ollama")>();
  return { ...original, structuredChat: dependencies.structuredChat };
});

vi.mock("@/lib/rag", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/rag")>();
  return { ...original, retrieve: dependencies.retrieve };
});

import { POST } from "@/app/api/seo/audit/route";

const html = `<!doctype html><html lang="vi"><head>
  <title>Example</title>
  <meta name="description" content="Website Example">
  <meta name="viewport" content="width=device-width">
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="Example">
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization"},{"@type":"WebSite"}]}</script>
</head><body><h1>Example</h1><h2>Dich vu</h2><a href="/services">Dich vu</a></body></html>`;

function publicResponse(url: string) {
  if (url.endsWith("/robots.txt")) {
    return new Response(
      "User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /",
      { headers: { "content-type": "text/plain" } },
    );
  }
  if (url.endsWith("/sitemap.xml")) {
    return new Response("<urlset></urlset>", {
      headers: { "content-type": "application/xml" },
    });
  }
  if (url.endsWith("/llms-full.txt")) {
    return new Response("# Example full\nhttps://example.com/services", {
      headers: { "content-type": "text/plain" },
    });
  }
  if (url.endsWith("/llms.txt")) {
    return new Response("# Example\nhttps://example.com/", {
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

describe("SEO audit route", () => {
  beforeEach(() => {
    dependencies.structuredChat.mockReset();
    dependencies.retrieve.mockReset();
    dependencies.structuredChat.mockRejectedValue(new Error("Ollama offline"));
    dependencies.retrieve.mockResolvedValue([
      {
        id: "seo-source",
        title: "SEO source",
        content: "Noi dung co nguon",
        sourceUrl: "https://developers.google.com/search/docs",
        verifiedAt: "2026-11-02",
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url =
          input instanceof Request
            ? input.url
            : input instanceof URL
              ? input.toString()
              : input;
        return publicResponse(url);
      }),
    );
  });

  it("returns split scores and crawler evidence when Ollama is offline", async () => {
    const response = await POST(
      new Request("http://localhost/api/seo/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "example.com",
          keyword: "hosting doanh nghiep",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scores).toEqual({
      overall: 82,
      seo: 100,
      aiVisibility: 64,
    });
    expect(body.score).toBe(82);
    expect(body.url).toBe("https://example.com/");
    expect(body.aiCrawlers).toHaveLength(9);
    expect(
      body.aiCrawlers.find((crawler: { id: string }) =>
        crawler.id === "GPTBot",
      ),
    ).toMatchObject({ status: "allowed", via: "specific" });
    expect(
      body.aiCrawlers.find((crawler: { id: string }) =>
        crawler.id === "ClaudeBot",
      ),
    ).toMatchObject({ status: "blocked", via: "wildcard" });
    expect(body.aiCategories).toHaveLength(5);
    expect(body.aiDocuments).toEqual({ llmsTxt: true, llmsFullTxt: true });
    expect(body.ai.executiveSummary).toContain("82/100");
    expect(body.ai.priorities.length).toBeGreaterThan(0);
    expect(body.ai.contentIdeas).toEqual([
      "Trang trụ cột giải quyết ý định tìm kiếm “hosting doanh nghiep”",
      "FAQ trả lời các câu hỏi mua hàng quanh “hosting doanh nghiep”",
    ]);
  });

  it("rejects unsupported URL schemes without exposing a stack trace", async () => {
    const response = await POST(
      new Request("http://localhost/api/seo/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "file:///etc/passwd" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeTypeOf("string");
    expect(body).not.toHaveProperty("stack");
  });
});
