import { productCatalog } from "@/data/product-catalog";
import { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider")?.toLowerCase();
  const category = request.nextUrl.searchParams.get("category")?.toLowerCase();
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const products = productCatalog.filter((item) => {
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
    catalogTotal: productCatalog.length,
    verifiedAt: "2026-10-23",
    disclaimer:
      "Giá hiển thị là mức tham khảo tại ngày kiểm tra và có thể phụ thuộc thời hạn thanh toán hoặc thuế. Hãy kiểm tra trang chính thức trước khi mua.",
  });
}
