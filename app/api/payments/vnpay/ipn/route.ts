import { getPaymentStore } from "@/lib/payments/store";
import { verifyVnpayResponse, vnpayConfigFromEnv } from "@/lib/payments/vnpay";
import { notifyInvoiceStatusChanged, scheduleOrderEmail } from "@/lib/payments/email";

export const runtime = "nodejs";
const reply = (RspCode: string, Message: string) => Response.json({ RspCode, Message }, { headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  const config = vnpayConfigFromEnv();
  if (!config) return reply("99", "Sandbox not configured");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const id = params.vnp_TxnRef ?? "";
  const store = getPaymentStore();
  const invoice = store.getInvoice(id);
  if (!invoice) return reply("01", "Order not found");
  if (!verifyVnpayResponse(config, params, id, invoice.amountVnd)) return reply("97", "Invalid signature or amount");
  if (invoice.provider !== "vnpay" || invoice.providerReference !== id) return reply("02", "Order not awaiting VNPay");
  if (invoice.status === "paid" || invoice.status === "refund_requested" || invoice.status === "refund_pending" || invoice.status === "refunded") return reply("02", "Order already confirmed");
  if (params.vnp_ResponseCode !== "00" || params.vnp_TransactionStatus !== "00") return reply("00", "Payment not successful");
  if (!/^\d{14}$/.test(params.vnp_PayDate ?? "") || !/^\d{1,20}$/.test(params.vnp_TransactionNo ?? "")) return reply("97", "Missing transaction proof");
  try {
    const changed = store.markPaid(id, "vnpay", id, invoice.amountVnd, "vnd", params.vnp_PayDate, params.vnp_TransactionNo);
    scheduleOrderEmail(() => notifyInvoiceStatusChanged(changed));
    return reply("00", "Confirm Success");
  } catch {
    return reply("99", "Could not save payment");
  }
}
