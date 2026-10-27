import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  redirect("/admin");
}
