import { expect, test } from "@playwright/test";
import {
  ADMIN_COOKIE,
  adminConfigFromEnv,
  issueAdminEmailSession,
} from "@/lib/payments/admin-auth";

try { process.loadEnvFile(".env.local"); } catch { /* CI supplies an isolated test secret. */ }
const appUrl = process.env.HOSTORA_E2E_BASE_URL ?? "http://127.0.0.1:3000";

test.beforeEach(async ({ context }) => {
  const token = issueAdminEmailSession(adminConfigFromEnv());
  expect(token, "Cần cấu hình khóa phiên quản trị để chạy E2E").toBeTruthy();
  await context.addCookies([
    {
      name: ADMIN_COOKIE,
      value: token!,
      url: appUrl,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
});

test("dashboard hiển thị dữ liệu thật và cảnh 3D kéo được", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${appUrl}/admin`);
  await expect(page).toHaveURL(`${appUrl}/admin`);
  await expect(
    page.getByRole("heading", { name: "Doanh thu và nhịp tăng trưởng." }),
  ).toBeVisible();
  await expect(page.getByTestId("service-manager")).toBeVisible();

  const canvas = page.getByLabel("Mô hình doanh thu ba chiều, kéo để xoay");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.62, {
      steps: 8,
    });
    await page.mouse.up();
  }

  await page.screenshot({
    path: `output/playwright/admin-dashboard-viewport-${testInfo.project.name}.png`,
  });
  await page.getByTestId("service-manager").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `output/playwright/admin-services-viewport-${testInfo.project.name}.png`,
  });
  await page.getByTestId("service-manager").screenshot({
    path: `output/playwright/admin-services-${testInfo.project.name}.png`,
  });
  await page.screenshot({
    path: `output/playwright/admin-dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test("quản trị thêm, xuất bản rồi lưu trữ dịch vụ qua giao diện", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Luồng CRUD chạy một lần trên desktop");
  const suffix = Date.now().toString(36);
  const id = `e2e-care-${suffix}`;
  const name = `Chăm sóc website E2E ${suffix}`;

  await page.goto(`${appUrl}/admin#dich-vu`);
  await page.getByRole("button", { name: "Thêm dịch vụ" }).click();
  const dialog = page.getByRole("dialog", { name: "Thêm vào danh mục" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Mã dịch vụ").fill(id);
  await dialog.getByLabel("Tên dịch vụ").fill(name);
  await dialog.getByLabel("Giá từ (đồng)").fill("490000");
  await dialog
    .getByLabel("Mô tả cho khách hàng")
    .fill("Theo dõi hoạt động, sao lưu và hỗ trợ xử lý lỗi định kỳ.");
  await dialog
    .getByLabel("Phù hợp với (ngăn cách bằng dấu phẩy)")
    .fill("doanh nghiệp nhỏ, cửa hàng trực tuyến");
  await dialog
    .getByLabel("Nguồn xác minh giá")
    .fill("https://hostora.example/services/e2e-care");
  await dialog.getByLabel("Trạng thái").selectOption("published");
  await dialog.getByRole("button", { name: "Thêm dịch vụ" }).click();

  await expect(
    page.getByText("Đã thêm dịch vụ mới.", { exact: true }),
  ).toBeVisible();
  const row = page.getByRole("article").filter({ hasText: name });
  await expect(row).toBeVisible();
  const publicResponse = await page.request.get(
    `${appUrl}/api/products?q=${encodeURIComponent(name)}`,
  );
  expect(publicResponse.ok()).toBe(true);
  const publicBody = (await publicResponse.json()) as {
    products: Array<{ id: string; priceFromVnd: number }>;
  };
  expect(publicBody.products).toContainEqual(
    expect.objectContaining({ id, priceFromVnd: 490_000 }),
  );

  page.once("dialog", (confirmation) => confirmation.accept());
  await row.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(
    page.getByText("Đã lưu trữ dịch vụ; dữ liệu vẫn có thể khôi phục."),
  ).toBeVisible();
  const archivedResponse = await page.request.get(
    `${appUrl}/api/products?q=${encodeURIComponent(name)}`,
  );
  const archivedBody = (await archivedResponse.json()) as {
    products: Array<{ id: string }>;
  };
  expect(archivedBody.products).toEqual([]);
});
