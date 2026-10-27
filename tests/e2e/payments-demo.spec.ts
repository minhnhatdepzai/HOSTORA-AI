import { expect, test } from "@playwright/test";
import { PaymentStore } from "@/lib/payments/store";

test("khách xác nhận thanh toán kiểm thử mà không bị hiểu là tiền thật", async ({ page }) => {
  const store = new PaymentStore();
  const invoice = store.createInvoice({
    title: "Hosting doanh nghiệp 12 tháng",
    description: "Kiểm thử luồng thanh toán HOSTORA",
    amountVnd: 1_200_000,
    customerEmail: "payment-demo@example.com",
  });
  store.close();

  await page.goto(`/payments/demo?invoiceId=${invoice.id}&method=vnpay#accessCode=${invoice.accessCode}`);
  await expect(page.getByText("MÔI TRƯỜNG KIỂM THỬ · KHÔNG THU TIỀN")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xác nhận thanh toán VNPay" })).toBeVisible();
  await expect(page.getByText("1.200.000 ₫")).toBeVisible();

  await page.getByRole("button", { name: "Vietcombank" }).click();
  await page.getByLabel("Mã khách hàng").fill("HOSTORA-THU");
  await page.getByLabel("Mã OTP").fill("000000");
  await page.getByRole("checkbox", { name: /Tôi xác nhận dùng thông tin thử nghiệm/ }).check();
  await page.getByRole("button", { name: "Xác nhận thanh toán" }).click();

  await expect(page.getByRole("heading", { name: "Đơn đã được cập nhật" })).toBeVisible();
  await expect(page.getByText(/Voucher HOSTORA-/)).toBeVisible();
  await expect(page.getByText(/không có tiền thật được thu/i)).toBeVisible();
});

test("giao diện Stripe yêu cầu thông tin thẻ demo trước khi xác nhận", async ({ page }, testInfo) => {
  const store = new PaymentStore();
  const invoice = store.createInvoice({ title: "Tên miền và SSL", amountVnd: 350_000 });
  store.close();

  await page.goto(`/payments/demo?invoiceId=${invoice.id}&method=stripe#accessCode=${invoice.accessCode}`);
  await expect(page.getByText("THẺ THANH TOÁN")).toBeVisible();
  if (testInfo.project.name === "chromium-mobile") {
    await expect(page.getByRole("navigation", { name: "Điều hướng nhanh trên điện thoại" })).toBeHidden();
  }
  const confirm = page.getByRole("button", { name: "Xác nhận thanh toán" });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByText("Kiểm tra lại thông tin thẻ", { exact: false })).toBeVisible();
  await page.getByLabel("Tên chủ thẻ").fill("NGUYEN VAN A");
  await page.getByLabel("Số thẻ").fill("4242 4242 4242 4242");
  await page.getByLabel("Ngày hết hạn").fill("12/34");
  await page.getByLabel("CVC").fill("123");
  await page.getByRole("checkbox", { name: /Tôi xác nhận dùng thông tin thử nghiệm/ }).check();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("heading", { name: "Đơn đã được cập nhật" })).toBeVisible();
});
