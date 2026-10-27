import type { Metadata } from "next";
import { DemoPayment } from "@/components/demo-payment";

export const metadata: Metadata = {
  title: "Thanh toán",
  robots: { index: false, follow: false },
};

export default async function DemoPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string; method?: string }>;
}) {
  const params = await searchParams;
  const invoiceId = /^HST-[A-F0-9]{12}$/.test(params.invoiceId ?? "") ? params.invoiceId! : "";
  const method = params.method === "vnpay" ? "vnpay" : "stripe";
  return <DemoPayment invoiceId={invoiceId} method={method} />;
}
