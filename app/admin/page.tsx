import type { Metadata } from "next";
import { AdminControlCenter } from "@/components/admin-control-center";
import { hostingCatalog } from "@/data/hosting-catalog";
import { productCatalog } from "@/data/product-catalog";

export const metadata: Metadata = {
  title: "Trung tâm quản trị",
  description: "Bảng điều hành cục bộ của HOSTORA AI.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const providers = new Set([
    ...hostingCatalog.map((plan) => plan.provider),
    ...productCatalog.map((product) => product.provider),
  ]);
  const verifiedAt = [...hostingCatalog, ...productCatalog]
    .map((item) => item.verifiedAt)
    .sort()
    .at(-1);

  return (
    <AdminControlCenter
      catalog={{
        plans: hostingCatalog.length,
        products: productCatalog.length,
        providers: providers.size,
        verifiedAt: verifiedAt ?? "2026-10-23",
        missingRenewal: hostingCatalog.filter(
          (plan) => plan.renewalMonthlyVnd == null,
        ).length,
      }}
    />
  );
}
