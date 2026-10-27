import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PaymentStore } from "@/lib/payments/store";
import { buildVnpayPaymentUrl, verifyVnpayApiResponse, verifyVnpayResponse } from "@/lib/payments/vnpay";

const config = {
  tmnCode: "HOSTORA1",
  hashSecret: "merchant-test-secret-long-enough",
  payUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  apiUrl: "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
  returnUrl: "https://hostora.example/payments/vnpay/return",
};

describe("VNPay HOSTORA", () => {
  it("tạo URL VND ×100 có chữ ký và từ chối sửa số tiền", () => {
    const url = new URL(buildVnpayPaymentUrl(config, {
      id: "HST-1234", amountVnd: 190000, ipAddress: "127.0.0.1", now: new Date("2026-10-26T06:00:00.000Z"),
    }));
    expect(url.searchParams.get("vnp_Amount")).toBe("19000000");
    expect(url.searchParams.get("vnp_TxnRef")).toBe("HST-1234");
    expect(url.searchParams.get("vnp_SecureHash")).toMatch(/^[0-9a-f]{128}$/);
    const params = Object.fromEntries(url.searchParams);
    expect(verifyVnpayResponse(config, params, "HST-1234", 190000)).toBe(true);
    expect(verifyVnpayResponse(config, { ...params, vnp_Amount: "19000100" }, "HST-1234", 190000)).toBe(false);
  });

  it("không chấp nhận mã merchant hoặc giao dịch khác", () => {
    const url = new URL(buildVnpayPaymentUrl(config, { id: "HST-1234", amountVnd: 100000, ipAddress: "127.0.0.1" }));
    const params = Object.fromEntries(url.searchParams);
    expect(verifyVnpayResponse(config, params, "HST-OTHER", 100000)).toBe(false);
    expect(verifyVnpayResponse(config, params, "HST-1234", 100001)).toBe(false);
  });

  it("chỉ tin phản hồi Merchant Web API có chữ ký và số tiền khớp", () => {
    const store = new PaymentStore(":memory:");
    const invoice = store.createInvoice({ title: "Dịch vụ HOSTORA", amountVnd: 190000 });
    const data: Record<string, string> = {
      vnp_ResponseId: "response-1", vnp_Command: "refund", vnp_ResponseCode: "00", vnp_Message: "Success",
      vnp_TmnCode: config.tmnCode, vnp_TxnRef: invoice.id, vnp_Amount: "19000000", vnp_BankCode: "NCB",
      vnp_PayDate: "20261026153000", vnp_TransactionNo: "123456", vnp_TransactionType: "02",
      vnp_TransactionStatus: "00", vnp_OrderInfo: "Hoan tien hoa don",
    };
    const fields = ["vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message", "vnp_TmnCode", "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo", "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo"];
    data.vnp_SecureHash = createHmac("sha512", config.hashSecret).update(fields.map((key) => data[key]).join("|")).digest("hex");
    expect(verifyVnpayApiResponse(config, data, invoice, "refund")).toBe(true);
    expect(verifyVnpayApiResponse(config, { ...data, vnp_Amount: "19000100" }, invoice, "refund")).toBe(false);
    expect(verifyVnpayApiResponse(config, { ...data, vnp_SecureHash: "0".repeat(128) }, invoice, "refund")).toBe(false);
    store.close();
  });
});
