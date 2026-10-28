import type { Metadata } from "next";
import { WebsiteStudio } from "@/components/website-studio";
import { pageMetadata } from "@/lib/page-metadata";
import { requireCustomerPage } from "@/lib/customer/access";

export const metadata: Metadata = pageMetadata({
  title: "Tạo website với AI",
  description:
    "Mô tả doanh nghiệp, chọn phong cách và xem bản demo website tương tác trước khi tải mã nguồn và chọn hosting.",
  path: "/website-studio",
  keywords: ["tạo website AI", "thiết kế website bằng AI", "website doanh nghiệp"],
});

export default async function WebsiteStudioPage() {
  await requireCustomerPage("/website-studio");
  return <WebsiteStudio />;
}
