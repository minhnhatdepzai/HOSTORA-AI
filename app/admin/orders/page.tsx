import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin-orders";
import { requireAdminPage } from "@/lib/admin/access";

export const metadata: Metadata = { title: "Quản trị đơn hàng", robots: { index: false, follow: false } };
export default async function AdminOrdersPage() {
  await requireAdminPage("/admin/orders");
  return <AdminOrders />;
}
