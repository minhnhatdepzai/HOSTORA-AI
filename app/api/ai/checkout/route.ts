import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseRequestJson } from "@/lib/api-validation";
import {
  checkoutQuoteByPlanId,
  purchaseProfileForChat,
} from "@/lib/chat-checkout";
import { normalizeChatMemory } from "@/lib/chat-memory";
import {
  customerFromRequest,
  requestUsesBearer,
  sessionTokenFromRequest,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { listStudioProjectsForCustomer } from "@/lib/site-studio-store";
import { notifyInvoiceCreated, scheduleOrderEmail } from "@/lib/payments/email";
import { getPaymentStore } from "@/lib/payments/store";
import { sameOrigin } from "@/lib/payments/admin-auth";

export const runtime = "nodejs";

const schema = z.object({
  planId: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  conversationId: z.string().uuid().optional(),
  recordSelection: z.boolean().optional(),
  consultation: z
    .object({
      websiteType: z.enum(["store", "company", "blog"]),
      monthlyVisits: z.number().int().min(1).max(100_000_000),
      monthlyBudget: z.number().int().min(10_000).max(100_000_000),
      needsDomain: z.boolean(),
      ecommerce: z.boolean(),
    })
    .strict()
    .optional(),
});

export async function POST(request: Request) {
  const sessionToken = sessionTokenFromRequest(request);
  if (sessionToken && !requestUsesBearer(request) && !sameOrigin(request))
    return Response.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json(
      { error: "Hãy đăng nhập để HOSTORA tạo hóa đơn đúng email của bạn." },
      { status: 401 },
    );
  const parsed = await parseRequestJson(request, schema);
  if (parsed.response) return parsed.response;
  const quote = checkoutQuoteByPlanId(parsed.data.planId);
  if (!quote)
    return Response.json(
      { error: "Gói này không còn trong bảng giá đã kiểm tra." },
      { status: 404 },
    );

  const inventory = getPaymentStore().getPlanInventory(quote.planId);
  if (inventory && inventory.quantity <= 0)
    return Response.json(
      { error: "Gói này đã hết suất bán qua HOSTORA. Hãy chọn gói còn hàng khác." },
      { status: 409 },
    );

  try {
    const customerStore = getCustomerStore();
    let memory = normalizeChatMemory(customerStore.getAiMemory(customer.id));
    if (!memory && parsed.data.consultation) {
      memory = normalizeChatMemory({
        facts: {
          ...parsed.data.consultation,
          upfrontBudget: null,
        },
      });
      if (memory) customerStore.saveAiMemory(customer.id, memory);
    }
    if (!memory)
      return Response.json(
        { error: "Hồ sơ tư vấn chưa đủ để tạo hóa đơn. Hãy nhắn “Tư vấn cho tôi” trước." },
        { status: 409 },
      );
    const requests = customerStore.listPurchaseRequests(customer.email);
    const projects = await listStudioProjectsForCustomer(customer.id);
    const profile = purchaseProfileForChat({
      customerName: customer.name,
      facts: memory.facts,
      requests,
      projects,
    });
    const voucher = customerStore.bestActiveVoucher(customer.email);
    const requestRecord = getPaymentStore().createSaleRequest({
      productId: quote.planId,
      provider: quote.provider,
      productName: quote.planName,
      contact: customer.email,
      note: `Khách chốt trực tiếp trong AI. Kỳ đầu ${quote.billingMonths} tháng theo dữ liệu xác minh ${quote.verifiedAt}.`,
      profile,
      consultationPreference: "ai",
      consultationChannel: "email",
      voucherCode:
        voucher && quote.amountVnd >= voucher.minOrderVnd
          ? voucher.code
          : undefined,
    });
    const invoice = getPaymentStore().createInvoiceForSaleRequest(
      requestRecord.id,
      {
        amountVnd: quote.amountVnd,
        description: `${quote.provider} ${quote.planName} · kỳ đầu ${quote.billingMonths} tháng · giá theo dữ liệu xác minh ${quote.verifiedAt}. Thuế và dịch vụ mua thêm chỉ áp dụng khi được ghi rõ trên hóa đơn này.`,
        createdBy: "ai",
      },
    );
    if (parsed.data.recordSelection) {
      const conversationId =
        parsed.data.conversationId ??
        customerStore.latestConversationId(customer.id) ??
        randomUUID();
      customerStore.openAiConversation({
        conversationId,
        customerId: customer.id,
      });
      const allowed = customerStore.getAiConversationForViewer({
        conversationId,
        customerId: customer.id,
      });
      if (allowed) {
        const userMessageId = randomUUID();
        const assistantMessageId = randomUUID();
        const userContent = `Tôi chốt ${quote.title} và mở thanh toán.`;
        const assistantContent = `Đã tạo hóa đơn ${invoice.id} cho ${quote.title}. Tổng kỳ đầu là ${invoice.amountVnd.toLocaleString("vi-VN")}đ; bạn hãy kiểm tra lại dịch vụ, kỳ hạn và số tiền trên màn hình thanh toán trước khi xác nhận.`;
        customerStore.appendAiConversationMessage({
          id: userMessageId,
          conversationId,
          role: "user",
          content: userContent,
        });
        customerStore.appendChatMessage({
          id: userMessageId,
          customerId: customer.id,
          conversationId,
          role: "user",
          content: userContent,
        });
        customerStore.appendAiConversationMessage({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: assistantContent,
        });
        customerStore.appendChatMessage({
          id: assistantMessageId,
          customerId: customer.id,
          conversationId,
          role: "assistant",
          content: assistantContent,
        });
      }
    }
    scheduleOrderEmail(() => notifyInvoiceCreated(invoice));
    return Response.json(
      {
        invoice: {
          id: invoice.id,
          title: invoice.title,
          amountVnd: invoice.amountVnd,
          status: invoice.status,
        },
        accessCode: invoice.accessCode,
        requestId: requestRecord.id,
        checkoutUrl: `/orders#invoiceId=${encodeURIComponent(invoice.id)}&accessCode=${encodeURIComponent(invoice.accessCode)}`,
        emailQueued: true,
        inventory: getPaymentStore().getPlanInventory(quote.planId),
      },
      {
        status: 201,
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json(
      {
        error:
          message.startsWith("Voucher") || message.startsWith("Thông tin")
            ? message
            : "Chưa tạo được hóa đơn. Hồ sơ vẫn được giữ; hãy thử lại hoặc mở Đơn hàng.",
      },
      { status: 409 },
    );
  }
}
