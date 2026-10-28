import type { Metadata } from "next";
import { AdminSupportQueue } from "@/components/admin-support-queue";
import { requireAdminPage } from "@/lib/admin/access";

export const metadata: Metadata = { title: "Chăm sóc khách hàng", robots: { index: false, follow: false } };
export default async function AdminSupportPage() { await requireAdminPage("/admin/support"); return <AdminSupportQueue />; }
