import { z } from "zod";

export const catalogCategories = [
  "hosting",
  "wordpress",
  "vps",
  "cloud",
  "domain",
  "email",
  "ssl",
  "automation",
  "workspace",
  "backup",
  "monitoring",
  "security",
] as const;

export const catalogBillingUnits = ["month", "year", "usage", "contact"] as const;
export const catalogStatuses = ["draft", "published", "archived"] as const;

export const catalogDraftSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,79}$/,
      "Mã dịch vụ chỉ gồm chữ thường, số và dấu gạch ngang.",
    ),
  provider: z.string().trim().min(2, "Tên đơn vị phải có ít nhất 2 ký tự."),
  name: z.string().trim().min(2, "Tên dịch vụ phải có ít nhất 2 ký tự."),
  category: z.enum(catalogCategories),
  priceFromVnd: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Giá phải là số nguyên không âm.",
    )
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) => value === null || value <= 1_000_000_000,
      "Giá vượt quá giới hạn cho phép.",
    ),
  billingUnit: z.enum(catalogBillingUnits),
  summary: z.string().trim().min(10, "Mô tả phải có ít nhất 10 ký tự."),
  bestFor: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((items) => items.length > 0, "Cần ít nhất một nhóm khách phù hợp."),
  sourceUrl: z
    .string()
    .url("Nguồn xác minh phải là một địa chỉ hợp lệ.")
    .refine(
      (value) => new URL(value).protocol === "https:",
      "Nguồn xác minh phải dùng HTTPS.",
    ),
  verifiedAt: z.iso.date("Ngày xác minh chưa hợp lệ."),
  priceNote: z.string().trim().max(500).optional(),
  status: z.enum(catalogStatuses),
});

export type CatalogDraft = z.input<typeof catalogDraftSchema>;
export type CatalogPayload = z.output<typeof catalogDraftSchema>;

export function buildCatalogPayload(draft: CatalogDraft): CatalogPayload {
  const result = catalogDraftSchema.safeParse(draft);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(" "));
  }
  return result.data;
}

export function catalogDraftErrors(draft: CatalogDraft) {
  const result = catalogDraftSchema.safeParse(draft);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  ) as Partial<Record<keyof CatalogDraft, string>>;
}
