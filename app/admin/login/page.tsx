import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin-login";
import { readAdminSessionCookie } from "@/lib/admin/access";
import { safeAdminNextPath } from "@/lib/payments/admin-auth";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const nextPath = safeAdminNextPath((await searchParams).next);
  if (await readAdminSessionCookie()) redirect(nextPath);
  return <AdminLogin nextPath={nextPath} />;
}
