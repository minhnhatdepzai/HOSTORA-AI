import type { Metadata } from "next";
import { IntelligenceSuite } from "@/components/intelligence-suite";
import { PageHeading } from "@/components/page-heading";
export const metadata: Metadata = { title: "Mô phỏng & chi phí" };
export default function IntelligencePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Business intelligence"
        title="Nhìn xa hơn giá tháng đầu."
        description="Mọi phép tính nằm trong code; AI chỉ có vai trò giải thích trade-off và kịch bản."
      />
      <IntelligenceSuite />
    </div>
  );
}
