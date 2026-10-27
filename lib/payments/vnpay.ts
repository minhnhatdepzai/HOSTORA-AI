import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Invoice } from "./types";

export type VnpayConfig = {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
  apiUrl: string;
  returnUrl: string;
};

export function vnpayConfigFromEnv(): VnpayConfig | null {
  if (process.env.HOSTORA_PAYMENTS_MODE !== "sandbox") return null;
  const config = {
    tmnCode: process.env.HOSTORA_VNPAY_TMN_CODE ?? "",
    hashSecret: process.env.HOSTORA_VNPAY_HASH_SECRET ?? "",
    payUrl: process.env.HOSTORA_VNPAY_PAY_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    apiUrl: process.env.HOSTORA_VNPAY_API_URL ?? "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
    returnUrl: process.env.HOSTORA_VNPAY_RETURN_URL ?? "",
  };
  if (!config.tmnCode || !config.hashSecret || !config.returnUrl) return null;
  try {
    const payUrl = new URL(config.payUrl);
    const apiUrl = new URL(config.apiUrl);
    const returnUrl = new URL(config.returnUrl);
    if (payUrl.protocol !== "https:" || apiUrl.protocol !== "https:" || returnUrl.protocol !== "https:" || payUrl.hostname !== "sandbox.vnpayment.vn" || apiUrl.hostname !== "sandbox.vnpayment.vn") return null;
    return config;
  } catch {
    return null;
  }
}

function formatVnpayDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
}

function canonical(params: Record<string, string>) {
  return Object.keys(params).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`).join("&");
}

function sign(params: Record<string, string>, secret: string) {
  return createHmac("sha512", secret).update(canonical(params), "utf8").digest("hex");
}

function equalHash(a: string, b: string) {
  if (!/^[a-f\d]{128}$/i.test(a) || !/^[a-f\d]{128}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a.toLowerCase(), "hex"), Buffer.from(b.toLowerCase(), "hex"));
}

export function buildVnpayPaymentUrl(config: VnpayConfig, input: {
  id: string; amountVnd: number; ipAddress: string; now?: Date;
}): string {
  if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd < 5000) throw new Error("Số tiền VNPay không hợp lệ.");
  const now = input.now ?? new Date();
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: input.id,
    vnp_OrderInfo: `Thanh toan hoa don HOSTORA ${input.id}`,
    vnp_OrderType: "other",
    vnp_Amount: String(input.amountVnd * 100),
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: input.ipAddress.replace(/^::ffff:/, "") || "127.0.0.1",
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(new Date(now.getTime() + 15 * 60_000)),
  };
  const query = canonical(params);
  const hash = sign(params, config.hashSecret);
  return `${config.payUrl}?${query}&vnp_SecureHash=${hash}`;
}

export function verifyVnpayResponse(config: VnpayConfig, params: Record<string, string>, invoiceId: string, amountVnd: number): boolean {
  const receivedHash = params.vnp_SecureHash ?? "";
  const payload = { ...params };
  delete payload.vnp_SecureHash;
  delete payload.vnp_SecureHashType;
  return params.vnp_TmnCode === config.tmnCode
    && params.vnp_TxnRef === invoiceId
    && params.vnp_Amount === String(amountVnd * 100)
    && equalHash(receivedHash, sign(payload, config.hashSecret));
}

const apiResponseFields = [
  "vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message", "vnp_TmnCode",
  "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
  "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo",
];

export function verifyVnpayApiResponse(config: VnpayConfig, data: Record<string, unknown>, invoice: Invoice, command: "querydr" | "refund") {
  const parts = apiResponseFields.map((key) => String(data[key] ?? ""));
  const withPromotion = [...parts, String(data.vnp_PromotionCode ?? ""), String(data.vnp_PromotionAmount ?? "")];
  return data.vnp_Command === command && data.vnp_TmnCode === config.tmnCode &&
    data.vnp_TxnRef === invoice.id && String(data.vnp_Amount) === String(invoice.amountVnd * 100) &&
    (equalHash(String(data.vnp_SecureHash ?? ""), signVnpayApiParts(config, parts)) ||
      equalHash(String(data.vnp_SecureHash ?? ""), signVnpayApiParts(config, withPromotion)));
}

async function callVnpay(config: VnpayConfig, payload: Record<string, string>) {
  const response = await fetch(config.apiUrl, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("VNPay chưa phản hồi yêu cầu đối soát.");
  return await response.json() as Record<string, unknown>;
}

export async function queryVnpayTransaction(config: VnpayConfig, invoice: Invoice) {
  if (!invoice.gatewayCreateDate) throw new Error("Thiếu ngày tạo giao dịch VNPay.");
  const requestId = randomUUID().replace(/-/g, "");
  const createDate = vnpayDate(new Date());
  const orderInfo = `Kiem tra giao dich HOSTORA ${invoice.id}`;
  const parts = [requestId, "2.1.0", "querydr", config.tmnCode, invoice.id, invoice.gatewayCreateDate, createDate, "127.0.0.1", orderInfo];
  const data = await callVnpay(config, {
    vnp_RequestId: requestId, vnp_Version: "2.1.0", vnp_Command: "querydr", vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: invoice.id, vnp_OrderInfo: orderInfo, vnp_TransactionDate: invoice.gatewayCreateDate,
    vnp_CreateDate: createDate, vnp_IpAddr: "127.0.0.1", vnp_SecureHash: signVnpayApiParts(config, parts),
  });
  if (!verifyVnpayApiResponse(config, data, invoice, "querydr")) throw new Error("Chữ ký đối soát VNPay không hợp lệ.");
  return data;
}

export async function requestVnpayRefund(config: VnpayConfig, invoice: Invoice) {
  if (invoice.provider !== "vnpay" || !invoice.gatewayPaymentDate || !invoice.gatewayTransactionNo || !invoice.refundReference) {
    throw new Error("Thiếu thông tin giao dịch để hoàn qua VNPay.");
  }
  const requestId = invoice.refundReference;
  const createDate = vnpayDate(new Date());
  const amount = String(invoice.amountVnd * 100);
  const orderInfo = `Hoan tien hoa don HOSTORA ${invoice.id}`;
  const parts = [requestId, "2.1.0", "refund", config.tmnCode, "02", invoice.id, amount,
    invoice.gatewayTransactionNo, invoice.gatewayPaymentDate, "hostora-admin", createDate, "127.0.0.1", orderInfo];
  const data = await callVnpay(config, {
    vnp_RequestId: requestId, vnp_Version: "2.1.0", vnp_Command: "refund", vnp_TmnCode: config.tmnCode,
    vnp_TransactionType: "02", vnp_TxnRef: invoice.id, vnp_Amount: amount,
    vnp_TransactionNo: invoice.gatewayTransactionNo, vnp_TransactionDate: invoice.gatewayPaymentDate,
    vnp_CreateBy: "hostora-admin", vnp_CreateDate: createDate, vnp_IpAddr: "127.0.0.1",
    vnp_OrderInfo: orderInfo, vnp_SecureHash: signVnpayApiParts(config, parts),
  });
  if (!verifyVnpayApiResponse(config, data, invoice, "refund")) throw new Error("Chữ ký phản hồi hoàn tiền VNPay không hợp lệ.");
  return data;
}

export function signVnpayApiParts(config: VnpayConfig, parts: string[]) {
  return createHmac("sha512", config.hashSecret).update(parts.join("|"), "utf8").digest("hex");
}

export function vnpayDate(date: Date) {
  return formatVnpayDate(date);
}
