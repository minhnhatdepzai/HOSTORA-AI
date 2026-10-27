import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { createStripeCheckout, stripeConfigFromEnv } from "@/lib/payments/stripe";
import { buildVnpayPaymentUrl, vnpayConfigFromEnv } from "@/lib/payments/vnpay";
import { demoCheckoutPath, demoPaymentsEnabled } from "@/lib/payments/demo";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { accessCode, provider } = await parseSmallJson(request, z.object({
      accessCode: z.string().min(1).max(128),
      provider: z.enum(["stripe", "vnpay"]),
    }));
    const store = getPaymentStore();
    const invoice = store.findForCustomer(id, accessCode);
    if (!invoice) return jsonError("Không tìm thấy hóa đơn với mã truy cập này.", 404);
    if (invoice.status !== "pending") return jsonError("Hóa đơn không còn chờ thanh toán.", 409);

    if (demoPaymentsEnabled()) {
      return noStoreJson({
        provider,
        mode: "demo",
        url: demoCheckoutPath(id, accessCode, provider),
        invoiceId: id,
      });
    }

    if (provider === "stripe") {
      const config = stripeConfigFromEnv();
      if (!config) return jsonError("Stripe sandbox chưa được cấu hình cho HOSTORA.", 503);
      store.beginPayment(id, "stripe");
      const session = await createStripeCheckout(invoice, config);
      if (!session.url) return jsonError("Stripe chưa trả trang thanh toán.", 502);
      store.setCheckoutReference(id, session.id);
      return noStoreJson({ provider, url: session.url, invoiceId: id });
    }

    const config = vnpayConfigFromEnv();
    if (!config) return jsonError("VNPay sandbox chưa được cấu hình cho HOSTORA.", 503);
    store.beginPayment(id, "vnpay");
    const url = buildVnpayPaymentUrl(config, { id, amountVnd: invoice.amountVnd, ipAddress: "127.0.0.1" });
    store.setCheckoutReference(id, id, new URL(url).searchParams.get("vnp_CreateDate") ?? undefined);
    return noStoreJson({ provider, url, invoiceId: id });
  } catch {
    return jsonError("Không thể tạo phiên thanh toán lúc này.", 400);
  }
}
