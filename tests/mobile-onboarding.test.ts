import { describe, expect, it } from "vitest";
import {
  getNextOnboardingStep,
  shouldShowOnboarding,
} from "../mobile/src/lib/onboarding";

describe("mobile onboarding", () => {
  it("shows the guide until the current version is completed", () => {
    expect(shouldShowOnboarding(null)).toBe(true);
    expect(shouldShowOnboarding("completed-v1")).toBe(false);
    expect(shouldShowOnboarding("completed-v0")).toBe(true);
  });

  it("advances through steps and marks the last step complete", () => {
    expect(getNextOnboardingStep(0, 3)).toEqual({ nextIndex: 1, done: false });
    expect(getNextOnboardingStep(1, 3)).toEqual({ nextIndex: 2, done: false });
    expect(getNextOnboardingStep(2, 3)).toEqual({ nextIndex: 2, done: true });
  });
});
