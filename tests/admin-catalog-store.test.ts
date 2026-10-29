import { describe, expect, it } from "vitest";
import { CatalogStore } from "@/lib/admin/catalog-store";
import type { ProductOffering } from "@/data/product-catalog";

const seed: ProductOffering[] = [{
  id: "seed-hosting",
  provider: "HOSTORA",
  name: "Hosting khởi đầu",
  category: "hosting",
  priceFromVnd: 99_000,
  billingUnit: "month",
  summary: "Gói khởi đầu cho website mới.",
  bestFor: ["website mới"],
  sourceUrl: "https://hostora.example/services/seed-hosting",
  verifiedAt: "2026-10-28",
}];

describe("kho dịch vụ quản trị", () => {
  it("seed đúng một lần và chỉ công khai dịch vụ đã xuất bản", () => {
    const store = new CatalogStore(":memory:", seed);
    store.seedProducts(seed);
    expect(store.listAdminProducts()).toHaveLength(1);
    expect(store.listPublishedProducts()).toHaveLength(1);

    store.archiveProduct("seed-hosting");
    expect(store.listPublishedProducts()).toHaveLength(0);
    expect(store.listAdminProducts()).toMatchObject([{ id: "seed-hosting", status: "archived" }]);
    store.close();
  });

  it("thêm và sửa giá dịch vụ bằng cùng bản ghi API công khai đọc", () => {
    const store = new CatalogStore(":memory:", seed);
    store.createProduct({
      id: "hostora-care",
      provider: "HOSTORA",
      name: "Chăm sóc website",
      category: "monitoring",
      priceFromVnd: 350_000,
      billingUnit: "month",
      summary: "Theo dõi, sao lưu và xử lý lỗi định kỳ.",
      bestFor: ["doanh nghiệp nhỏ"],
      sourceUrl: "https://hostora.example/services/hostora-care",
      verifiedAt: "2026-10-28",
      status: "draft",
    });
    expect(store.listPublishedProducts().some((item) => item.id === "hostora-care")).toBe(false);
    store.updateProduct("hostora-care", { name: "Chăm sóc website Pro", priceFromVnd: 490_000, status: "published" });
    expect(store.listPublishedProducts().find((item) => item.id === "hostora-care")).toMatchObject({ name: "Chăm sóc website Pro", priceFromVnd: 490_000 });
    store.close();
  });
});
