import { z } from "zod";
import { normalizeContact } from "@/shared/contact";

export const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "closed",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

const intelligenceSchema = z.object({
  segment: z.enum([
    "new-site",
    "upgrade",
    "price-sensitive",
    "technical-consulting",
  ]),
  unansweredQuestions: z.array(z.string().max(240)).max(10),
  suggestedNextMessage: z.string().max(1000),
});

export const adminLeadSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(100),
  phone: z.string().min(3).max(30),
  plan: z.string().min(1).max(160),
  planId: z.string().max(100).optional(),
  createdAt: z.string().datetime(),
  status: z.enum(leadStatuses).catch("new"),
  note: z.string().max(500).optional(),
  intelligence: intelligenceSchema.optional(),
}).superRefine((value, context) => {
  const { error } = normalizeContact(value);
  if (error) context.addIssue({ code: "custom", message: error });
});

export type AdminLead = z.infer<typeof adminLeadSchema>;

export function readStoredLeads(raw: string | null): AdminLead[] {
  return readStoredLeadReport(raw).leads;
}

export function readStoredLeadReport(raw: string | null): { leads: AdminLead[]; invalidCount: number } {
  if (!raw) return { leads: [], invalidCount: 0 };
  try {
    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records)) return { leads: [], invalidCount: 1 };
    const leads: AdminLead[] = [];
    let invalidCount = 0;
    for (const record of records) {
      const parsed = adminLeadSchema.safeParse(record);
      if (parsed.success && !leads.some((lead) => lead.id === parsed.data.id)) leads.push(parsed.data);
      else invalidCount++;
    }
    return { leads, invalidCount };
  } catch {
    return { leads: [], invalidCount: 1 };
  }
}

/** Preserve damaged historical entries when editing valid records. Never overwrite broken JSON. */
export function mergeStoredLeads(raw: string | null, next: AdminLead[]) {
  const existing: unknown = JSON.parse(raw ?? "[]");
  if (!Array.isArray(existing)) throw new Error("Dữ liệu lưu trữ cần được khôi phục trước khi ghi.");
  const valid = next.map((lead) => adminLeadSchema.parse(lead));
  const damaged = existing.filter((lead) => !adminLeadSchema.safeParse(lead).success);
  return JSON.stringify([...valid, ...damaged]);
}

function csvCell(value: string) {
  const safe = /^[\t\r\n ]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function leadsToCsv(leads: AdminLead[]) {
  const header = [
    "Họ tên",
    "Số điện thoại",
    "Gói quan tâm",
    "Trạng thái",
    "Thời gian",
    "Ghi chú",
  ];
  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.plan,
    lead.status,
    lead.createdAt,
    lead.note ?? "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
