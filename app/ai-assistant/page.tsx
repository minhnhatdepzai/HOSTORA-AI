import type { Metadata } from "next";
import { AiAssistant } from "@/components/ai-assistant";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Tư vấn hosting bằng AI",
  description: "Hỏi HOSTORA bằng tiếng Việt về hosting, tên miền, email doanh nghiệp và chi phí trước khi gửi yêu cầu mua.",
  path: "/ai-assistant",
  keywords: ["AI tư vấn hosting", "hỏi đáp hosting", "tư vấn tên miền"],
});
export default function AiAssistantPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Hỏi HOSTORA"
        title="Hỏi về hosting, mua ngay tại đây."
        description="Tìm hiểu về hosting, tên miền và chi phí bằng tiếng Việt. HOSTORA kiểm tra dữ liệu và tiếp nhận yêu cầu mua ngay trên nền tảng."
      />
      <AiAssistant />
    </div>
  );
}
