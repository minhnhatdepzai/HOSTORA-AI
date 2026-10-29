import { describe, expect, it } from "vitest";
import {
  getRoutedContentAccessibility,
  shouldRenderRoutedContent,
} from "../mobile/src/lib/app-accessibility";

describe("mobile app overlay accessibility", () => {
  it("hides routed controls while a launch overlay is visible", () => {
    expect(getRoutedContentAccessibility(true)).toEqual({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
  });

  it("restores routed controls after launch overlays close", () => {
    expect(getRoutedContentAccessibility(false)).toEqual({
      accessibilityElementsHidden: false,
      importantForAccessibility: "auto",
    });
  });

  it("does not mount the native navigator behind a launch overlay", () => {
    expect(shouldRenderRoutedContent(true)).toBe(false);
    expect(shouldRenderRoutedContent(false)).toBe(true);
  });
});
