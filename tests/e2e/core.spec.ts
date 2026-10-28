import { expect, test } from "@playwright/test";
import { authenticateAdmin } from "./helpers/admin-session";
import { readFileSync } from "node:fs";

const mobileVersion = (JSON.parse(readFileSync(new URL("../../mobile/app.json", import.meta.url), "utf8")) as { expo: { version: string } }).expo.version;

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
  await expect(page.getByText("ƯU TIÊN THEO NGÂN SÁCH LƯU TRỮ")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "/100" })).toHaveCount(
    3,
  );
});

test("lead is persisted and can be deleted with confirmation", async ({
  page, context, baseURL,
}) => {
  await authenticateAdmin(context, baseURL!);
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
    page.getByRole("heading", { name: /Chọn dịch vụ cho trang web/ }),
  ).toBeVisible();
});

test("landing offers the current Android APK", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Tải ứng dụng Android" });
  await expect(link).toHaveAttribute("href", "/downloads/android");
  const response = await request.head("/downloads/android", {
    maxRedirects: 0,
  });
  if (response.status() === 307) {
    expect(response.headers().location).toBe(
      `https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v2.0.9-review-20261029-r2/HOSTORA-AI-${mobileVersion}-arm64.apk`,
    );
    return;
  }
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "android.package-archive",
  );
  expect(response.headers()["content-disposition"]).toContain(
    `HOSTORA-AI-${mobileVersion}-arm64.apk`,
  );
  expect(Number(response.headers()["content-length"])).toBeGreaterThan(
    30_000_000,
  );
});

test("AI gives customers without a website a direct path to the site studio", async ({
  page,
}) => {
  await page.goto("/ai-assistant");
  await page
    .getByLabel("Tin nhắn")
    .fill("Tôi chưa có website, mua hosting nào bây giờ?");
  await page.getByRole("button", { name: "Gửi", exact: true }).click();
  const action = page.getByRole("link", { name: "Tạo trang web ngay" });
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/account\/login\?next=/);
  await expect(
    page.getByRole("heading", { name: "Mở sổ dịch vụ" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
});
