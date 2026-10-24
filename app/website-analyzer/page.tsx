import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { WebsiteAnalyzer } from "@/components/website-analyzer";
export const metadata: Metadata = { title: "Phân tích website" };
export default function WebsiteAnalyzerPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Public website analyzer"
        title="Kiểm tra đúng thứ nhìn thấy được."
        description="Đánh giá metadata client công khai với lớp chống SSRF; không suy đoán cấu hình máy chủ hoặc traffic thật."
      />
      <WebsiteAnalyzer />
    </div>
  );
}
