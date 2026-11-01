export const INTRO_COMPLETED_STORAGE_KEY = "hostora:mobile:intro";
export const INTRO_COMPLETED_VALUE = "completed-v1";

export function shouldShowIntro(value: string | null) {
  return value !== INTRO_COMPLETED_VALUE;
}
