import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { WebsiteAnalyzer } from "@/components/website-analyzer";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Chấm điểm SEO và khả năng được AI đề xuất",
  description:
    "Kiểm tra SEO Google, quyền truy cập của ChatGPT và Claude, llms.txt, dữ liệu cấu trúc và nhận kế hoạch cải thiện website.",
  path: "/website-analyzer",
  keywords: [
    "phân tích SEO website",
    "AI visibility",
    "GEO",
    "AEO",
    "kiểm tra llms.txt",
  ],
});
export default function WebsiteAnalyzerPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="SEO · AEO · GEO"
        title="Kiểm tra khả năng xuất hiện trên Google và AI."
        description="Một lần kiểm tra cho biết Google có thể lập chỉ mục gì, các bot như ChatGPT hoặc Claude có được phép đọc hay không, và việc nào nên sửa trước. Điểm số không phải cam kết thứ hạng hay được đề xuất."
      />
      <WebsiteAnalyzer />
    </div>
  );
}
