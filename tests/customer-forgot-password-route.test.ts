import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, expect, test } from "vitest";
import { POST } from "@/app/api/account/forgot-password/route";
import { getCustomerStore } from "@/lib/customer/store";
import { getPaymentStore } from "@/lib/payments/store";

const testDirectory = mkdtempSync(
  path.join(tmpdir(), "hostora-forgot-password-"),
);
const databaseFile = path.join(testDirectory, "payments.sqlite");
process.env.HOSTORA_PAYMENTS_DB_PATH = databaseFile;

const genericMessage =
  "Nếu email khớp tài khoản hoặc giao dịch HOSTORA, liên kết đặt lại sẽ được gửi trong ít phút.";

const forgot = (email: string) =>
  POST(
    new Request("http://127.0.0.1:3000/api/account/forgot-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hostora-client": "mobile",
      },
      body: JSON.stringify({ email }),
    }),
  );

const databaseCounts = (email: string) => {
  const database = new DatabaseSync(databaseFile, { readOnly: true });
  const account = database
    .prepare(
      `SELECT id, name, password_hash
       FROM customer_accounts
       WHERE email = ?`,
    )
    .get(email) as
    | { id: string; name: string; password_hash: string }
    | undefined;
  const resets = account
    ? (database
        .prepare(
          `SELECT COUNT(*) AS count
           FROM customer_password_resets
           WHERE customer_id = ? AND used_at IS NULL`,
        )
        .get(account.id) as { count: number }).count
    : 0;
  database.close();
  return { account, resets };
};

afterAll(() => {
  getCustomerStore().close();
  getPaymentStore().close();
  rmSync(testDirectory, { recursive: true, force: true });
});

test("provisions a recoverable account for a sale-request email", async () => {
  const email = `request-${crypto.randomUUID()}@example.com`;
  getPaymentStore().createSaleRequest({
    productId: "hosting-recovery-test",
    provider: "HOSTORA",
    productName: "Hosting kiểm thử khôi phục",
    contact: email,
    profile: {
      customerName: "Khách nhận hóa đơn",
      phone: "0900000000",
      companyName: "",
      businessType: "Dịch vụ",
      currentWebsite: "",
      mainOffer: "Tư vấn website",
      serviceArea: "Việt Nam",
      seoGoals: "",
      websiteStatus: "idea",
      websiteGoal: "Tạo website giới thiệu dịch vụ",
      targetCustomers: "Doanh nghiệp nhỏ",
      estimatedTraffic: "under_1k",
      budgetRange: "under_500k",
    },
    consultationPreference: "ai",
    consultationChannel: "email",
  });

  const response = await forgot(email);

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    message: genericMessage,
  });
  const stored = databaseCounts(email);
  expect(stored.account).toMatchObject({ name: "Khách nhận hóa đơn" });
  expect(stored.account?.password_hash).toMatch(/^scrypt\$/);
  expect(stored.resets).toBe(1);
});

test("provisions a recoverable account for an invoice-only email", async () => {
  const email = `invoice-${crypto.randomUUID()}@example.com`;
  getPaymentStore().createInvoice({
    title: "Hóa đơn kiểm thử khôi phục",
    amountVnd: 500_000,
    customerEmail: email,
  });

  const response = await forgot(email);

  expect(response.status).toBe(200);
  expect((await response.json()).message).toBe(genericMessage);
  expect(databaseCounts(email)).toMatchObject({
    account: { name: "Khách hàng HOSTORA" },
    resets: 1,
  });
});

test("keeps the same generic response and creates nothing for an unknown email", async () => {
  const email = `unknown-${crypto.randomUUID()}@example.com`;

  const response = await forgot(email);

  expect(response.status).toBe(200);
  expect((await response.json()).message).toBe(genericMessage);
  expect(databaseCounts(email)).toEqual({ account: undefined, resets: 0 });
});

test("continues to create a reset for an existing account without changing its password", async () => {
  const email = `existing-${crypto.randomUUID()}@example.com`;
  getCustomerStore().createCustomer({
    name: "Khách đã đăng ký",
    email,
    passwordHash: "existing-password-hash",
  });

  const response = await forgot(email);

  expect(response.status).toBe(200);
  expect((await response.json()).message).toBe(genericMessage);
  expect(databaseCounts(email)).toMatchObject({
    account: {
      name: "Khách đã đăng ký",
      password_hash: "existing-password-hash",
    },
    resets: 1,
  });
});
