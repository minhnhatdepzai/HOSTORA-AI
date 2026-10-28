import { describe, expect, it } from "vitest";
import { forecastRevenue } from "@/lib/admin/revenue-forecast";

describe("dự báo doanh thu quản trị", () => {
  it("không dựng dự báo khi chưa có dữ liệu", () => {
    expect(forecastRevenue([])).toEqual({
      available: false,
      method: "moving_average_trend",
      confidence: "unavailable",
      sampleDays: 0,
      reason: "Chưa có doanh thu đã xác nhận.",
    });
    expect(
      forecastRevenue(
        Array.from({ length: 30 }, (_, index) => ({
          date: `2026-09-${String(index + 1).padStart(2, "0")}`,
          revenueVnd: 0,
          paidOrders: 0,
        })),
      ),
    ).toMatchObject({ available: false, confidence: "unavailable" });
  });

  it("báo độ tin cậy thấp khi lịch sử dưới bảy ngày", () => {
    const result = forecastRevenue([
      { date: "2026-10-26", revenueVnd: 100_000, paidOrders: 1 },
      { date: "2026-10-27", revenueVnd: 200_000, paidOrders: 2 },
    ]);
    expect(result).toMatchObject({ available: false, confidence: "low", sampleDays: 2 });
  });

  it("dự báo 30 ngày từ trung bình gần nhất và trả khoảng sai số", () => {
    const points = Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      revenueVnd: 100_000,
      paidOrders: 1,
    }));
    const result = forecastRevenue(points);
    expect(result).toMatchObject({
      available: true,
      method: "moving_average_trend",
      confidence: "medium",
      sampleDays: 14,
      next30DaysVnd: 3_000_000,
      lowerVnd: 3_000_000,
      upperVnd: 3_000_000,
    });
  });
});
