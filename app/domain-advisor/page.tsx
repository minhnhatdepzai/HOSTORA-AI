import type { Metadata } from "next";
import { DomainAdvisor } from "@/components/domain-advisor";
import { PageHeading } from "@/components/page-heading";
export const metadata: Metadata = { title: "Cố vấn tên miền" };
export default function DomainAdvisorPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <PageHeading
        eyebrow="Domain & brand advisor"
        title="Một cái tên dễ nhớ. Không lời hứa giả."
        description="Qwen tạo biến thể và định hướng thương hiệu; HOSTORA không khẳng định tên miền còn trống nếu chưa có nguồn kiểm tra hợp lệ."
      />
      <DomainAdvisor />
    </div>
  );
}
