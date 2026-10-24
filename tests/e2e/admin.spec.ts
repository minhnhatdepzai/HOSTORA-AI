import { expect, test } from "@playwright/test";

const lead = {
  id: "judge-lead",
  name: "Khách kiểm thử",
  phone: "0900000000",
  plan: "Hostinger Premium",
  createdAt: "2026-10-24T08:00:00.000Z",
  status: "new",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => {
    localStorage.setItem("hostora:leads", JSON.stringify([value]));
    localStorage.setItem(
      "hostora:requirements",
      JSON.stringify({
        websiteType: "store",
        monthlyVisits: 5000,
        monthlyBudget: 300000,
        needsDomain: true,
        ecommerce: true,
      }),
    );
  }, lead);
});

test("admin controls local leads and shows service data", async ({ page }) => {
  let classificationRequest: Record<string, unknown> = {};
  await page.route("**/api/ai/lead", async (route) => {
    classificationRequest = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        segment: "new-site",
        unansweredQuestions: ["Khi nào cần mở website?"],
        suggestedNextMessage: "Mình có thể hỗ trợ bạn chuẩn bị gói phù hợp.",
      }),
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Mọi việc quan trọng ở một nơi." }),
  ).toBeVisible();
  await expect(page.getByText("Khách kiểm thử")).toBeVisible();
  await expect(page.getByText("13", { exact: true }).first()).toBeVisible();

  await page
    .getByLabel("TRẠNG THÁI", { exact: true })
    .selectOption("qualified");
  await expect(
    page.getByText("Đã cập nhật trạng thái khách hàng."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hostora:leads") ?? "[]").at(0)?.status,
    ),
  ).toBe("qualified");

  await page
    .getByRole("button", { name: "Phân nhóm nhu cầu của Khách kiểm thử" })
    .click();
  await expect(
    page.getByText("Đã phân nhóm nhu cầu mà không gửi tên hoặc số điện thoại."),
  ).toBeVisible();
  expect(classificationRequest).not.toHaveProperty("name");
  expect(classificationRequest).not.toHaveProperty("phone");
});

test("admin remains usable without horizontal overflow", async ({ page }) => {
  await page.goto("/admin");
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  const menuButton = page.getByRole("button", { name: "Mở menu quản trị" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await expect(page.getByRole("navigation").last()).toBeVisible();
});
