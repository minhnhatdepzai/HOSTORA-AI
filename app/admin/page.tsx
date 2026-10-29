import type { Metadata } from "next";
import { AdminControlCenter } from "@/components/admin-control-center";
import { hostingCatalog } from "@/data/hosting-catalog";
import { requireAdminPage } from "@/lib/admin/access";
import { getCatalogStore } from "@/lib/admin/catalog-store";

export const metadata: Metadata = {
  title: "Trung tâm quản trị",
  description: "Bảng điều hành cục bộ của HOSTORA AI.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdminPage("/admin");
  const products = getCatalogStore().listAdminProducts();
  const providers = new Set([
    ...hostingCatalog.map((plan) => plan.provider),
    ...products.map((product) => product.provider),
  ]);
  const verifiedAt = [...hostingCatalog, ...products]
    .map((item) => item.verifiedAt)
    .sort()
    .at(-1);

  return (
    <AdminControlCenter
      catalog={{
        plans: hostingCatalog.length,
        products: products.length,
        providers: providers.size,
        verifiedAt: verifiedAt ?? "2026-10-23",
        missingRenewal: hostingCatalog.filter(
          (plan) => plan.renewalMonthlyVnd == null,
        ).length,
      }}
    />
  );
}
