import { expect, test } from "@playwright/test";
import { authenticateAdmin } from "./helpers/admin-session";

test("selected recommendation stays in chat, checks out, and appears in admin", async ({
  page,
  context,
  baseURL,
}) => {
  const email = `recommendation-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  // Issue the isolated admin session before the customer journey, matching the
  // post-login fixture used by the rest of the admin E2E suite. Both cookies
  // have distinct names and remain available for the final cross-surface check.
  await authenticateAdmin(context, baseURL!);
  const registered = await page.request.post("/api/account/register", {
    headers: { origin: baseURL! },
    data: {
      name: "Khách chọn từ ba gói",
      email,
      password: "Recommendation!2026-Test",
    },
  });
  expect(registered.status()).toBe(201);

  await page.addInitScript(() => {
    localStorage.setItem("hostora:consultation:completed", "true");
    localStorage.setItem(
      "hostora:requirements",
      JSON.stringify({
        websiteType: "store",
        monthlyVisits: 5_000,
        monthlyBudget: 500_000,
        needsDomain: false,
        ecommerce: true,
      }),
    );
  });

  await page.goto("/recommendations");
  const firstPlan = page.locator("article").filter({ hasText: "/100" }).first();
  const planName = (await firstPlan.locator("h2").textContent())?.trim();
  expect(planName).toBeTruthy();
  await firstPlan
    .getByRole("link", { name: "Tư vấn & thanh toán gói này" })
    .click();

  await expect(page).toHaveURL(/\/ai-assistant\?planId=/);
  await expect(page.getByLabel("Gói đang chọn")).toContainText(planName!);
  await page.getByRole("button", { name: "Thanh toán gói này" }).click();

  await expect(page).toHaveURL(/\/orders#invoiceId=/);
  await expect(page.getByRole("heading", { name: new RegExp(planName!) })).toBeVisible();
  await expect(page.getByText("Chờ thanh toán", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thanh toán với Stripe" }).click();
  await expect(page).toHaveURL(/\/payments\/demo/);
  await page.getByLabel("Tên chủ thẻ").fill("NGUYEN VAN A");
  await page.getByLabel("Số thẻ").fill("4242 4242 4242 4242");
  await page.getByLabel("Ngày hết hạn").fill("12/34");
  await page.getByLabel("CVC").fill("123");
  await page
    .getByRole("checkbox", { name: /Tôi xác nhận dùng thông tin thử nghiệm/ })
    .check();
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();
  await expect(
    page.getByRole("heading", { name: "Đơn đã được cập nhật" }),
  ).toBeVisible();

  await page.goto("/ai-assistant");
  await expect(page.getByText(new RegExp(`Đã tạo hóa đơn .*${planName}`))).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử chat" }).click();
  await expect(page.getByLabel("Các cuộc trò chuyện cũ")).toContainText(
    `Tôi chốt`,
  );

  await page.goto("/admin/orders");
  await page.getByPlaceholder("Mã đơn, email, dịch vụ, nhà cung cấp…").fill(email);
  await expect(
    page
      .getByRole("button", {
        name: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Yêu cầu mua" }).click();
  await page
    .getByPlaceholder("Khách hàng, email, doanh nghiệp, dịch vụ…")
    .fill(email);
  await expect(
    page.locator(".admin-request-card").filter({ hasText: email }).first(),
  ).toBeVisible();

  await page.goto("/admin/support");
  await expect(
    page.getByText(new RegExp(`Tôi chốt .*${planName}`)).first(),
  ).toBeVisible();
});
