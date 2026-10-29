export function getRoutedContentAccessibility(overlayVisible: boolean): {
  accessibilityElementsHidden: boolean;
  importantForAccessibility: "no-hide-descendants" | "auto";
} {
  return overlayVisible
    ? {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants",
      }
    : {
        accessibilityElementsHidden: false,
        importantForAccessibility: "auto",
      };
}
