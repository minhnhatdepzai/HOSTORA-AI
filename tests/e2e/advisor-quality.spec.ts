import { expect, test } from "@playwright/test";
import { authenticateAdmin } from "./helpers/admin-session";

const lowBudget = { websiteType: "blog", monthlyVisits: 1000, monthlyBudget: 10000, needsDomain: false, ecommerce: false };

test("home leads directly to consultation", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Tư vấn chọn hosting", exact: true })).toBeVisible();
  await page.screenshot({ path: `output/playwright/improved-home-${testInfo.project.name}.png` });
  await page.getByRole("link", { name: "Tư vấn chọn hosting", exact: true }).click();
  await expect(page).toHaveURL(/\/consultation$/);
});

test("unaffordable options stay references on desktop and mobile", async ({ page }, testInfo) => {
  await page.addInitScript((requirements) => localStorage.setItem("hostora:requirements", JSON.stringify(requirements)), lowBudget);
  await page.goto("/recommendations");
  await expect(page.getByRole("heading", { name: "Chưa có gói đáp ứng ngân sách này" })).toBeVisible();
  await expect(page.getByText("PHÙ HỢP NHẤT", { exact: false })).toHaveCount(0);
  await expect(page.getByText("PHƯƠNG ÁN THAM KHẢO", { exact: true })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "/100" })).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: `output/playwright/improved-budget-${testInfo.project.name}.png` });
});

test("upfront limit is carried through wizard and constrains results", async ({ page }) => {
  await page.goto("/consultation");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Số tiền có thể trả ban đầu", { exact: false }).fill("100000");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Xem đề xuất", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa có gói đáp ứng ngân sách này" })).toBeVisible();
});

test("invalid contacts are rejected and damaged historical records do not hide good leads", async ({ page, context, baseURL }) => {
  await authenticateAdmin(context, baseURL!);
  await page.goto("/recommendations");
  await page.getByLabel("Họ tên", { exact: true }).fill("  ");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("+++++++++");
  await page.getByRole("button", { name: "Lưu yêu cầu tư vấn", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập họ tên" })).toBeVisible();
  await page.getByLabel("Họ tên", { exact: true }).fill("Khách kiểm tra chất lượng");
  await page.getByRole("button", { name: "Lưu yêu cầu tư vấn", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Vui lòng nhập số điện thoại" })).toBeVisible();
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0912345678");
  await page.getByRole("button", { name: "Lưu yêu cầu tư vấn", exact: true }).click();
  await expect(page.getByText("Đã lưu trên trình duyệt này.", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const leads = JSON.parse(localStorage.getItem("hostora:leads")!);
    leads.push({ ...leads[0], id: "damaged-lead", name: "" });
    localStorage.setItem("hostora:leads", JSON.stringify(leads));
  });
  await page.goto("/admin#khach-hang");
  await expect(page.getByRole("alert").filter({ hasText: "1 bản ghi chưa đọc được" })).toBeVisible();
  await expect(page.locator("#khach-hang").getByText("Khách kiểm tra chất lượng")).toBeVisible();
  await page.reload();
  await expect(page.locator("#khach-hang").getByText("Khách kiểm tra chất lượng")).toBeVisible();
});

test("customer login returns to Studio while anonymous generation stays blocked", async ({ page, baseURL }) => {
  const anonymous = await page.request.post("/api/ai/site-studio", { data: {} });
  expect(anonymous.status()).toBe(401);
  await page.goto("/website-studio");
  await expect(page).toHaveURL(/\/account\/login\?next=/);
  const registered = await page.request.post("/api/account/register", {
    headers: { origin: baseURL! },
    data: { name: "Khách kiểm thử", email: `quality-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`, password: "QualityTest!2026-NoRealAccount" },
  });
  expect(registered.status()).toBe(201);
  await page.goto("/website-studio");
  await expect(page.getByRole("heading", { name: "Mô tả ý tưởng. Nhìn thấy trang web." })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/website-studio$/);
});
