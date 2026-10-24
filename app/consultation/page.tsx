import type { Metadata } from "next";
import { ConsultationWizard } from "@/components/consultation-wizard";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Tư vấn AI" };
export default function ConsultationPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="AI consultation"
        title="Bắt đầu từ điều bạn thật sự cần."
        description="Đi từng bước hoặc mô tả tự nhiên. Mọi câu trả lời được lưu trong trình duyệt để bạn có thể quay lại chỉnh sửa."
      />
      <ConsultationWizard />
    </div>
  );
}
