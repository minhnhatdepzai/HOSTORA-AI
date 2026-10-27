import type { Metadata } from "next";
import { IntelligenceSuite } from "@/components/intelligence-suite";
import { PageHeading } from "@/components/page-heading";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = pageMetadata({
  title: "Tính chi phí website và hosting",
  description: "Mô phỏng chi phí hosting theo kỳ, dịch vụ bổ sung và quy mô truy cập trước khi mua.",
  path: "/intelligence",
  keywords: ["chi phí hosting", "giá làm website", "tính chi phí website"],
});
export default function IntelligencePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Chi phí và tăng trưởng"
        title="Biết tổng chi phí trước khi chọn."
        description="Thay đổi kỳ thanh toán, dịch vụ thêm và lượng khách dự kiến để xem chi phí và những điều cần chuẩn bị."
      />
      <IntelligenceSuite />
    </div>
  );
}
