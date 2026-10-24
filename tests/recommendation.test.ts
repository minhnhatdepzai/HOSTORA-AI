import { describe, expect, it } from "vitest";
import { hostingCatalog } from "@/data/hosting-catalog";
import { recommendPlans, scorePlan } from "@/lib/recommendation";

describe("recommendation engine", () => {
  it("always returns exactly three real catalog plans", () => {
    const result = recommendPlans({
      websiteType: "store",
      monthlyVisits: 50000,
      monthlyBudget: 600000,
      needsDomain: true,
      ecommerce: true,
    });
    expect(result).toHaveLength(3);
    expect(new Set(result.map((item) => item.plan.id)).size).toBe(3);
    expect(result[0].total).toBeGreaterThanOrEqual(result[1].total);
  });

  it("penalizes a renewal price over budget", () => {
    const result = recommendPlans({
      websiteType: "blog",
      monthlyVisits: 1000,
      monthlyBudget: 90000,
      needsDomain: false,
      ecommerce: false,
    });
    expect(result[0].plan.renewalMonthlyVnd).toBeLessThanOrEqual(90000);
  });

  it("never treats unknown renewal as a confirmed affordable price", () => {
    const plan = hostingCatalog.find((item) => item.id === "azdigi-az-pro-1")!;
    const scored = scorePlan(plan, {
      websiteType: "blog",
      monthlyVisits: 1000,
      monthlyBudget: 90000,
      needsDomain: false,
      ecommerce: false,
    });
    expect(scored.cautions.join(" ")).toContain("Giá gia hạn chưa xác minh");
    expect(scored.breakdown.ownership).toBe(25);
    expect(scored.breakdown.budget).toBeLessThan(100);
  });
});
