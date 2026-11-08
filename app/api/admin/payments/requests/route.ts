import { z } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { notifyInvoiceCreated, scheduleOrderEmail } from "@/lib/payments/email";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const raw = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = z.object({
    search: z.string().trim().max(160).optional(),
    status: z.enum(["new", "cancel_requested", "invoiced", "declined", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(100).default(25),
  }).safeParse(raw);
  if (!parsed.success) return jsonError("Bộ lọc yêu cầu mua không hợp lệ.", 400);
  return noStoreJson({ page: getPaymentStore().listSaleRequestsPage(parsed.data) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  try {
    const input = await parseSmallJson(request, z.object({
      requestId: z.string().regex(/^HSR-[A-F0-9]{10}$/),
      description: z.string().trim().max(1000).optional(),
      addOns: z.array(z.object({
        label: z.string().trim().min(2).max(120),
        note: z.string().trim().max(500).optional(),
        amountVnd: z.number().int().min(0).max(1_000_000_000),
      }).strict()).max(8).default([]),
      repeatPurchase: z.boolean().optional(),
    }).strict());
    const invoice = getPaymentStore().createInvoiceForSaleRequest(input.requestId, input);
    scheduleOrderEmail(() => notifyInvoiceCreated(invoice));
    return noStoreJson(invoice, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return jsonError(
      message === "Voucher không đủ điều kiện áp dụng." ||
        message.startsWith("Yêu cầu") ||
        message.startsWith("Thông tin")
        ? message
        : "Không thể tạo hóa đơn từ yêu cầu mua này.",
      409,
    );
  }
}
