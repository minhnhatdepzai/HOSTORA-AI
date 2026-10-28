import { getCatalogStore } from "@/lib/admin/catalog-store";

export const runtime = "nodejs";

export function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const provider = searchParams.get("provider")?.toLowerCase();
  const category = searchParams.get("category")?.toLowerCase();
  const query = searchParams.get("q")?.trim().toLowerCase();
  const catalog = getCatalogStore().listPublishedProducts();
  const products = catalog.filter((item) => {
    if (provider && item.provider.toLowerCase() !== provider) return false;
    if (category && item.category !== category) return false;
    if (query) {
      const haystack =
        `${item.provider} ${item.name} ${item.category} ${item.summary} ${item.bestFor.join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  return Response.json({
    products,
    total: products.length,
    catalogTotal: catalog.length,
    verifiedAt: catalog.map((item) => item.verifiedAt).sort().at(-1) ?? null,
    catalogUpdatedAt: catalog.map((item) => item.verifiedAt).sort().at(-1) ?? null,
    disclaimer:
      "Giá hiển thị là mức tham khảo tại ngày kiểm tra và có thể phụ thuộc kỳ hạn hoặc thuế. HOSTORA xác nhận tổng tiền trước khi tạo hóa đơn; bạn gửi yêu cầu mua ngay trong HOSTORA.",
  }, { headers: { "cache-control": "no-store" } });
}
