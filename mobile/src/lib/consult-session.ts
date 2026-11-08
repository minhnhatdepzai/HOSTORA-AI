import { defaultRequirements, type Requirements } from "./catalog";

export function createFreshConsultationDraft(): Requirements {
  return {
    ...defaultRequirements,
    notes: "",
  };
}
