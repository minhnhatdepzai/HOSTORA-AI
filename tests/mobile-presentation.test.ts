import { describe, expect, it } from "vitest";
import { toCustomerLanguage } from "../mobile/src/lib/customer-language";
import catalog from "../mobile/src/data/product-catalog.json";
import { productCatalog } from "../data/product-catalog";

describe("mobile presentation", () => {
  it("translates customer prose while preserving provider links and literal code", () => {
    const text =
      "Website dùng hosting. Xem [nguồn](https://cloud.hosting.vn/api/email), [Xưởng website](/website-studio) và `hosting` trước khi chat.";
    const actual = toCustomerLanguage(text);
    expect(actual).toContain("Trang web dùng lưu trữ trang web");
    expect(actual).toContain("https://cloud.hosting.vn/api/email");
    expect(actual).toContain("(/website-studio)");
    expect(actual).toContain("`hosting`");
    expect(actual).toContain("trò chuyện");
  });
  it("does not expose internal service vocabulary in assistant copy", () => {
    const actual = toCustomerLanguage(
      "Backend dùng RAG, webhook, gateway sandbox, OCR và SEO.",
    );
    expect(actual).not.toMatch(/backend|rag|webhook|gateway|sandbox|ocr|seo/i);
  });
  it("ships the sourced catalog without inventing prices for offline browsing", () => {
    expect(catalog).toEqual(productCatalog);
    expect(catalog.some((item) => item.priceFromVnd === null)).toBe(true);
    expect(
      catalog.every(
        (item) => item.sourceUrl.startsWith("https://") && item.verifiedAt,
      ),
    ).toBe(true);
  });
});
