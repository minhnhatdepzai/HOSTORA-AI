import type { Metadata } from "next";
import { KnowledgeCenter } from "@/components/knowledge-center";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Kiến thức hosting và website",
  description: "Giải thích hosting, tên miền, SSL, email doanh nghiệp và chi phí website bằng tiếng Việt dễ hiểu.",
  path: "/knowledge",
  keywords: ["kiến thức hosting", "hosting là gì", "tên miền là gì", "SSL website"],
});
export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Giải thích dễ hiểu"
        title="Hiểu trước khi chọn dịch vụ."
        description="Chọn một chủ đề và mức giải thích phù hợp. HOSTORA trả lời từ kho kiến thức đã kiểm tra trên máy."
      />
      <KnowledgeCenter />
    </div>
  );
}
