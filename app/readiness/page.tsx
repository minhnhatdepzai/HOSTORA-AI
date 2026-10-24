import type { Metadata } from "next";
import { ReadinessLab } from "@/components/readiness-lab";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = { title: "Launch Score AI" };

export default function ReadinessPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="AI launch readiness"
        title="Chấm hồ sơ website như chấm một bản CV."
        description="HOSTORA kết hợp checklist tất định, catalog có nguồn và Ollama local để chỉ ra dự án đã sẵn sàng tới đâu."
      />
      <ReadinessLab />
    </div>
  );
}
