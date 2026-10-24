import type { Metadata } from "next";
import { KnowledgeCenter } from "@/components/knowledge-center";
import { PageHeading } from "@/components/page-heading";
export const metadata: Metadata = { title: "Trung tâm kiến thức" };
export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="AI knowledge center"
        title="Hiểu hạ tầng theo cách của bạn."
        description="Cùng một khái niệm, ba mức giải thích; nội dung được grounding từ kho kiến thức local."
      />
      <KnowledgeCenter />
    </div>
  );
}
