import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/customer-auth-form";
import { CustomerAuthShell } from "@/components/customer-auth-shell";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <CustomerAuthShell eyebrow="MỘT BƯỚC NỮA" title="Đặt lại chìa khóa cho sổ dịch vụ của bạn." copy="Sau khi đổi mật khẩu, các phiên đăng nhập cũ sẽ không còn sử dụng được."><CustomerAuthForm mode="reset" resetToken={token} /></CustomerAuthShell>;
}
