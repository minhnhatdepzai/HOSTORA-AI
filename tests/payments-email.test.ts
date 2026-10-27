import { afterEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: "test" }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMailMock }) },
}));

import { emailConfigFromEnv, emailStatusFromEnv, notifyInvoiceCreated, notifySaleRequestCreated } from "@/lib/payments/email";
import type { CreatedInvoice, CreatedSaleRequest } from "@/lib/payments/types";

const keys = [
  "HOSTORA_SMTP_HOST",
  "HOSTORA_SMTP_PORT",
  "HOSTORA_SMTP_SECURE",
  "HOSTORA_SMTP_USER",
  "HOSTORA_SMTP_PASSWORD",
  "HOSTORA_EMAIL_FROM",
  "HOSTORA_ORDER_NOTIFICATION_EMAIL",
  "HOSTORA_EMAIL_REPLY_TO",
  "HOSTORA_PUBLIC_BASE_URL",
] as const;

afterEach(() => {
  for (const key of keys) delete process.env[key];
  sendMailMock.mockClear();
});

function configureEmail() {
  process.env.HOSTORA_SMTP_HOST = "smtp.example.com";
  process.env.HOSTORA_SMTP_PORT = "465";
  process.env.HOSTORA_SMTP_SECURE = "true";
  process.env.HOSTORA_SMTP_USER = "orders@example.com";
  process.env.HOSTORA_SMTP_PASSWORD = "app-password";
  process.env.HOSTORA_EMAIL_FROM = "HOSTORA <orders@example.com>";
  process.env.HOSTORA_ORDER_NOTIFICATION_EMAIL = "owner@example.com";
  process.env.HOSTORA_PUBLIC_BASE_URL = "https://hostora.example";
}

describe("email đơn hàng HOSTORA", () => {
  it("tắt an toàn khi thiếu cấu hình SMTP", () => {
    expect(emailConfigFromEnv()).toBeNull();
    expect(emailStatusFromEnv()).toEqual({ configured: false, adminRecipientConfigured: false, mode: "disabled" });
  });

  it("chỉ nhận cấu hình SMTP đầy đủ và không lộ mật khẩu trong trạng thái", () => {
    configureEmail();
    expect(emailConfigFromEnv()).toMatchObject({ host: "smtp.example.com", port: 465, secure: true, adminTo: "owner@example.com" });
    expect(emailStatusFromEnv()).toEqual({ configured: true, adminRecipientConfigured: true, mode: "smtp" });
    expect(emailStatusFromEnv()).not.toHaveProperty("password");
  });

  it("gửi email hồ sơ chuyên nghiệp có nút theo dõi, hủy và đủ dữ liệu doanh nghiệp", async () => {
    configureEmail();
    const request: CreatedSaleRequest = {
      id: "HSR-ABCDEF1234",
      accessCode: "private-request-access-code",
      productId: "hosting-demo",
      provider: "HOSTORA",
      productName: "Hosting doanh nghiệp",
      contact: "customer@example.com",
      note: "Cần chuyển website trong tháng này",
      profile: {
        customerName: "Nguyễn Minh Anh",
        phone: "0901234567",
        companyName: "Công ty Minh Anh",
        businessType: "Thời trang",
        currentWebsite: "minhanh.example",
        mainOffer: "Thời trang công sở nữ",
        serviceArea: "TP.HCM và toàn quốc",
        seoGoals: "váy công sở, thời trang nữ",
        websiteStatus: "migrating",
        websiteGoal: "Bán hàng và nhận tư vấn trực tuyến",
        targetCustomers: "Khách nữ 20 đến 35 tuổi",
        estimatedTraffic: "10k_50k",
        budgetRange: "1m_3m",
      },
      consultationPreference: "scheduled",
      consultationAt: "2026-11-01T02:00:00.000Z",
      consultationChannel: "video",
      voucherCode: null,
      cancelReason: null,
      status: "new",
      invoiceId: null,
      createdAt: "2026-10-27T05:00:00.000Z",
    };
    await notifySaleRequestCreated(request);
    const messages = sendMailMock.mock.calls.map(([message]) => message as { to: string; html: string; text: string });
    expect(messages).toHaveLength(2);
    const customer = messages.find((message) => message.to === request.contact)!;
    const admin = messages.find((message) => message.to === "owner@example.com")!;
    expect(customer.html).toContain("Hủy yêu cầu");
    expect(customer.html).toContain("#requestId=");
    expect(customer.html).toContain("Khách hàng mục tiêu");
    expect(customer.html).toContain("Thời trang công sở nữ");
    expect(admin.html).toContain("váy công sở, thời trang nữ");
    expect(admin.html).toContain("10.000–50.000 lượt/tháng");
    expect(admin.html).toContain("Cuộc gọi video");
    expect(JSON.stringify(messages)).not.toContain("app-password");
  });

  it("email hóa đơn hiển thị giảm giá, nút thanh toán/hủy và quà voucher", async () => {
    configureEmail();
    const invoice: CreatedInvoice = {
      id: "HST-ABCDEF123456",
      accessCode: "private-invoice-access-code",
      customerEmail: "customer@example.com",
      title: "Gói HOSTORA Business",
      description: "Dịch vụ 12 tháng",
      amountVnd: 1_100_000,
      subtotalVnd: 1_200_000,
      discountVnd: 100_000,
      voucherCode: "HOSTORA-OLD123456",
      earnedVoucherCode: null,
      earnedVoucherAmountVnd: null,
      earnedVoucherExpiresAt: null,
      saleType: "hostora_service",
      partnerProvider: null,
      status: "pending",
      provider: null,
      providerReference: null,
      gatewayCreateDate: null,
      gatewayPaymentDate: null,
      gatewayTransactionNo: null,
      refundReference: null,
      refundReason: null,
      createdAt: "2026-10-27T05:00:00.000Z",
      updatedAt: "2026-10-27T05:00:00.000Z",
    };
    await notifyInvoiceCreated(invoice);
    const customer = sendMailMock.mock.calls.map(([message]) => message as { to: string; html: string }).find((message) => message.to === invoice.customerEmail)!;
    expect(customer.html).toContain("Xem và thanh toán");
    expect(customer.html).toContain("Hủy trước thanh toán");
    expect(customer.html).toContain("Voucher");
    expect(customer.html).toContain("Quà cho đơn từ 1 triệu");
    expect(customer.html).toContain("#invoiceId=");
  });
});
