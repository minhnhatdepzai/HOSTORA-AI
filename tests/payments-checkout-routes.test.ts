import { beforeAll, describe, expect, it } from "vitest";
import { POST as checkout } from "@/app/api/payments/orders/[id]/checkout/route";
import { POST as confirmDemoPayment } from "@/app/api/payments/orders/[id]/demo-confirm/route";
import { POST as lookupOrder } from "@/app/api/payments/orders/route";
import { POST as refundRequest } from "@/app/api/payments/orders/[id]/refund-request/route";
import { getPaymentStore } from "@/lib/payments/store";
import { getCustomerStore } from "@/lib/customer/store";

const origin = "http://127.0.0.1:3000";

beforeAll(() => {
  delete process.env.HOSTORA_PAYMENTS_MODE;
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
});

describe("mở thanh toán và yêu cầu hoàn", () => {
  it("chặn cổng chưa cấu hình và yêu cầu hoàn khi chưa trả tiền", async () => {
    const store = getPaymentStore();
    const email = `refund-${Date.now()}@example.com`;
    const account = getCustomerStore().createCustomer({ name: "Khách hoàn tiền", email, passwordHash: "test-hash" });
    const session = getCustomerStore().createSession(account.id);
    const invoice = store.createInvoice({ title: "Thiết lập website", amountVnd: 100000, customerEmail: email });
    const context = { params: Promise.resolve({ id: invoice.id }) };
    const response = await checkout(new Request(`${origin}/api/payments/orders/${invoice.id}/checkout`, {
      method: "POST", body: JSON.stringify({ accessCode: invoice.accessCode, provider: "stripe" }),
    }), context);
    expect(response.status).toBe(503);
    const refund = await refundRequest(new Request(`${origin}/api/payments/orders/${invoice.id}/refund-request`, {
      method: "POST", headers: { authorization: `Bearer ${session.token}`, "x-hostora-client": "mobile" }, body: JSON.stringify({ accessCode: invoice.accessCode, reason: "Dịch vụ không hoạt động" }),
    }), context);
    expect(refund.status).toBe(409);
  });

  it("mở trang xác nhận nội bộ khi HOSTORA bật thanh toán mô phỏng", async () => {
    process.env.HOSTORA_PAYMENTS_MODE = "demo";
    const store = getPaymentStore();
    const invoice = store.createInvoice({ title: "Thiết lập website", amountVnd: 100000 });
    const context = { params: Promise.resolve({ id: invoice.id }) };

    const response = await checkout(new Request(`${origin}/api/payments/orders/${invoice.id}/checkout`, {
      method: "POST", body: JSON.stringify({ accessCode: invoice.accessCode, provider: "stripe" }),
    }), context);
    const result = await response.json() as { url?: string; mode?: string };

    expect(response.status).toBe(200);
    expect(result.mode).toBe("demo");
    expect(result.url).toContain(`/payments/demo?invoiceId=${invoice.id}&method=stripe#accessCode=`);
    expect(store.getInvoice(invoice.id)?.status).toBe("pending");

    const lookup = await lookupOrder(new Request(`${origin}/api/payments/orders`, {
      method: "POST", body: JSON.stringify({ id: invoice.id, accessCode: invoice.accessCode }),
    }));
    const detail = await lookup.json() as { gateways: { stripe: boolean; vnpay: boolean; mode?: string } };
    expect(detail.gateways).toEqual({ stripe: true, vnpay: true, mode: "demo" });
    delete process.env.HOSTORA_PAYMENTS_MODE;
  });

  it("chỉ xác nhận giao dịch ảo từ cùng website khi chế độ demo đang bật", async () => {
    process.env.HOSTORA_PAYMENTS_MODE = "demo";
    const store = getPaymentStore();
    const invoice = store.createInvoice({ title: "Hosting doanh nghiệp", amountVnd: 1_200_000 });
    const context = { params: Promise.resolve({ id: invoice.id }) };
    const makeRequest = () => new Request(`${origin}/api/payments/orders/${invoice.id}/demo-confirm`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ accessCode: invoice.accessCode, method: "vnpay" }),
    });

    const response = await confirmDemoPayment(makeRequest(), context);
    const result = await response.json() as { invoice: { status: string; provider: string; earnedVoucherCode: string | null } };
    expect(response.status).toBe(200);
    expect(result.invoice).toMatchObject({ status: "paid", provider: "demo" });
    expect(result.invoice.earnedVoucherCode).toMatch(/^HOSTORA-[A-F0-9]{10}$/);
    expect((await confirmDemoPayment(makeRequest(), context)).status).toBe(200);

    delete process.env.HOSTORA_PAYMENTS_MODE;
    const disabled = await confirmDemoPayment(makeRequest(), context);
    expect(disabled.status).toBe(503);
  });
});
