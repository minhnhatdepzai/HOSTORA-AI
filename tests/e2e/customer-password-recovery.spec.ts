import { expect, test } from "@playwright/test";

test("password recovery explains resend throttling instead of showing a system error", async ({
  page,
}) => {
  await page.route("**/api/account/forgot-password", async (route) => {
    await route.fulfill({
      status: 429,
      headers: { "retry-after": "180" },
      json: {
        code: "RATE_LIMITED",
        error: "Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.",
        retryAfterSeconds: 180,
      },
    });
  });

  await page.goto("/account/forgot-password");
  await page
    .getByLabel("Email nhận hóa đơn")
    .fill("  CUSTOMER@EXAMPLE.COM  ");
  const requestPromise = page.waitForRequest(
    (request) => request.url().includes("/api/account/forgot-password"),
  );
  await page.getByRole("button", { name: "Gửi liên kết" }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({
    email: "customer@example.com",
  });
  await expect(page.getByRole("status")).toContainText(
    "Các yêu cầu trước đã được ghi nhận",
  );
  await expect(page.getByRole("status")).toContainText(
    "gửi lại sau khoảng 3 phút",
  );
  await expect(page.locator(".customer-auth-error")).toHaveCount(0);
});
