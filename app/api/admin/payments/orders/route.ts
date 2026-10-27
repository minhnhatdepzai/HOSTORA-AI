import { z } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { emailStatusFromEnv, notifyInvoiceCreated, scheduleOrderEmail } from "@/lib/payments/email";
import type { InvoiceListQuery } from "@/lib/payments/types";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  amountVnd: z.number().int().min(5000).max(1_000_000_000),
  saleType: z.enum(["hostora_service", "partner_service"]),
  partnerProvider: z.string().trim().max(100).optional(),
  customerEmail: z.string().trim().email().max(160),
}).refine((value) => value.saleType !== "partner_service" || Boolean(value.partnerProvider), {
  message: "Cần ghi nhà cung cấp cho dịch vụ đối tác.",
});

export async function GET(request: Request) {
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams);
  const parsed = z.object({
    search: z.string().trim().max(160).optional(),
    queue: z.enum(["all", "awaiting_payment", "paid", "refunds", "cancelled"]).default("all"),
    provider: z.enum(["stripe", "vnpay", "demo", "unassigned"]).optional(),
    saleType: z.enum(["hostora_service", "partner_service"]).optional(),
    createdFrom: z.iso.datetime({ offset: true }).optional(),
    createdTo: z.iso.datetime({ offset: true }).optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "amountVnd"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(100).default(25),
  }).safeParse(raw);
  if (!parsed.success) return jsonError("Bộ lọc đơn hàng không hợp lệ.", 400);
  const page = getPaymentStore().listInvoicesPage(parsed.data as InvoiceListQuery);
  return noStoreJson({ page, email: emailStatusFromEnv() });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  try {
    const input = await parseSmallJson(request, createSchema);
    const invoice = getPaymentStore().createInvoice(input);
    scheduleOrderEmail(() => notifyInvoiceCreated(invoice));
    return noStoreJson(invoice, 201);
  } catch {
    return jsonError("Thông tin hóa đơn chưa hợp lệ.", 400);
  }
}
