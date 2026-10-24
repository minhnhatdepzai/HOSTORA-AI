import { expect, test } from "@playwright/test";

test("five required features complete one business flow", async ({ page }) => {
  await page.goto("/");
  const faq = page.getByRole("button", { name: "Shop mới có cần VPS không?" });
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");

  await page.goto("/consultation");
  await page.getByRole("button", { name: /Bán hàng/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Xem đề xuất" }).click();
  await expect(page.locator("article").filter({ hasText: "/100" })).toHaveCount(
    3,
  );
  const comparison = page.getByRole("region", { name: "Bảng so sánh ba gói" });
  await expect(comparison.getByRole("table")).toBeVisible();
  await expect(comparison.getByRole("row")).toHaveCount(10);

  const alternate = page.locator("article").filter({ hasText: "/100" }).nth(1);
  const planName = await alternate.getByRole("heading").innerText();
  await alternate.getByRole("button", { name: /^Chọn / }).click();
  await expect(page.getByText("Gói đang chọn:")).toContainText(planName);
  await page.getByLabel("Họ tên").fill("Khách thử nghiệm");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByRole("button", { name: "Lưu yêu cầu tư vấn" }).click();
  await page.goto("/dashboard");
  const leadSection = page.locator("#khach-hang");
  await expect(leadSection.getByText("Khách thử nghiệm")).toBeVisible();
  await expect(
    leadSection.getByText("Gói quan tâm", { exact: true }),
  ).toBeVisible();
  await expect(
    leadSection.getByText(`Hostinger ${planName}`, { exact: true }),
  ).toBeVisible();
});

test("invalid business and chat requests are clear 400 errors", async ({
  request,
}) => {
  const invalidPlan = await request.post("/api/recommend", { data: {} });
  expect(invalidPlan.status()).toBe(400);
  expect((await invalidPlan.json()).error).toMatch(/Dữ liệu nhập/);
  const invalidChat = await request.post("/api/ai/chat", {
    data: { messages: [] },
  });
  expect(invalidChat.status()).toBe(400);
  expect((await invalidChat.json()).error).toMatch(/Dữ liệu nhập/);
});

test("chat resolves cited source to a real link", async ({ page }) => {
  await page.goto("/ai-assistant");
  await page
    .getByLabel("Tin nhắn")
    .fill("Tên miền abc-hostora-demo.com còn trống hôm nay không?");
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByText("Nguồn được trích dẫn")).toBeVisible();
  await expect(
    page.getByText(/không thể xác nhận tên miền còn trống/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /\[K1\].*Tên miền/ }),
  ).toHaveAttribute("href", /^https:\/\//);
});

test("catalog outage never substitutes unverified prices", async ({ page }) => {
  await page.route("**/api/recommend", (route) => route.abort());
  await page.goto("/recommendations");
  await expect(page.locator(".panel[role='alert']")).toContainText(
    "Không hiển thị giá hoặc xếp hạng dự phòng",
  );
  await expect(page.locator("article").filter({ hasText: "/100" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
});

test("old chat claims stay archived and out of new AI context", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "hostora:chat",
      JSON.stringify([
        { role: "assistant", content: "Giá cũ 19.900đ cho gói đã ngừng bán" },
      ]),
    );
  });
  let sentMessages: { content: string }[] = [];
  await page.route("**/api/ai/chat", async (route) => {
    sentMessages = route.request().postDataJSON().messages;
    await route.continue();
  });
  await page.goto("/ai-assistant");
  await expect(
    page.getByText("Giá cũ 19.900đ cho gói đã ngừng bán"),
  ).toHaveCount(0);
  await page
    .getByLabel("Tin nhắn")
    .fill("Tên miền abc-hostora-demo.com còn trống hôm nay không?");
  await page.getByRole("button", { name: "Gửi" }).click();
  await expect(page.getByText("Nguồn được trích dẫn")).toBeVisible();
  expect(
    sentMessages.some((message) => message.content.includes("Giá cũ")),
  ).toBe(false);
});

test("launch score explains a deterministic result and AI critique", async ({
  page,
}) => {
  await page.route("**/api/ai/readiness", async (route) => {
    await route.fulfill({
      json: {
        score: 68,
        band: {
          id: "needs-work",
          label: "Gần sẵn sàng",
          copy: "Cần xử lý blocker.",
        },
        dimensions: [
          {
            id: "strategy",
            label: "Chiến lược",
            score: 16,
            max: 20,
            percent: 80,
            note: "Ngân sách hợp lý.",
          },
          {
            id: "contentSeo",
            label: "Nội dung & SEO",
            score: 8,
            max: 25,
            percent: 32,
            note: "Thiếu nội dung.",
          },
          {
            id: "operations",
            label: "Vận hành",
            score: 20,
            max: 25,
            percent: 80,
            note: "Đã có người phụ trách.",
          },
          {
            id: "infrastructure",
            label: "Hạ tầng",
            score: 24,
            max: 30,
            percent: 80,
            note: "Gói phù hợp.",
          },
        ],
        blockers: ["Chưa xác định nhóm từ khóa."],
        recommendation: {
          provider: "Hostinger",
          name: "Cloud Startup",
          fitScore: 96,
          promoMonthlyVnd: 167900,
          renewalMonthlyVnd: 447900,
          billingMonths: 48,
          sourceUrl: "https://www.hostinger.com/vn/web-hosting",
          verifiedAt: "2026-10-23",
        },
        ai: {
          headline: "Nền tảng ổn, nội dung còn thiếu",
          summary: "Hoàn thiện nội dung trước khi launch.",
          strengths: ["Hạ tầng phù hợp", "Có người vận hành"],
          nextActions: ["Chốt từ khóa", "Viết nội dung", "Chạy thử checkout"],
          judgeQuestions: [
            "Ai chịu trách nhiệm backup?",
            "Đo conversion thế nào?",
            "Khi nào nâng cấp?",
          ],
        },
        aiMode: "local-ai",
        retrievalMode: "hybrid",
        sources: [],
        disclaimer: "Checklist hỗ trợ quyết định.",
      },
    });
  });
  await page.goto("/readiness");
  await page
    .getByRole("button", { name: "Chấm Launch Score bằng AI local" })
    .click();
  await expect(page.getByText("68")).toBeVisible();
  await expect(page.getByText("AI phản biện như giám khảo")).toBeVisible();
  await expect(page.getByText("Ai chịu trách nhiệm backup?")).toBeVisible();
  await expect(page.getByText("Hostinger Cloud Startup")).toBeVisible();
});
