export const ONBOARDING_STORAGE_KEY = "hostora:mobile:onboarding";
export const ONBOARDING_COMPLETED_VALUE = "completed-v1";

export function shouldShowOnboarding(storedValue: string | null) {
  return storedValue !== ONBOARDING_COMPLETED_VALUE;
}

export function getNextOnboardingStep(currentIndex: number, total: number) {
  const lastIndex = Math.max(0, total - 1);
  if (currentIndex >= lastIndex) return { nextIndex: lastIndex, done: true };
  return { nextIndex: currentIndex + 1, done: false };
}
