import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/customer-auth-form";
import { CustomerAuthShell } from "@/components/customer-auth-shell";
import { safeCustomerNextPath } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Đăng nhập tài khoản" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeCustomerNextPath((await searchParams).next);
  return <CustomerAuthShell eyebrow="QUAY LẠI SỔ DỊCH VỤ" title="Những gì bạn đã mua không nên bị thất lạc." copy="Đăng nhập bằng email nhận hóa đơn để tiếp tục đúng nơi bạn đã dừng."><CustomerAuthForm mode="login" nextPath={nextPath} /></CustomerAuthShell>;
}
