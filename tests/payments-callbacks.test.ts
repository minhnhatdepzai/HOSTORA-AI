import { createHmac } from "node:crypto";
import Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as stripeWebhook } from "@/app/api/payments/stripe/webhook/route";
import { GET as vnpayIpn } from "@/app/api/payments/vnpay/ipn/route";
import { getPaymentStore } from "@/lib/payments/store";

const origin = "http://127.0.0.1:3000";

beforeAll(() => {
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
  process.env.HOSTORA_PAYMENTS_MODE = "sandbox";
  process.env.HOSTORA_PUBLIC_BASE_URL = origin;
  process.env.HOSTORA_STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.HOSTORA_STRIPE_WEBHOOK_SECRET = "whsec_fixture";
  process.env.HOSTORA_VNPAY_TMN_CODE = "HOSTORATEST";
  process.env.HOSTORA_VNPAY_HASH_SECRET = "test-secret-for-local-signature";
  process.env.HOSTORA_VNPAY_RETURN_URL = "https://hostora.example/api/payments/vnpay/return";
});

function stripeRequest(event: object, secret = "whsec_fixture") {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request(`${origin}/api/payments/stripe/webhook`, { method: "POST", headers: { "stripe-signature": signature }, body: payload });
}

function vnpayRequest(input: Record<string, string>) {
  const params: Record<string, string> = { vnp_TmnCode: "HOSTORATEST", ...input };
  const canonical = Object.keys(params).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
  const hash = createHmac("sha512", "test-secret-for-local-signature").update(canonical).digest("hex");
  return new Request(`${origin}/api/payments/vnpay/ipn?${canonical}&vnp_SecureHash=${hash}`);
}

describe("gateway callbacks", () => {
  it("Stripe rejects an oversized raw webhook before signature verification", async () => {
    const response = await stripeWebhook(
      new Request(`${origin}/api/payments/stripe/webhook`, {
        method: "POST",
        headers: {
          "content-length": "1048577",
          "stripe-signature": "fixture",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
  });

  it("Stripe requires signed exact Checkout and deduplicates replay", async () => {
    const store = getPaymentStore();
    const invoice = store.createInvoice({ title: "Thiết lập website", amountVnd: 250000 });
    store.beginPayment(invoice.id, "stripe");
    store.setCheckoutReference(invoice.id, "cs_test_fixture");
    const event = { id: "evt_test_1", object: "event", type: "checkout.session.completed", data: { object: {
      id: "cs_test_fixture", object: "checkout.session", payment_status: "paid", amount_total: 250000,
      currency: "vnd", metadata: { invoiceId: invoice.id }, payment_intent: "pi_test_fixture",
    } } };
    expect((await stripeWebhook(stripeRequest(event, "wrong"))).status).toBe(400);
    expect(store.getInvoice(invoice.id)?.status).toBe("pending");
    expect((await stripeWebhook(stripeRequest({ ...event, data: { object: { ...event.data.object, amount_total: 250001 } } }))).status).toBe(409);
    expect((await stripeWebhook(stripeRequest(event))).status).toBe(200);
    expect((await stripeWebhook(stripeRequest(event))).status).toBe(200);
    expect(store.getInvoice(invoice.id)?.status).toBe("paid");
    expect(store.getEvents(invoice.id).filter((item) => item.type === "paid")).toHaveLength(1);
  });

  it("VNPay requires signed successful IPN and exact amount", async () => {
    const store = getPaymentStore();
    const invoice = store.createInvoice({ title: "Dịch vụ cấu hình", amountVnd: 190000 });
    store.beginPayment(invoice.id, "vnpay");
    store.setCheckoutReference(invoice.id, invoice.id, "20261026140000");
    const params = { vnp_TxnRef: invoice.id, vnp_Amount: "19000000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_PayDate: "20261026143000", vnp_TransactionNo: "123456" };
    const wrongAmount = await vnpayIpn(vnpayRequest({ ...params, vnp_Amount: "19000100" }));
    expect((await wrongAmount.json()).RspCode).toBe("97");
    const failed = await vnpayIpn(vnpayRequest({ ...params, vnp_ResponseCode: "24", vnp_TransactionStatus: "02" }));
    expect((await failed.json()).RspCode).toBe("00");
    expect(store.getInvoice(invoice.id)?.status).toBe("pending");
    expect((await (await vnpayIpn(vnpayRequest(params))).json()).RspCode).toBe("00");
    expect((await (await vnpayIpn(vnpayRequest(params))).json()).RspCode).toBe("02");
    expect(store.getInvoice(invoice.id)?.gatewayTransactionNo).toBe("123456");
    expect(store.getEvents(invoice.id).filter((item) => item.type === "paid")).toHaveLength(1);
  });
});
