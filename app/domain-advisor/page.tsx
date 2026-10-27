import type { Metadata } from "next";
import { DomainAdvisor } from "@/components/domain-advisor";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Gợi ý tên miền cho doanh nghiệp",
  description: "Tạo ý tưởng tên miền dễ nhớ theo thương hiệu và mục tiêu website; HOSTORA xác minh trước khi phát hành hóa đơn.",
  path: "/domain-advisor",
  keywords: ["gợi ý tên miền", "tên miền doanh nghiệp", "chọn tên miền đẹp"],
});
export default function DomainAdvisorPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Ý tưởng tên miền"
        title="Tìm một cái tên dễ nhớ."
        description="Nhập tên thương hiệu để nhận gợi ý. HOSTORA sẽ xác minh tình trạng tên miền trước khi tạo hóa đơn đăng ký."
      />
      <DomainAdvisor />
    </div>
  );
}
