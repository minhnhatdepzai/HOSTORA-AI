import { z } from "zod";

export const requirementsSchema = z.object({
  websiteType: z.enum(["store", "company", "blog"]),
  monthlyVisits: z.number().int().min(1).max(100000000),
  monthlyBudget: z.number().int().min(10000).max(100000000),
  upfrontBudget: z.number().int().min(0).max(1000000000).optional(),
  needsDomain: z.boolean(),
  ecommerce: z.boolean(),
  notes: z.string().max(1000).optional(),
}).transform((value) => ({
  ...value,
  websiteType: value.ecommerce ? "store" as const : value.websiteType,
  ecommerce: value.ecommerce || value.websiteType === "store",
}));
