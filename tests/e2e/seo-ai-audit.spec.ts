import { expect, test } from "@playwright/test";

const auditResponse = {
  url: "https://example.com/",
  keyword: "hosting doanh nghiệp",
  title: "Example",
  description: "Website Example",
  canonical: "https://example.com/",
  wordCount: 840,
  score: 82,
  scores: { overall: 82, seo: 100, aiVisibility: 64 },
  findings: [
    {
      id: "title",
      group: "content",
      label: "Tên trang trên Google",
      status: "pass",
      impact: "high",
      detail: "Đã có tên trang rõ ràng.",
    },
    {
      id: "llms-txt",
      group: "geo",
      label: "Tài liệu cho trợ lý AI",
      status: "pass",
      impact: "medium",
      detail: "Đã có llms.txt.",
    },
  ],
  aiCrawlers: [
    {
      id: "GPTBot",
      vendor: "OpenAI",
      status: "allowed",
      via: "specific",
    },
    {
      id: "ClaudeBot",
      vendor: "Anthropic",
      status: "blocked",
      via: "wildcard",
    },
  ],
  aiCategories: [
    {
      id: "crawlers",
      label: "Quyền truy cập của AI",
      weight: 40,
      earned: 4.44,
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
  ],
  aiDocuments: { llmsTxt: true, llmsFullTxt: true },
  ai: {
    executiveSummary:
      "Trang đạt 82/100; quyền truy cập của một số trợ lý AI cần xem lại.",
    priorities: ["Kiểm tra quyền truy cập của ClaudeBot."],
    contentIdeas: ["Viết FAQ trả lời câu hỏi chọn hosting doanh nghiệp."],
  },
  automationPlan: [
    {
      id: "ai-crawler-access",
      priority: "P0",
      mode: "verify",
      title: "Quyền đọc website của trợ lý AI",
      action: "Kiểm tra robots.txt vì đang chặn ClaudeBot.",
      acceptance: "Các bot muốn hỗ trợ được phép đọc trang công khai.",
      evidence: "1/2 bot đang bị chặn tại đường dẫn gốc.",
      draft: null,
    },
  ],
  sources: [
    {
      citation: "K1",
      id: "seo-source",
      title: "SEO source",
      sourceUrl: "https://developers.google.com/search/docs",
      verifiedAt: "2026-11-02",
    },
  ],
  limits: ["Điểm số không chứng minh ChatGPT hoặc Claude sẽ đề xuất website."],
};

test("shows an actionable SEO and AI visibility report", async ({ page }) => {
  let releaseResponse: (() => void) | undefined;
  await page.route("**/api/seo/audit", async (route) => {
    await new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await route.fulfill({ json: auditResponse });
  });

  await page.goto("/website-analyzer");
  await expect(
    page.getByRole("heading", {
      name: "Kiểm tra khả năng xuất hiện trên Google và AI.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Bắt đầu bằng một địa chỉ website công khai"),
  ).toBeVisible();

  await page.getByLabel("Địa chỉ website").fill("https://example.com");
  await page
    .getByLabel("Từ khóa khách thường tìm")
    .fill("hosting doanh nghiệp");
  await page.getByRole("button", { name: "Chấm điểm website" }).click();
  await expect(
    page.getByRole("button", { name: "Đang kiểm tra" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Đang đọc website và tài liệu công khai"),
  ).toBeVisible();

  releaseResponse?.();
  const scores = page.getByRole("region", { name: "Ba điểm đánh giá" });
  await expect(scores.getByText("Điểm tổng quan")).toBeVisible();
  await expect(scores.getByText("82", { exact: true })).toBeVisible();
  await expect(scores.getByText("SEO Google")).toBeVisible();
  await expect(scores.getByText("100", { exact: true })).toBeVisible();
  await expect(scores.getByText("AI có thể đọc và hiểu")).toBeVisible();
  await expect(scores.getByText("64", { exact: true })).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Việc nên làm trước" }),
  ).toBeVisible();
  await expect(page.getByText("Quyền đọc website của trợ lý AI")).toBeVisible();
  const crawlerTable = page.getByRole("table", {
    name: "Quyền truy cập của các bot AI",
  });
  await expect(
    crawlerTable.getByRole("row", { name: /GPTBot.*Cho phép/ }),
  ).toBeVisible();
  await expect(
    crawlerTable.getByRole("row", { name: /ClaudeBot.*Đang chặn/ }),
  ).toBeVisible();
  await expect(page.getByText("Tên trang trên Google")).toBeVisible();
  await expect(
    page.getByText("Viết FAQ trả lời câu hỏi chọn hosting doanh nghiệp."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /SEO source/ })).toBeVisible();
  await expect(
    page.getByText(
      "Điểm số không chứng minh ChatGPT hoặc Claude sẽ đề xuất website.",
    ),
  ).toBeVisible();
});

test("shows a clear API error and keeps the form usable", async ({ page }) => {
  await page.route("**/api/seo/audit", async (route) => {
    await route.fulfill({
      status: 422,
      json: { error: "URL không trả HTML công khai hợp lệ." },
    });
  });
  await page.goto("/website-analyzer");
  await page.getByRole("button", { name: "Chấm điểm website" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "URL không trả HTML công khai hợp lệ." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chấm điểm website" }),
  ).toBeEnabled();
});
