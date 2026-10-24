import { describe, expect, it } from "vitest";
import { assessReadiness, type ReadinessInput } from "@/lib/readiness";

const ready: ReadinessInput = {
  websiteType: "store",
  monthlyVisits: 50000,
  monthlyBudget: 600000,
  stage: "building",
  deadlineWeeks: 8,
  domainStatus: "connected",
  contentReady: true,
  seoKeywordReady: true,
  analyticsReady: true,
  backupOwner: true,
  paymentReady: true,
  teamCanOperate: true,
};

describe("launch readiness", () => {
  it("keeps the score deterministic and bounded", () => {
    const report = assessReadiness(ready);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.dimensions.reduce((sum, item) => sum + item.score, 0)).toBe(
      report.score,
    );
    expect(report.calculatedBy).toBe("deterministic-launch-readiness-v1");
  });

  it("turns missing launch work into explicit blockers", () => {
    const report = assessReadiness({
      ...ready,
      deadlineWeeks: 1,
      domainStatus: "need",
      contentReady: false,
      seoKeywordReady: false,
      analyticsReady: false,
      backupOwner: false,
      paymentReady: false,
      teamCanOperate: false,
    });
    expect(report.score).toBeLessThan(60);
    expect(report.band.id).toBe("at-risk");
    expect(report.blockers.join(" ")).toMatch(/Tên miền|Nội dung/);
    expect(report.blockers.join(" ")).toContain("thanh toán");
  });

  it("does not penalize payment readiness for a non-commerce website", () => {
    const withoutPayment = assessReadiness({
      ...ready,
      websiteType: "blog",
      paymentReady: false,
    });
    const withPayment = assessReadiness({
      ...ready,
      websiteType: "blog",
      paymentReady: true,
    });
    expect(
      withoutPayment.dimensions.find((item) => item.id === "operations")?.score,
    ).toBe(
      withPayment.dimensions.find((item) => item.id === "operations")?.score,
    );
    expect(withoutPayment.blockers.join(" ")).not.toContain("thanh toán");
  });

  it("does not label a high numeric score ready while a hard blocker remains", () => {
    const report = assessReadiness({ ...ready, analyticsReady: false });
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.band.id).toBe("needs-work");
    expect(report.actionPlan.join(" ")).toContain("sự kiện");
  });

  it("is monotonic when any readiness checkbox is removed", () => {
    const baseline = assessReadiness(ready).score;
    const booleanKeys = [
      "contentReady",
      "seoKeywordReady",
      "analyticsReady",
      "backupOwner",
      "paymentReady",
      "teamCanOperate",
    ] as const;
    for (const key of booleanKeys) {
      expect(
        assessReadiness({ ...ready, [key]: false }).score,
      ).toBeLessThanOrEqual(baseline);
    }
  });
});
