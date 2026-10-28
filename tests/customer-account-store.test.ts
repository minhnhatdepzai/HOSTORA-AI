import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashCustomerPassword, verifyCustomerPassword } from "@/lib/customer/password";
import { CustomerStore } from "@/lib/customer/store";
import { PaymentStore } from "@/lib/payments/store";

const temporaryDirectories: string[] = [];
function databasePath() {
  const directory = mkdtempSync(path.join(tmpdir(), "hostora-customer-test-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "payments.sqlite");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("customer account store", () => {
  it("hashes passwords and never accepts a different password", async () => {
    const encoded = await hashCustomerPassword("Matkhau-hostora-2026");
    expect(encoded).not.toContain("Matkhau-hostora-2026");
    await expect(verifyCustomerPassword("Matkhau-hostora-2026", encoded)).resolves.toBe(true);
    await expect(verifyCustomerPassword("Matkhau-khac-2026", encoded)).resolves.toBe(false);
  });

  it("creates, expires by deletion and invalidates every session after a password reset", async () => {
    const store = new CustomerStore(databasePath());
    const account = store.createCustomer({ name: "Khách HOSTORA", email: "KHACH@example.com", passwordHash: await hashCustomerPassword("Matkhau-2026") });
    expect(() => store.createCustomer({ name: "Trùng email", email: "khach@example.com", passwordHash: "hash" })).toThrow();
    const first = store.createSession(account.id);
    const second = store.createSession(account.id);
    expect(store.findSession(first.token)?.email).toBe("khach@example.com");
    store.deleteSession(first.token);
    expect(store.findSession(first.token)).toBeNull();
    const reset = store.createPasswordReset(account.id);
    expect(store.resetPassword(reset.token, await hashCustomerPassword("Matkhau-moi-2026"))?.id).toBe(account.id);
    expect(store.findSession(second.token)).toBeNull();
    expect(store.resetPassword(reset.token, "another-hash")).toBeNull();
    store.close();
  });

  it("keeps rate limits in the store and records customer support cases", async () => {
    const store = new CustomerStore(databasePath());
    const account = store.createCustomer({ name: "Minh Anh", email: "minh@example.com", passwordHash: "hash" });
    expect(store.consumeRateLimit("login:minh@example.com", 2, 60_000)).toBe(true);
    expect(store.consumeRateLimit("login:minh@example.com", 2, 60_000)).toBe(true);
    expect(store.consumeRateLimit("login:minh@example.com", 2, 60_000)).toBe(false);
    const support = store.createSupportCase(account.id, { subject: "Không mở được hóa đơn", category: "order", message: "Tôi đã nhập đúng mã nhưng chưa mở được hóa đơn." });
    expect(support.id).toMatch(/^HTR-[A-F0-9]{10}$/);
    expect(store.listSupportCases(account.id)).toEqual([expect.objectContaining({ id: support.id, status: "new" })]);
    store.close();
  });

  it("automatically builds the voucher wallet and order ledger from the invoice email", () => {
    const filename = databasePath();
    const payments = new PaymentStore(filename);
    const customers = new CustomerStore(filename);
    const invoice = payments.createInvoice({ title: "Hosting doanh nghiệp", amountVnd: 1_200_000, customerEmail: "owner@example.com" });
    const paid = payments.markPaid(invoice.id, "stripe", "pi_wallet", 1_200_000, "vnd");
    expect(paid.earnedVoucherCode).toBeTruthy();
    expect(customers.listVouchers("OWNER@example.com")).toEqual([
      expect.objectContaining({ code: paid.earnedVoucherCode, status: "active", amountVnd: 100_000 }),
    ]);
    expect(customers.bestActiveVoucher("owner@example.com")?.code).toBe(paid.earnedVoucherCode);
    expect(customers.listOrders("owner@example.com")).toEqual([
      expect.objectContaining({ id: invoice.id, title: "Hosting doanh nghiệp", status: "paid" }),
    ]);
    expect(customers.listVouchers("someone-else@example.com")).toEqual([]);
    customers.close();
    payments.close();
  });
});
