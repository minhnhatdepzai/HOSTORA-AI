import type { PaymentMethod } from "./types";

export function demoPaymentsEnabled() {
  return process.env.HOSTORA_PAYMENTS_MODE === "demo";
}

export function demoCheckoutPath(invoiceId: string, accessCode: string, method: PaymentMethod) {
  const query = new URLSearchParams({ invoiceId, method });
  const fragment = new URLSearchParams({ accessCode });
  return `/payments/demo?${query.toString()}#${fragment.toString()}`;
}
