import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/customer-auth-form";
import { CustomerAuthShell } from "@/components/customer-auth-shell";
import { safeCustomerNextPath } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Tạo tài khoản khách hàng" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeCustomerNextPath((await searchParams).next);
  return <CustomerAuthShell eyebrow="BẮT ĐẦU GỌN GÀNG" title="Một tài khoản cho cả hành trình làm website." copy="Từ voucher, hóa đơn, hỗ trợ đến bản website AI — mọi thứ đi theo email của bạn."><CustomerAuthForm mode="register" nextPath={nextPath} /></CustomerAuthShell>;
}
