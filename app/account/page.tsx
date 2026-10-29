import type { Metadata } from "next";
import { CustomerAccountPortal } from "@/components/customer-account-portal";
import { requireCustomerPage } from "@/lib/customer/access";

export const metadata: Metadata = { title: "Sổ dịch vụ của bạn", robots: { index: false, follow: false } };
export default async function AccountPage() {
  const customer = await requireCustomerPage("/account");
  return <CustomerAccountPortal initialCustomer={customer} />;
}
