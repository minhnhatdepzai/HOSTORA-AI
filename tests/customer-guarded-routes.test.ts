import { beforeAll, describe, expect, it } from "vitest";
import { POST as createStudioWebsite } from "@/app/api/ai/site-studio/route";
import { POST as requestRefund } from "@/app/api/payments/orders/[id]/refund-request/route";
import { getCustomerStore } from "@/lib/customer/store";
import { getPaymentStore } from "@/lib/payments/store";

const origin = "http://127.0.0.1:3000";
const mobileRequest = (path: string, body: unknown, token = "") =>
  new Request(`${origin}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hostora-client": "mobile",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

beforeAll(() => {
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
});

describe("guarded customer flows", () => {
  it("blocks anonymous website generation before parsing or running AI", async () => {
    const response = await createStudioWebsite(
      mobileRequest("/api/ai/site-studio", { intentionally: "invalid" }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Bạn cần đăng nhập để tạo website với AI.",
    });
  });

  it("requires both login and matching invoice ownership for refunds", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ownerEmail = `owner-${suffix}@example.com`;
    const other = getCustomerStore().createCustomer({
      name: "Tài khoản khác",
      email: `other-${suffix}@example.com`,
      passwordHash: "hash",
    });
    const otherSession = getCustomerStore().createSession(other.id);
    const invoice = getPaymentStore().createInvoice({
      title: "Gói cần bảo vệ",
      amountVnd: 1_000_000,
      customerEmail: ownerEmail,
    });
    getPaymentStore().markPaid(invoice.id, "stripe", `pi_${suffix}`, 1_000_000, "vnd");
    const context = { params: Promise.resolve({ id: invoice.id }) };
    const body = { accessCode: invoice.accessCode, reason: "Dịch vụ không còn phù hợp" };

    expect(
      (await requestRefund(mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body), context)).status,
    ).toBe(401);
    expect(
      (await requestRefund(mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body, otherSession.token), context)).status,
    ).toBe(403);

    const owner = getCustomerStore().createCustomer({ name: "Chủ hóa đơn", email: ownerEmail, passwordHash: "hash" });
    const ownerSession = getCustomerStore().createSession(owner.id);
    const accepted = await requestRefund(
      mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body, ownerSession.token),
      context,
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).invoice.status).toBe("refund_requested");
  });
});
