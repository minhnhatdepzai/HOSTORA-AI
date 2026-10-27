import { beforeAll, describe, expect, it } from "vitest";
import { POST as refund } from "@/app/api/admin/payments/orders/[id]/refund/route";
import { ADMIN_COOKIE, issueAdminSession } from "@/lib/payments/admin-auth";
import { getPaymentStore } from "@/lib/payments/store";

const origin = "http://127.0.0.1:3000";

beforeAll(() => {
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
  process.env.HOSTORA_PAYMENTS_MODE = "demo";
  process.env.HOSTORA_ADMIN_PASSWORD = "test-admin-password-long-enough";
  process.env.HOSTORA_ADMIN_SESSION_SECRET = "test-admin-session-secret-long-enough";
});

describe("hoàn tiền mô phỏng", () => {
  it("cho quản trị hoàn đơn demo mà không gọi Stripe hoặc VNPay", async () => {
    const store = getPaymentStore();
    const created = store.createInvoice({ title: "Hosting demo", amountVnd: 250_000 });
    store.completeDemoPayment(created.id, created.accessCode, "stripe");
    store.requestRefund(created.id, created.accessCode, "Tôi muốn đổi sang gói khác");
    const token = issueAdminSession(process.env.HOSTORA_ADMIN_PASSWORD!, {
      password: process.env.HOSTORA_ADMIN_PASSWORD!,
      secret: process.env.HOSTORA_ADMIN_SESSION_SECRET!,
    })!;
    const request = new Request(`${origin}/api/admin/payments/orders/${created.id}/refund`, {
      method: "POST",
      headers: {
        origin,
        host: "127.0.0.1:3000",
        cookie: `${ADMIN_COOKIE}=${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "approve", note: "Đã duyệt hoàn tiền mô phỏng" }),
    });

    const response = await refund(request, { params: Promise.resolve({ id: created.id }) });
    expect(response.status).toBe(200);
    expect(store.getInvoice(created.id)?.status).toBe("refunded");
    expect(store.getEvents(created.id).at(-1)?.detail).toContain("mô phỏng");
  });
});
