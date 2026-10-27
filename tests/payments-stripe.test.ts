import { describe, expect, it } from "vitest";
import { verifiedStripeCheckout } from "@/lib/payments/stripe";

const invoice = { id: "HST-1234", amountVnd: 320000 };
const paid = {
  id: "cs_test_123", payment_status: "paid", amount_total: 320000, currency: "vnd",
  metadata: { invoiceId: invoice.id }, payment_intent: "pi_test_123",
};

describe("Stripe HOSTORA", () => {
  it("chỉ nhận Checkout đã trả đúng mã đơn và số tiền", () => {
    expect(verifiedStripeCheckout(invoice, paid)).toBe("pi_test_123");
    expect(() => verifiedStripeCheckout(invoice, { ...paid, amount_total: 320001 })).toThrow();
    expect(() => verifiedStripeCheckout(invoice, { ...paid, currency: "usd" })).toThrow();
    expect(() => verifiedStripeCheckout(invoice, { ...paid, payment_status: "unpaid" })).toThrow();
    expect(() => verifiedStripeCheckout(invoice, { ...paid, metadata: { invoiceId: "OTHER" } })).toThrow();
  });
});
