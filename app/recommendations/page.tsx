import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { RecommendationsView } from "@/components/recommendations-view";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "So sánh gói hosting đề xuất",
  description: "So sánh giá đăng ký, kỳ thanh toán, giá gia hạn và lý do phù hợp của các gói hosting được HOSTORA đề xuất.",
  path: "/recommendations",
  keywords: ["so sánh hosting", "gói hosting tốt", "hosting phù hợp"],
});
export default function RecommendationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-14 lg:px-8">
      <PageHeading
        eyebrow="Gợi ý đã kiểm tra"
        title="Ba gói để bạn so sánh."
        description="HOSTORA xếp hạng theo nhu cầu của bạn. Giá đăng ký, kỳ thanh toán và giá gia hạn được tách riêng."
      />
      <RecommendationsView />
    </div>
  );
}
