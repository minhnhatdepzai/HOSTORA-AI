import { expect, test } from "@playwright/test";

test("wizard produces three recommendations", async ({ page }) => {
  await page.goto("/consultation");
  await expect(
    page.getByRole("heading", { name: /Bắt đầu từ điều/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Bán hàng/ }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Xem đề xuất" }).click();
  await expect(page).toHaveURL(/recommendations/);
  await expect(page.getByText("PHÙ HỢP NHẤT")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "/100" })).toHaveCount(
    3,
  );
});

test("lead is persisted and can be deleted with confirmation", async ({
  page,
}) => {
  await page.goto("/recommendations");
  await page.getByLabel("Họ tên").fill("Nguyễn Minh");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByRole("button", { name: "Lưu yêu cầu tư vấn" }).click();
  await page.goto("/dashboard");
  await expect(page.getByText("Nguyễn Minh")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xóa Nguyễn Minh" }).click();
  await expect(page.getByText("Nguyễn Minh")).toHaveCount(0);
});

test("landing works on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  await expect(
    page.getByRole("heading", { name: /Hạ tầng đúng/ }),
  ).toBeVisible();
});

test("landing exposes a directly downloadable Android APK", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Tải app Android 1.4.0" });
  await expect(link).toHaveAttribute("href", "/downloads/android");
  const response = await request.head("/downloads/android");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "android.package-archive",
  );
  expect(response.headers()["content-disposition"]).toContain(
    "HOSTORA-AI-1.4.0.apk",
  );
  expect(Number(response.headers()["content-length"])).toBeGreaterThan(
    30_000_000,
  );
});
