import { z } from "zod";

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
  name: z.string().min(1).max(100),
  phone: z.string().min(3).max(30),
  plan: z.string().min(1).max(160),
  planId: z.string().max(100).optional(),
  createdAt: z.string().datetime(),
  status: z.enum(leadStatuses).catch("new"),
  note: z.string().max(500).optional(),
  intelligence: intelligenceSchema.optional(),
});

export type AdminLead = z.infer<typeof adminLeadSchema>;

export function readStoredLeads(raw: string | null): AdminLead[] {
  if (!raw) return [];
  try {
    const parsed = z
      .array(adminLeadSchema)
      .max(1000)
      .safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
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
