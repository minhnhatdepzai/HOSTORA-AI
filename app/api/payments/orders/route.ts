import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { stripeConfigFromEnv } from "@/lib/payments/stripe";
import { vnpayConfigFromEnv } from "@/lib/payments/vnpay";
import { demoPaymentsEnabled, paymentsMode } from "@/lib/payments/demo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { id, accessCode } = await parseSmallJson(request, z.object({
      id: z.string().min(1).max(40), accessCode: z.string().min(1).max(128),
    }));
    const store = getPaymentStore();
    const invoice = store.findForCustomer(id, accessCode);
    if (!invoice) return jsonError("Không tìm thấy hóa đơn với mã truy cập này.", 404);
    const demo = demoPaymentsEnabled();
    const mode = paymentsMode();
    return noStoreJson({
      invoice,
      events: store.getEvents(id),
      gateways: {
        stripe: demo || Boolean(stripeConfigFromEnv()),
        vnpay: demo || Boolean(vnpayConfigFromEnv()),
        mode,
      },
    });
  } catch {
    return jsonError("Mã hóa đơn không hợp lệ.", 400);
  }
}
