import { describe, expect, it } from "vitest";
import { auditAiVisibility } from "@/lib/ai-visibility";

const completeInput = {
  robotsTxt: "User-agent: *\nAllow: /",
  llmsTxt: "# Example\n- [Trang chinh](https://example.com/)",
  structuredData: {
    blocks: 1,
    types: ["Organization", "WebSite"],
  },
  meta: {
    title: "Example",
    description: "Mo ta Example",
    canonical: "https://example.com/",
    openGraph: true,
    language: true,
  },
  sitemap: true,
};

describe("AI visibility audit", () => {
  it("lets a specific crawler rule override a blocking wildcard", () => {
    const result = auditAiVisibility({
      ...completeInput,
      robotsTxt: [
        "User-agent: *",
        "Disallow: /",
        "",
        "User-agent: GPTBot",
        "Allow: /",
      ].join("\n"),
    });

    expect(result.crawlers.find((item) => item.id === "GPTBot")).toMatchObject(
      { status: "allowed", via: "specific" },
    );
    expect(
      result.crawlers.find((item) => item.id === "ClaudeBot"),
    ).toMatchObject({ status: "blocked", via: "wildcard" });
  });

  it("reports absent robots as default access instead of explicit evidence", () => {
    const result = auditAiVisibility({ ...completeInput, robotsTxt: null });

    expect(result.crawlers.every((item) => item.status === "allowed")).toBe(
      true,
    );
    expect(result.crawlers.every((item) => item.via === "default")).toBe(true);
    expect(result.categories.find((item) => item.id === "crawlers")).toEqual({
      id: "crawlers",
      label: "Quyền truy cập của AI",
      weight: 40,
      earned: 40,
    });
  });

  it("treats a wildcard path that matches the root as blocked", () => {
    const result = auditAiVisibility({
      ...completeInput,
      robotsTxt: "User-agent: *\nDisallow: /*",
    });

    expect(result.crawlers.every((item) => item.status === "blocked")).toBe(
      true,
    );
    expect(
      result.categories.find((item) => item.id === "crawlers")?.earned,
    ).toBe(0);
  });

  it("does not award full llms credit to content without a public link", () => {
    const result = auditAiVisibility({
      ...completeInput,
      llmsTxt: "# Example\nNoi dung chua co lien ket nguon.",
    });

    expect(result.categories.find((item) => item.id === "llms")).toEqual({
      id: "llms",
      label: "Tài liệu cho trợ lý AI",
      weight: 15,
      earned: 9,
    });
    expect(result.score).toBe(94);
  });

  it("uses published category weights for a complete public site", () => {
    const result = auditAiVisibility(completeInput);

    expect(result.score).toBe(100);
    expect(result.categories).toEqual([
      {
        id: "crawlers",
        label: "Quyền truy cập của AI",
        weight: 40,
        earned: 40,
      },
      {
        id: "entities",
        label: "Ngữ cảnh thương hiệu",
        weight: 25,
        earned: 25,
      },
      {
        id: "llms",
        label: "Tài liệu cho trợ lý AI",
        weight: 15,
        earned: 15,
      },
      {
        id: "meta",
        label: "Thông tin trang cơ bản",
        weight: 15,
        earned: 15,
      },
      {
        id: "sitemap",
        label: "Danh sách trang",
        weight: 5,
        earned: 5,
      },
    ]);
  });

  it("reports llms-full availability without inflating the score", () => {
    const result = auditAiVisibility({
      ...completeInput,
      llmsFullTxt: "# Example full\nhttps://example.com/services",
    });

    expect(result.documents).toEqual({ llmsTxt: true, llmsFullTxt: true });
    expect(result.score).toBe(100);
  });
});
