import type { Requirements } from "./catalog";

function integerBetween(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function canContinueConsult(step: number, data: Requirements) {
  if (step === 1) return integerBetween(data.monthlyVisits, 1, 100_000_000);
  if (step === 2) {
    return (
      integerBetween(data.monthlyBudget, 10_000, 100_000_000) &&
      (data.upfrontBudget === undefined ||
        integerBetween(data.upfrontBudget, 0, 1_000_000_000))
    );
  }
  if (step === 3) return typeof data.needsDomain === "boolean";
  return step === 0;
}
