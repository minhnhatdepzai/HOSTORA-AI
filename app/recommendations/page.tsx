import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { RecommendationsView } from "@/components/recommendations-view";

export const metadata: Metadata = { title: "Gói đề xuất" };
export default function RecommendationsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Verified recommendation"
        title="Ba lựa chọn. Một logic rõ ràng."
        description="Xếp hạng có thể kiểm tra từ catalog chính thức; giá khuyến mại và gia hạn được hiển thị riêng."
      />
      <RecommendationsView />
    </div>
  );
}
