import { describe, expect, it } from "vitest";
import { hostingCost } from "../mobile/src/lib/hosting-cost";

describe("mobile hosting cost", () => {
  it("does not apply a 48-month promo rate to a shorter term", () => {
    const plan = { promo: 55_900, renewal: 181_900, billingMonths: 48 };
    expect(hostingCost(plan, 12)).toBeNull();
    expect(hostingCost(plan, 24)).toBeNull();
    expect(hostingCost(plan, 36)).toBeNull();
    expect(hostingCost(plan, 48)?.total).toBe(55_900 * 48);
  });

  it("does not invent an unknown renewal price", () => {
    const plan = { promo: 225_900, renewal: null, billingMonths: 12 };
    expect(hostingCost(plan, 12)?.total).toBe(225_900 * 12);
    expect(hostingCost(plan, 24)).toBeNull();
  });

  it("adds known renewal prices deterministically", () => {
    const plan = { promo: 80_000, renewal: 150_000, billingMonths: 12 };
    expect(hostingCost(plan, 24)).toEqual({
      initial: 960_000,
      renewal: 1_800_000,
      total: 2_760_000,
      promoMonths: 12,
      renewalMonths: 12,
    });
  });
});
