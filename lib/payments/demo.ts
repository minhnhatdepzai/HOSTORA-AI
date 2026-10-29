import type { PaymentMethod } from "./types";

export type PaymentsMode = "demo" | "sandbox" | "disabled";

export function paymentsMode(): PaymentsMode {
  const value = process.env.HOSTORA_PAYMENTS_MODE;
  if (value === "demo" || value === "sandbox") return value;
  return "disabled";
}

export function demoPaymentsEnabled() {
  return paymentsMode() === "demo";
}

export function demoCheckoutPath(invoiceId: string, accessCode: string, method: PaymentMethod) {
  const query = new URLSearchParams({ invoiceId, method });
  const fragment = new URLSearchParams({ accessCode });
  return `/payments/demo?${query.toString()}#${fragment.toString()}`;
}
