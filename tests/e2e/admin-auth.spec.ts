import { expect, test } from "@playwright/test";

for (const path of ["/admin", "/admin/orders"]) {
  test(`${path} yêu cầu mã email trước khi hiển thị dữ liệu`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
    await expect(page.getByRole("heading", { name: "Đăng nhập quản trị" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gửi mã qua email/ })).toBeVisible();
    if (path === "/admin") {
      await page.screenshot({
        path: `output/playwright/admin-login-${testInfo.project.name}.png`,
      });
    }
  });
}
