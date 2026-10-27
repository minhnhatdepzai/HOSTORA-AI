import Stripe from "stripe";
import type { Invoice } from "./types";

export type StripeConfig = { secretKey: string; webhookSecret: string; publicBaseUrl: string };

export function stripeConfigFromEnv(): StripeConfig | null {
  const config = {
    secretKey: process.env.HOSTORA_STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.HOSTORA_STRIPE_WEBHOOK_SECRET ?? "",
    publicBaseUrl: process.env.HOSTORA_PUBLIC_BASE_URL ?? "",
  };
  if (process.env.HOSTORA_PAYMENTS_MODE !== "sandbox" || !config.secretKey.startsWith("sk_test_") || !config.webhookSecret.startsWith("whsec_") || !config.publicBaseUrl) return null;
  try {
    const url = new URL(config.publicBaseUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return { ...config, publicBaseUrl: url.origin };
  } catch {
    return null;
  }
}

export function stripeClient(config: StripeConfig) {
  // SDK v23 uses its current API version by default; no legacy endpoint is pinned.
  return new Stripe(config.secretKey);
}

export async function createStripeCheckout(invoice: Invoice, config: StripeConfig) {
  const stripe = stripeClient(config);
  return stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: invoice.id,
    metadata: { invoiceId: invoice.id },
    payment_intent_data: { metadata: { invoiceId: invoice.id } },
    line_items: [{ price_data: {
      currency: "vnd",
      unit_amount: invoice.amountVnd,
      product_data: { name: invoice.title, description: invoice.description || undefined },
    }, quantity: 1 }],
    success_url: `${config.publicBaseUrl}/orders?payment=stripe-returned&invoiceId=${encodeURIComponent(invoice.id)}`,
    cancel_url: `${config.publicBaseUrl}/orders?payment=cancelled&invoiceId=${encodeURIComponent(invoice.id)}`,
  }, { idempotencyKey: `hostora-checkout-${invoice.id}` });
}

export type StripeCheckoutProof = {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  payment_intent: string | { id: string } | null;
};

export function verifiedStripeCheckout(invoice: Pick<Invoice, "id" | "amountVnd">, session: StripeCheckoutProof): string {
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (session.payment_status !== "paid" || session.metadata?.invoiceId !== invoice.id || session.amount_total !== invoice.amountVnd || session.currency?.toLowerCase() !== "vnd" || !intent) {
    throw new Error("Stripe chưa xác nhận đúng số tiền và hóa đơn.");
  }
  return intent;
}

export async function createStripeRefund(invoice: Invoice, config: StripeConfig) {
  if (invoice.status !== "refund_pending" || invoice.provider !== "stripe" || !invoice.providerReference) {
    throw new Error("Hóa đơn không thể hoàn qua Stripe.");
  }
  const stripe = stripeClient(config);
  const session = await stripe.checkout.sessions.retrieve(invoice.providerReference);
  const intent = verifiedStripeCheckout(invoice, session);
  if (invoice.refundReference == null) throw new Error("Chưa tạo mã yêu cầu hoàn tiền.");
  return stripe.refunds.create({
    payment_intent: intent,
    amount: invoice.amountVnd,
    metadata: { invoiceId: invoice.id, refundAttempt: invoice.refundReference },
    reason: "requested_by_customer",
  }, { idempotencyKey: invoice.refundReference });
}
