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
    const detailed = store.consumeRateLimitDetailed("register:minh@example.com", 1, 60_000);
    expect(detailed).toMatchObject({ allowed: true, attempts: 1, remaining: 0 });
    expect(store.consumeRateLimitDetailed("register:minh@example.com", 1, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: expect.any(Number),
    });
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

  it("persists AI memory, isolates chat and sources by account, then clears only the requested scope", () => {
    const filename = databasePath();
    let store = new CustomerStore(filename);
    const first = store.createCustomer({
      name: "Chủ thứ nhất",
      email: "first@example.com",
      passwordHash: "hash",
    });
    const second = store.createCustomer({
      name: "Chủ thứ hai",
      email: "second@example.com",
      passwordHash: "hash",
    });
    const conversationId = crypto.randomUUID();
    store.saveAiMemory(first.id, {
      facts: { websiteType: "store", monthlyBudget: 300_000 },
    });
    store.appendChatMessage({
      customerId: first.id,
      conversationId,
      role: "user",
      content: "Tôi cần web bán hàng",
    });
    const source = store.createAiSource(first.id, {
      title: "Giới thiệu doanh nghiệp",
      kind: "text",
      content: "Doanh nghiệp bán đồ gốm thủ công tại Việt Nam.",
    });
    store.saveStudioPreferences(first.id, {
      style: "warm",
      color: "#935f3d",
      revisionHint: "Viết ngắn và bớt lặp ý.",
      needsWorkReason: "copy",
    });
    store.close();

    store = new CustomerStore(filename);
    expect(store.getAiMemory(first.id)).toMatchObject({
      facts: { websiteType: "store", monthlyBudget: 300_000 },
    });
    expect(store.latestConversationId(first.id)).toBe(conversationId);
    expect(store.listChatMessages(first.id, conversationId)).toHaveLength(1);
    expect(store.listChatMessages(second.id, conversationId)).toEqual([]);
    expect(store.listAiSources(first.id)).toEqual([
      expect.objectContaining({ id: source.id, title: "Giới thiệu doanh nghiệp" }),
    ]);
    expect(store.listAiSources(second.id)).toEqual([]);
    expect(store.getStudioPreferences(first.id)).toMatchObject({
      style: "warm",
      color: "#935f3d",
      revisionHints: ["Viết ngắn và bớt lặp ý."],
      needsWorkReasons: ["copy"],
    });

    store.clearAiHistory(first.id, false);
    expect(store.listChatMessages(first.id, conversationId)).toEqual([]);
    expect(store.getAiMemory(first.id)).not.toBeNull();
    store.clearAiHistory(first.id, true);
    expect(store.getAiMemory(first.id)).toBeNull();
    expect(store.deleteAiSource(second.id, source.id)).toBe(false);
    expect(store.deleteAiSource(first.id, source.id)).toBe(true);
    store.close();
  });
});
