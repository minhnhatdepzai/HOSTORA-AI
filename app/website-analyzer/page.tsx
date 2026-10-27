import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { WebsiteAnalyzer } from "@/components/website-analyzer";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Phân tích SEO và bảo mật website",
  description: "Kiểm tra tiêu đề, mô tả, khả năng lập chỉ mục, kết nối HTTPS và các tín hiệu SEO công khai của website.",
  path: "/website-analyzer",
  keywords: ["phân tích SEO website", "kiểm tra website", "audit SEO"],
});
export default function WebsiteAnalyzerPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Kiểm tra website"
        title="Xem website cần sửa gì."
        description="Kiểm tra thông tin hiển thị công khai như tiêu đề, mô tả và bảo mật kết nối. Kết quả không đánh giá cấu hình máy chủ bên trong."
      />
      <WebsiteAnalyzer />
    </div>
  );
}
