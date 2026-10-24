import type { Metadata } from "next";
import { LeadsDashboard } from "@/components/leads-dashboard";
import { PageHeading } from "@/components/page-heading";
export const metadata: Metadata = { title: "Customer leads" };
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Private lead desk"
        title="Lead ở lại trên máy của bạn."
        description="Xem và xóa khách đăng ký tư vấn; không có cloud database và không gửi PII tới model."
      />
      <LeadsDashboard />
    </div>
  );
}
