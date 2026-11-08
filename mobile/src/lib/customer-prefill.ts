export function resolveCustomerPrefill(
  draft: string | null,
  accountValue: string | null | undefined,
) {
  return draft ?? accountValue ?? "";
}
