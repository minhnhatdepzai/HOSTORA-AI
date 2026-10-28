import { describe, expect, it } from "vitest";
import { buildCatalogPayload } from "@/lib/admin/catalog-form";

describe("biểu mẫu dịch vụ", () => {
  it("chuẩn hóa giá và nhóm khách phù hợp trước khi gửi", () => {
    expect(
      buildCatalogPayload({
        id: "hostora-care-pro",
        provider: "HOSTORA",
        name: "Chăm sóc website Pro",
        category: "monitoring",
        priceFromVnd: "490000",
        billingUnit: "month",
        summary: "Theo dõi, sao lưu và hỗ trợ xử lý lỗi định kỳ.",
        bestFor: "doanh nghiệp nhỏ, cửa hàng trực tuyến",
        sourceUrl: "https://hostora.example/services/care-pro",
        verifiedAt: "2026-10-28",
        priceNote: "Đã gồm hỗ trợ trong giờ làm việc.",
        status: "published",
      }),
    ).toMatchObject({
      priceFromVnd: 490000,
      bestFor: ["doanh nghiệp nhỏ", "cửa hàng trực tuyến"],
    });
  });

  it("trả lỗi theo trường khi nguồn không an toàn hoặc thiếu mô tả", () => {
    expect(() =>
      buildCatalogPayload({
        id: "x",
        provider: "H",
        name: "G",
        category: "monitoring",
        priceFromVnd: "-1",
        billingUnit: "month",
        summary: "ngắn",
        bestFor: "",
        sourceUrl: "http://example.com",
        verifiedAt: "",
        priceNote: "",
        status: "draft",
      }),
    ).toThrowError(/Mã dịch vụ|Nguồn xác minh/);
  });
});
