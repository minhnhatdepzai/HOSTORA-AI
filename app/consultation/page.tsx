import type { Metadata } from "next";
import { ConsultationWizard } from "@/components/consultation-wizard";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Chọn gói hosting phù hợp",
  description: "Trả lời vài câu hỏi để HOSTORA so sánh nhu cầu, chi phí và đề xuất gói hosting phù hợp cho website của bạn.",
  path: "/consultation",
  keywords: ["tư vấn hosting", "chọn gói hosting", "hosting cho doanh nghiệp"],
});
export default function ConsultationPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Tìm gói phù hợp"
        title="Bắt đầu từ điều bạn thật sự cần."
        description="Đi từng bước hoặc mô tả tự nhiên. Mọi câu trả lời được lưu trong trình duyệt để bạn có thể quay lại chỉnh sửa."
      />
      <ConsultationWizard />
    </div>
  );
}
