import type { Metadata } from "next";
import { OrderPortal } from "@/components/order-portal";

export const metadata: Metadata = { title: "Đơn hàng và thanh toán", robots: { index: false, follow: false } };

export default function OrdersPage() { return <OrderPortal />; }
