import type { Metadata } from "next";
import { ReadinessLab } from "@/components/readiness-lab";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Kiểm tra website trước khi ra mắt",
  description: "Kiểm tra tên miền, nội dung, vận hành và những việc cần hoàn thiện trước khi đưa website đến khách hàng.",
  path: "/readiness",
  keywords: ["checklist ra mắt website", "kiểm tra website", "website sẵn sàng"],
});

export default function ReadinessPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Chuẩn bị ra mắt"
        title="Website đã sẵn sàng chưa?"
        description="Kiểm tra tên miền, nội dung và việc vận hành. Điểm được tính theo tiêu chí cố định; trợ lý giúp bạn hiểu việc cần làm tiếp."
      />
      <ReadinessLab />
    </div>
  );
}
