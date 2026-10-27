import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ServiceCatalog } from "@/components/service-catalog";
import { StructuredData } from "@/components/structured-data";
import {
  productCatalog,
  productCategories,
  productProviders,
  type ProductCategory,
} from "@/data/product-catalog";
import { pageMetadata } from "@/lib/page-metadata";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = pageMetadata({
  title: "Catalog dịch vụ",
  description:
    "So sánh và đặt mua hosting, VPS, tên miền, email ngay tại HOSTORA.",
  keywords: ["hosting Việt Nam", "mua hosting", "tên miền", "VPS", "email doanh nghiệp", "HOSTORA"],
  path: "/services",
});

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory = productCategories.includes(
    category as ProductCategory,
  )
    ? (category as ProductCategory)
    : "all";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: absoluteSiteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Dịch vụ", item: absoluteSiteUrl("/services") },
        ],
      },
      {
        "@type": "ItemList",
        name: "Dịch vụ website tại HOSTORA",
        numberOfItems: productCatalog.length,
        itemListElement: productCatalog.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Service",
            name: product.name,
            description: product.summary,
            category: product.category,
            provider: { "@type": "Organization", name: product.provider },
            areaServed: { "@type": "Country", name: "Việt Nam" },
          },
        })),
      },
    ],
  };
  return (
    <div className="services-page">
      <StructuredData data={jsonLd} />
      <section className="services-hero">
        <div className="commerce-shell services-hero-grid">
          <div>
            <p className="commerce-kicker">CATALOG DỊCH VỤ WEBSITE</p>
            <h1>
              Chọn từ nhu cầu.
              <br />
              <em>Không chọn từ quảng cáo.</em>
            </h1>
          </div>
          <div className="services-hero-aside">
            <p>
              {productCatalog.length} dịch vụ từ {productProviders.length} nhà
              cung cấp, được HOSTORA kiểm tra và cập nhật rõ ngày.
            </p>
            <Link href="/consultation">
              Chưa biết chọn gì? Kể nhu cầu <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <div className="services-assurance">
        <div className="commerce-shell">
          <ShieldCheck size={17} />
          <p>
            Xem dịch vụ, gửi yêu cầu mua và nhận hóa đơn ngay tại HOSTORA. Giá
            “từ” là tham khảo; HOSTORA xác nhận tổng tiền và điều kiện trước khi
            bạn thanh toán.
          </p>
        </div>
      </div>
      <ServiceCatalog
        offerings={productCatalog}
        initialCategory={initialCategory}
      />
    </div>
  );
}
