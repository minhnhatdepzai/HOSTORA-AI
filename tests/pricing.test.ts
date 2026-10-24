import { describe, expect, it } from "vitest";
import { hostingCatalog } from "@/data/hosting-catalog";
import { calculateCost } from "@/lib/pricing";

describe("true cost calculator", () => {
  it("uses deterministic arithmetic", () => {
    const plan = hostingCatalog[0];
    const result = calculateCost(plan, 48, 300000, 10000);
    expect(result.hosting).toBe(plan.promoMonthlyVnd * 48);
    expect(result.addons).toBe(480000);
    expect(result.total).toBe(
      (result.hosting ?? 0) + result.domain + result.addons,
    );
  });
  it("does not project a long-term promo rate onto a short checkout", () => {
    const result = calculateCost(hostingCatalog[0], 24);
    expect(result.total).toBeNull();
    expect(result.reason).toMatch(/48 tháng/);
  });
  it("does not invent unknown renewal", () => {
    const plan = hostingCatalog.find((item) => item.renewalMonthlyVnd === null);
    expect(plan).toBeDefined();
    const result = calculateCost(plan!, 24);
    expect(result.total).toBeNull();
    expect(result.reason).toMatch(/gia hạn/);
  });
});
