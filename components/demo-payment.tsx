"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Invoice, PaymentMethod } from "@/lib/payments/types";

type OrderDetail = {
  invoice: Invoice;
  gateways: { stripe: boolean; vnpay: boolean; mode: "demo" | "sandbox" };
};

const money = (amount: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(amount);

export function DemoPayment({ invoiceId, method }: { invoiceId: string; method: PaymentMethod }) {
  const [accessCode, setAccessCode] = useState("");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [bank, setBank] = useState("");
  const [vnpayCustomer, setVnpayCustomer] = useState("");
  const [vnpayOtp, setVnpayOtp] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const methodName = method === "stripe" ? "Stripe" : "VNPay";

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = hash.get("accessCode") ?? "";
      if (!active) return;
      setAccessCode(code);
      if (!invoiceId || code.length < 20) {
        setError("Liên kết thanh toán không hợp lệ hoặc đã thiếu mã truy cập.");
        setBusy(false);
        return;
      }
      void fetch("/api/payments/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: invoiceId, accessCode: code }),
        cache: "no-store",
      }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không thể mở hóa đơn.");
        if (result.gateways?.mode !== "demo") throw new Error("Phiên thanh toán kiểm thử chưa sẵn sàng.");
        if (!active) return;
        setDetail(result as OrderDetail);
        setCompleted(result.invoice?.status === "paid" && result.invoice?.provider === "demo");
      }).catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Không thể mở hóa đơn.");
      }).finally(() => {
        if (active) setBusy(false);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [invoiceId]);

  const orderUrl = useMemo(() => {
    const hash = new URLSearchParams({ invoiceId, accessCode });
    return `/orders#${hash.toString()}`;
  }, [accessCode, invoiceId]);

  const stripeFieldsValid = cardholder.trim().length >= 3 && cardNumber.replace(/\D/g, "") === "4242424242424242" && cardExpiry === "12/34" && cardCvc === "123";
  const vnpayFieldsValid = Boolean(bank) && vnpayCustomer.trim().toUpperCase() === "HOSTORA-THU" && vnpayOtp === "000000";
  const paymentFormValid = method === "stripe" ? stripeFieldsValid : vnpayFieldsValid;

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  async function confirmPayment() {
    if (!detail || !accessCode || busy) return;
    if (!paymentFormValid) {
      setError(method === "stripe"
        ? "Kiểm tra lại thông tin thẻ theo dữ liệu thử nghiệm được ghi trong biểu mẫu."
        : "Kiểm tra lại ngân hàng, mã khách hàng và mã OTP theo dữ liệu thử nghiệm được ghi trong biểu mẫu.");
      return;
    }
    if (!accepted) {
      setError("Bạn cần xác nhận điều kiện của môi trường kiểm thử trước khi tiếp tục.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/payments/orders/${encodeURIComponent(invoiceId)}/demo-confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, method }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể hoàn tất giao dịch.");
      setDetail((current) => current ? { ...current, invoice: result.invoice as Invoice } : current);
      setCompleted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể hoàn tất giao dịch.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="demo-pay-page">
    <div className="demo-pay-notice"><ShieldCheck size={17} /><strong>MÔI TRƯỜNG KIỂM THỬ · KHÔNG THU TIỀN</strong><span>Dùng để kiểm tra toàn bộ luồng trước khi kết nối tài khoản cổng thanh toán.</span></div>
    <main className="demo-pay-shell">
      <Link className="demo-pay-back" href={orderUrl}><ArrowLeft size={16} /> Trở lại đơn hàng</Link>
      {busy && !detail ? <section className="demo-pay-loading" aria-live="polite"><span className="demo-pay-spinner" /><h1>Đang kiểm tra hóa đơn</h1><p>HOSTORA đang mở phiên thanh toán an toàn.</p></section> : error && !detail ? <section className="demo-pay-loading"><LockKeyhole size={28} /><h1>Không thể mở thanh toán</h1><p role="alert">{error}</p></section> : detail ? completed ? <section className="demo-pay-success" aria-live="polite">
        <div className="demo-pay-success-icon"><CheckCircle2 size={34} /></div>
        <p className="demo-pay-kicker">GIAO DỊCH ĐÃ HOÀN TẤT</p>
        <h1>Đơn đã được cập nhật</h1>
        <p>HOSTORA đã ghi nhận bước thanh toán thử nghiệm; không có tiền thật được thu từ tài khoản hay thẻ của bạn.</p>
        <div className="demo-pay-receipt"><span>Mã đơn</span><strong>{detail.invoice.id}</strong><span>Trạng thái</span><strong>Đã ghi nhận thanh toán</strong>{detail.invoice.earnedVoucherCode ? <><span>Quà tặng</span><strong>Voucher {detail.invoice.earnedVoucherCode}</strong></> : null}</div>
        <Link className="button-primary demo-pay-primary" href={orderUrl}>Xem đơn và lịch sử <ReceiptText size={17} /></Link>
      </section> : <div className="demo-pay-grid">
        <section className="demo-pay-summary">
          <p className="demo-pay-kicker">HÓA ĐƠN HOSTORA</p>
          <h1>Xác nhận thanh toán {methodName}</h1>
          <p className="demo-pay-lead">Kiểm tra dịch vụ và số tiền trước khi chạy thử. Trang này không kết nối tới ngân hàng hoặc cổng thanh toán thật.</p>
          <div className="demo-pay-service"><CreditCard size={21} /><div><small>Dịch vụ</small><strong>{detail.invoice.title}</strong><span>{detail.invoice.description || "Theo báo giá đã thống nhất với HOSTORA"}</span></div></div>
          <div className="demo-pay-total"><span>Tổng tiền xác nhận</span><strong>{money(detail.invoice.amountVnd)}</strong></div>
          <div className="demo-pay-meta"><span>Mã đơn</span><b>{detail.invoice.id}</b><span>Phương thức</span><b>{methodName}</b></div>
        </section>
        <section className="demo-pay-confirm" aria-labelledby="demo-confirm-title">
          <span className="demo-pay-step">BƯỚC XÁC NHẬN</span>
          <h2 id="demo-confirm-title">Xác nhận thông tin thanh toán</h2>
          <ul><li>Chỉ dùng thông tin thử nghiệm được ghi ngay trong biểu mẫu.</li><li>Không có khoản tiền nào bị trừ.</li><li>Đơn, email, voucher và trang quản trị vẫn được cập nhật để kiểm thử.</li></ul>
          {method === "stripe" ? <div className="demo-gateway-card demo-gateway-stripe">
            <div className="demo-gateway-brand"><span>stripe</span><small>CỔNG THANH TOÁN</small></div>
            <p className="demo-gateway-hint"><strong>THẺ THANH TOÁN</strong><span>Thông tin thử nghiệm: 4242 4242 4242 4242 · 12/34 · CVC 123</span></p>
            <label className="demo-field"><span>Tên chủ thẻ</span><input aria-label="Tên chủ thẻ" autoComplete="off" value={cardholder} onChange={(event) => setCardholder(event.target.value.toUpperCase())} placeholder="NGUYEN VAN A" maxLength={60} /></label>
            <label className="demo-field"><span>Số thẻ</span><div className="demo-card-input"><CreditCard size={18} /><input aria-label="Số thẻ" autoComplete="off" inputMode="numeric" value={cardNumber} onChange={(event) => setCardNumber(formatCardNumber(event.target.value))} placeholder="4242 4242 4242 4242" maxLength={19} /></div></label>
            <div className="demo-field-row"><label className="demo-field"><span>Ngày hết hạn</span><input aria-label="Ngày hết hạn" autoComplete="off" inputMode="numeric" value={cardExpiry} onChange={(event) => setCardExpiry(formatExpiry(event.target.value))} placeholder="12/34" maxLength={5} /></label><label className="demo-field"><span>CVC</span><input aria-label="CVC" autoComplete="off" inputMode="numeric" value={cardCvc} onChange={(event) => setCardCvc(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="123" maxLength={3} /></label></div>
            <label className="demo-field"><span>Quốc gia hoặc khu vực</span><select aria-label="Quốc gia hoặc khu vực" defaultValue="VN"><option value="VN">Việt Nam</option></select></label>
          </div> : <div className="demo-gateway-card demo-gateway-vnpay">
            <div className="demo-gateway-brand"><span>VNPAY</span><small>CỔNG THANH TOÁN</small></div>
            <p className="demo-gateway-hint"><strong>CHỌN NGÂN HÀNG</strong><span>Chỉ dùng thông tin thử nghiệm, không đăng nhập tài khoản ngân hàng thật.</span></p>
            <div className="demo-bank-grid" role="group" aria-label="Chọn ngân hàng">{["Vietcombank", "BIDV", "VietinBank", "MB Bank", "NCB", "VNPAY QR"].map((name) => <button key={name} type="button" aria-pressed={bank === name} className={bank === name ? "is-active" : ""} onClick={() => setBank(name)}>{name}</button>)}</div>
            <label className="demo-field"><span>Mã khách hàng</span><input aria-label="Mã khách hàng" autoComplete="off" value={vnpayCustomer} onChange={(event) => setVnpayCustomer(event.target.value.toUpperCase())} placeholder="HOSTORA-THU" maxLength={30} /></label>
            <label className="demo-field"><span>Mã OTP</span><input aria-label="Mã OTP" autoComplete="one-time-code" inputMode="numeric" value={vnpayOtp} onChange={(event) => setVnpayOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} /></label>
            <p className="demo-vnpay-safe"><LockKeyhole size={15} /> Dữ liệu trong khung này chỉ tồn tại trên màn hình và không được gửi tới backend.</p>
          </div>}
          <label className="demo-pay-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Tôi xác nhận dùng thông tin thử nghiệm và hiểu rằng môi trường này không thu tiền thật.</span></label>
          {error ? <p className="demo-pay-error" role="alert">{error}</p> : null}
          <button className="button-primary demo-pay-primary" type="button" disabled={busy} onClick={() => void confirmPayment()}>{busy ? "Đang cập nhật…" : "Xác nhận thanh toán"}<CheckCircle2 size={17} /></button>
          <Link className="demo-pay-cancel" href={orderUrl}>Hủy và trở lại đơn hàng</Link>
        </section>
      </div> : null}
    </main>
  </div>;
}
