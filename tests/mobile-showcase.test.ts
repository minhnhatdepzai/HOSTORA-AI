import { describe, expect, it } from "vitest";
import { canContinueConsult } from "@/mobile/src/lib/consult-guard";
import {
  getMotionProfile,
  getStaggerDelay,
  getStepDirection,
  progressForStep,
} from "@/mobile/src/lib/motion-spec";
import { defaultRequirements } from "@/mobile/src/lib/catalog";
import { resolveDefaultApiBase } from "@/mobile/src/lib/api-base";
import { createFreshConsultationDraft } from "@/mobile/src/lib/consult-session";
import { resolveCustomerPrefill } from "@/mobile/src/lib/customer-prefill";
import { shouldPlayIntroOnLaunch } from "@/mobile/src/lib/intro";
import {
  judgeCases,
  judgeFeatures,
  judgeTimeline,
} from "@/mobile/src/lib/judge-showcase";

describe("HOSTORA mobile motion contract", () => {
  it("plays the cinematic on every cold launch unless reduced motion is enabled", () => {
    expect(shouldPlayIntroOnLaunch(false)).toBe(true);
    expect(shouldPlayIntroOnLaunch(true)).toBe(false);
  });

  it("keeps tap feedback perceptible without feeling delayed", () => {
    const profile = getMotionProfile(false);
    expect(profile.pressInMs).toBeGreaterThanOrEqual(80);
    expect(profile.pressInMs).toBeLessThanOrEqual(150);
    expect(profile.pressOutMs).toBeGreaterThanOrEqual(profile.pressInMs);
    expect(profile.pressScale).toBeGreaterThanOrEqual(0.96);
    expect(profile.pressScale).toBeLessThan(1);
  });

  it("returns final static states when reduced motion is enabled", () => {
    expect(getMotionProfile(true)).toMatchObject({
      pressInMs: 0,
      pressOutMs: 0,
      enterMs: 0,
      stepMs: 0,
      distance: 0,
      pressScale: 1,
    });
  });

  it("derives directional wizard motion and transform progress", () => {
    expect(getStepDirection(2, 1)).toBe("backward");
    expect(getStepDirection(1, 2)).toBe("forward");
    expect(progressForStep(0, 4)).toBe(0.25);
    expect(progressForStep(3, 4)).toBe(1);
  });

  it("caps list staggering so long catalogs never wait on animation", () => {
    expect(getStaggerDelay(0, false)).toBe(0);
    expect(getStaggerDelay(3, false)).toBeGreaterThan(0);
    expect(getStaggerDelay(30, false)).toBeLessThanOrEqual(240);
    expect(getStaggerDelay(3, true)).toBe(0);
  });
});

describe("HOSTORA consultation guards", () => {
  it("starts every consultation from a new default draft", () => {
    const first = createFreshConsultationDraft();
    first.monthlyVisits = 99_999;
    first.notes = "Dữ liệu của phiên trước";

    expect(createFreshConsultationDraft()).toEqual(defaultRequirements);
  });

  it("accepts the existing first-step website selection", () => {
    expect(canContinueConsult(0, defaultRequirements)).toBe(true);
  });

  it.each([0, -1, 100_000_001, 1.5])(
    "rejects invalid monthly visits %s",
    (monthlyVisits) => {
      expect(
        canContinueConsult(1, { ...defaultRequirements, monthlyVisits }),
      ).toBe(false);
    },
  );

  it.each([1, 100_000_000])(
    "accepts boundary monthly visits %s",
    (monthlyVisits) => {
      expect(
        canContinueConsult(1, { ...defaultRequirements, monthlyVisits }),
      ).toBe(true);
    },
  );

  it.each([9_999, 100_000_001, 50_000.5])(
    "rejects invalid monthly budget %s",
    (monthlyBudget) => {
      expect(
        canContinueConsult(2, { ...defaultRequirements, monthlyBudget }),
      ).toBe(false);
    },
  );

  it("rejects invalid upfront limits without rejecting an omitted limit", () => {
    expect(
      canContinueConsult(2, { ...defaultRequirements, upfrontBudget: -1 }),
    ).toBe(false);
    expect(
      canContinueConsult(2, {
        ...defaultRequirements,
        upfrontBudget: 1_000_000_001,
      }),
    ).toBe(false);
    expect(
      canContinueConsult(2, {
        ...defaultRequirements,
        upfrontBudget: undefined,
      }),
    ).toBe(true);
  });

  it("accepts both explicit domain choices on the final step", () => {
    expect(canContinueConsult(3, defaultRequirements)).toBe(true);
    expect(
      canContinueConsult(3, { ...defaultRequirements, needsDomain: false }),
    ).toBe(true);
  });
});

describe("HOSTORA mobile API defaults", () => {
  it("always uses the Android host gateway on an emulator", () => {
    expect(
      resolveDefaultApiBase({
        platform: "android",
        isPhysicalDevice: false,
        envBase: "http://192.168.100.10:3000",
      }),
    ).toBe("http://10.0.2.2:3200");
  });

  it("keeps an explicit server for a physical Android device", () => {
    expect(
      resolveDefaultApiBase({
        platform: "android",
        isPhysicalDevice: true,
        envBase: "http://192.168.1.20:3000/",
      }),
    ).toBe("http://192.168.1.20:3000");
  });
});

describe("HOSTORA repeat purchase identity", () => {
  it("prefills account name and email when a new form has no draft", () => {
    expect(resolveCustomerPrefill(null, "Nguyễn Minh Nhật")).toBe(
      "Nguyễn Minh Nhật",
    );
    expect(resolveCustomerPrefill(null, "nhat@example.com")).toBe(
      "nhat@example.com",
    );
  });

  it("keeps a deliberate edit for the current form", () => {
    expect(resolveCustomerPrefill("Tên người phụ trách", "Tên tài khoản")).toBe(
      "Tên người phụ trách",
    );
  });
});

describe("HOSTORA judge showcase", () => {
  it("maps exactly five required features to real app routes", () => {
    expect(judgeFeatures).toHaveLength(5);
    expect(new Set(judgeFeatures.map((item) => item.id)).size).toBe(5);
    expect(
      judgeFeatures.every(
        (item) => item.route.startsWith("/") && item.proof.trim().length > 10,
      ),
    ).toBe(true);
  });

  it("ships nine judge cases balanced across normal invalid and edge input", () => {
    expect(judgeCases).toHaveLength(9);
    expect(new Set(judgeCases.map((item) => item.id)).size).toBe(9);
    expect(
      Object.fromEntries(
        ["normal", "invalid", "edge"].map((kind) => [
          kind,
          judgeCases.filter((item) => item.kind === kind).length,
        ]),
      ),
    ).toEqual({ normal: 3, invalid: 3, edge: 3 });
    expect(
      judgeCases.every(
        (item) =>
          item.expected.trim().length > 10 && item.demo.trim().length > 10,
      ),
    ).toBe(true);
  });

  it("keeps the guided judge timeline within the two-minute video limit", () => {
    expect(judgeTimeline).toHaveLength(5);
    expect(judgeTimeline.at(-1)?.second).toBeLessThanOrEqual(110);
  });
});
