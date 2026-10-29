import { describe, expect, it } from "vitest";
import { normalizeCommerceSummary } from "@/lib/admin/commerce-summary";

describe("tóm tắt bán hàng quản trị", () => {
  it("hiển thị 0 thay cho null khi kho chưa có đơn", () => {
    expect(
      normalizeCommerceSummary(
        {
          counts: { all: 0 },
          financials: {
            recognizedPaidOrders: null,
            recognizedRevenueVnd: null,
          },
        },
        { counts: { all: 0, new: null } },
      ),
    ).toEqual({
      orders: 0,
      requests: 0,
      paid: 0,
      newRequests: 0,
      revenueVnd: 0,
    });
  });
});
