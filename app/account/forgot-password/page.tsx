import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/customer-auth-form";
import { CustomerAuthShell } from "@/components/customer-auth-shell";

export const metadata: Metadata = { title: "Quên mật khẩu" };
export default function ForgotPasswordPage() {
  return <CustomerAuthShell eyebrow="KHÔI PHỤC AN TOÀN" title="Quên mật khẩu không có nghĩa là mất hành trình." copy="Liên kết đặt lại chỉ dùng được một lần và tự hết hạn sau 30 phút."><CustomerAuthForm mode="forgot" /></CustomerAuthShell>;
}
