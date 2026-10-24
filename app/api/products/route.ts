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
      "Giá từ là snapshot có điều kiện kỳ hạn/VAT. Luôn kiểm tra checkout chính thức trước khi mua.",
  });
}
