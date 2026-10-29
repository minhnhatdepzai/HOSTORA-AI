"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Invoice, InvoiceEvent, PaymentMethod, SaleRequest } from "@/lib/payments/types";
import { trackFunnelStep } from "@/lib/funnel-client";

type Detail = { invoice: Invoice; events: InvoiceEvent[]; gateways: { stripe: boolean; vnpay: boolean; mode: "demo" | "sandbox" } };
const statusLabel: Record<Invoice["status"], string> = {
  pending: "Chờ thanh toán", cancel_requested: "Đang xác minh yêu cầu hủy", paid: "Đã thanh toán",
  refund_requested: "Chờ duyệt hoàn tiền", refund_pending: "Đang hoàn tiền", refunded: "Đã hoàn tiền", cancelled: "Đã hủy",
};
const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);

export function OrderPortal() {
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [saleRequest, setSaleRequest] = useState<SaleRequest | null>(null);
  const [requestAccessCode, setRequestAccessCode] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);

  async function lookupRequest(requestId: string, accessCode: string) {
    setBusy("request-lookup"); setMessage("");
    try {
      const response = await fetch("/api/payments/requests/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: requestId, accessCode }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể mở yêu cầu mua.");
      setSaleRequest(data.request as SaleRequest); setRequestAccessCode(accessCode);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể mở yêu cầu mua."); }
    finally { setBusy(""); }
  }

  async function cancelRequest() {
    if (!saleRequest) return;
    setBusy("request-cancel"); setMessage("");
    try {
      const response = await fetch(`/api/payments/requests/${encodeURIComponent(saleRequest.id)}/cancel`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessCode: requestAccessCode, reason: requestReason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể hủy yêu cầu.");
      setSaleRequest(data.request as SaleRequest); setRequestReason(""); setMessage("Yêu cầu mua đã được hủy và email xác nhận đang được gửi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể hủy yêu cầu."); }
    finally { setBusy(""); }
  }

  async function lookup(invoiceId = id, accessCode = code) {
    setBusy("lookup"); setMessage("");
    try {
      const response = await fetch("/api/payments/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: invoiceId.trim().toUpperCase(), accessCode }), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải hóa đơn.");
      setDetail(data as Detail);
      setId(invoiceId.trim().toUpperCase()); setCode(accessCode);
      sessionStorage.setItem("hostora:active-order", JSON.stringify({ id: invoiceId.trim().toUpperCase(), code: accessCode }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải hóa đơn."); setDetail(null); }
    finally { setBusy(""); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const requestId = hash.get("requestId"); const requestCode = hash.get("requestCode");
      const invoiceId = hash.get("invoiceId"); const invoiceCode = hash.get("accessCode");
      if (requestId && requestCode) { void lookupRequest(requestId, requestCode); return; }
      if (invoiceId && invoiceCode) { setId(invoiceId); setCode(invoiceCode); void lookup(invoiceId, invoiceCode); return; }
      const saved = sessionStorage.getItem("hostora:active-order");
      if (!saved) return;
      let value: { id?: string; code?: string } = {};
      try {
        value = JSON.parse(saved) as { id?: string; code?: string };
      } catch { sessionStorage.removeItem("hostora:active-order"); }
      if (value?.id && value.code) { setId(value.id); setCode(value.code); void lookup(value.id, value.code); }
    }, 0);
    return () => window.clearTimeout(timer);
    // Restore the order after a hosted checkout redirects back to this tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mutate(path: string, body: object, action: string) {
    if (!detail) return;
    setBusy(action); setMessage(""); setLoginRequired(false);
    try {
      const response = await fetch(`/api/payments/orders/${encodeURIComponent(detail.invoice.id)}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessCode: code, ...body }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setLoginRequired(true);
        throw new Error(data.error || "Không xử lý được yêu cầu.");
      }
      if (data.url) { trackFunnelStep("checkout_started"); window.location.assign(data.url); return; }
      setReason("");
      await lookup(detail.invoice.id, code);
      setMessage(action === "cancel" ? "Đã ghi nhận yêu cầu hủy." : "Đã gửi yêu cầu hoàn tiền.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xử lý được yêu cầu."); }
    finally { setBusy(""); }
  }

  const invoice = detail?.invoice;
  return <div className="order-page">
    <div className="order-hero"><div className="order-wrap order-hero-inner">
      <div><p className="eyebrow">HOSTORA / ĐƠN HÀNG</p><h1>Theo dõi đơn của bạn</h1><p>Tra cứu thanh toán, yêu cầu hủy hoặc hoàn tiền bằng mã riêng trên hóa đơn.</p></div>
      <div className="order-hero-mark"><ShieldCheck size={24} /><span>Mã truy cập chỉ có ở bạn và người tạo hóa đơn.</span></div>
    </div></div>
    <div className="order-wrap order-layout">
      <section className="order-search" aria-labelledby="order-search-heading">
        <span className="order-section-number">01 / TRA CỨU</span><h2 id="order-search-heading">Tìm hóa đơn</h2>
        <form onSubmit={(event) => { event.preventDefault(); void lookup(); }}>
          <label className="label" htmlFor="order-id">Mã đơn hàng</label><input id="order-id" className="input" placeholder="HST-..." autoCapitalize="characters" value={id} onChange={(event) => setId(event.target.value)} required />
          <label className="label" htmlFor="order-code">Mã truy cập riêng</label><input id="order-code" className="input" type="password" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} required />
          <button className="button-primary order-full" disabled={Boolean(busy)} type="submit">{busy === "lookup" ? "Đang kiểm tra..." : "Xem đơn hàng"}<ArrowRight size={17} /></button>
        </form>
        <p className="order-help">Hai mã này do HOSTORA gửi riêng khi tạo hóa đơn. Giá trên danh mục đối tác chỉ để tham khảo; số tiền cần trả nằm trên hóa đơn đã thỏa thuận.</p>
      </section>
      <section className="order-detail" aria-live="polite">
        {message && <p className="order-message" role="status">{message}</p>}
        {saleRequest ? <div className="request-portal-card"><div className="order-detail-top"><div><span className="order-section-number">YÊU CẦU MUA</span><h2>{saleRequest.productName}</h2><p>{saleRequest.id} · {saleRequest.provider}</p></div><span className={`order-status ${saleRequest.status === "cancelled" ? "order-status-cancelled" : "order-status-pending"}`}>{saleRequest.status === "new" ? "Đang chờ báo giá" : saleRequest.status === "cancelled" ? "Đã hủy" : saleRequest.status === "invoiced" ? "Đã tạo hóa đơn" : "Đã từ chối"}</span></div><div className="request-portal-summary"><div><small>Người phụ trách</small><strong>{saleRequest.profile.customerName}</strong></div><div><small>Doanh nghiệp</small><strong>{saleRequest.profile.companyName || "Cá nhân / chưa cung cấp"}</strong></div><div><small>Tư vấn</small><strong>{saleRequest.consultationPreference === "ai" ? "AI HOSTORA" : saleRequest.consultationAt ? new Date(saleRequest.consultationAt).toLocaleString("vi-VN") : "Chờ xác nhận"}</strong></div><div><small>Mục tiêu</small><strong>{saleRequest.profile.websiteGoal}</strong></div>{saleRequest.profile.mainOffer && <div><small>Sản phẩm chủ lực</small><strong>{saleRequest.profile.mainOffer}</strong></div>}{saleRequest.profile.serviceArea && <div><small>Khu vực phục vụ</small><strong>{saleRequest.profile.serviceArea}</strong></div>}</div>{saleRequest.status === "new" && <div className="order-request"><h3>Cần hủy yêu cầu?</h3><p>Hủy trước khi HOSTORA phát hành hóa đơn. Một email xác nhận sẽ được gửi cho bạn và quản trị viên.</p><label className="label" htmlFor="request-cancel-reason">Lý do hủy</label><textarea id="request-cancel-reason" className="input" rows={3} maxLength={500} value={requestReason} onChange={(event) => setRequestReason(event.target.value)} /><button type="button" className="button-secondary" disabled={Boolean(busy) || requestReason.trim().length < 5} onClick={() => void cancelRequest()}>Hủy yêu cầu mua <RotateCcw size={16} /></button></div>}{saleRequest.status === "cancelled" && <p className="order-description">Yêu cầu này đã được hủy. HOSTORA sẽ không phát hành hóa đơn.</p>}</div> : !invoice ? <div className="order-empty"><CreditCard size={35} strokeWidth={1.4} /><h2>Thông tin đơn hàng hiện ở đây</h2><p>Mở liên kết trong email hoặc nhập mã đơn và mã truy cập để xem trạng thái.</p></div> : <>
          <div className="order-detail-top"><div><span className="order-section-number">02 / CHI TIẾT HÓA ĐƠN</span><h2>{invoice.title}</h2><p>{invoice.id} · {invoice.saleType === "partner_service" ? `Dịch vụ đối tác: ${invoice.partnerProvider}` : "Dịch vụ HOSTORA"}</p></div><span className={`order-status order-status-${invoice.status}`}>{invoice.provider === "demo" && invoice.status === "paid" ? "Đã ghi nhận thanh toán" : invoice.provider === "demo" && invoice.status === "refunded" ? "Đã ghi nhận hoàn tiền" : statusLabel[invoice.status]}</span></div>
          {invoice.description && <p className="order-description">{invoice.description}</p>}
          {invoice.discountVnd > 0 && <div className="order-discount"><span>Giá trước giảm: {money(invoice.subtotalVnd)}</span><strong>Voucher {invoice.voucherCode}: -{money(invoice.discountVnd)}</strong></div>}
          <div className="order-total"><span>{invoice.provider === "demo" ? "Tổng tiền xác nhận" : "Tổng tiền đã thỏa thuận"}</span><strong>{money(invoice.amountVnd)}</strong></div>
          {invoice.earnedVoucherCode && <div className="order-voucher"><span>Voucher cho lần mua tiếp theo</span><strong>{invoice.earnedVoucherCode} · {money(invoice.earnedVoucherAmountVnd ?? 0)}</strong><small>Đơn tiếp theo từ 1.000.000đ · hết hạn {invoice.earnedVoucherExpiresAt ? new Date(invoice.earnedVoucherExpiresAt).toLocaleDateString("vi-VN") : "—"}</small></div>}
          {invoice.status === "paid" && <div className="order-next-step"><span>SAU KHI THANH TOÁN</span><h3>Website của bạn đang ở chặng nào?</h3><p>Đọc checklist ra mắt, rồi kiểm tra các nút và nội dung trước khi gửi đường dẫn cho khách.</p><Link href="/journal/dua-website-len-mang">Mở checklist ra mắt <ArrowRight size={16}/></Link></div>}
          {invoice.status === "pending" && <div className="order-actions"><h3>Chọn cách thanh toán</h3><p>{detail?.gateways.mode === "demo" ? "Ở bước kế tiếp, Stripe yêu cầu nhập thông tin thẻ thử nghiệm; VNPay yêu cầu chọn ngân hàng và nhập OTP thử nghiệm. Tuyệt đối không dùng thông tin thật." : "Trang thanh toán mở tại cổng bảo mật. Trạng thái đơn được xác nhận sau khi cổng gửi kết quả về HOSTORA."}</p><div className="order-gateways">{(["stripe", "vnpay"] as PaymentMethod[]).map((provider) => <button key={provider} type="button" className="button-primary" disabled={Boolean(busy) || !detail?.gateways[provider] || Boolean(invoice.provider && invoice.provider !== provider)} onClick={() => void mutate("checkout", { provider }, provider)}>{provider === "stripe" ? "Thanh toán với Stripe" : "Thanh toán với VNPay"}</button>)}</div>{detail?.gateways.mode === "demo" ? <p className="order-demo-note"><ShieldCheck size={16} /> Môi trường kiểm thử: HOSTORA cập nhật đơn, email và voucher nhưng không thu tiền thật.</p> : !detail?.gateways.stripe && !detail?.gateways.vnpay ? <p className="order-unavailable"><Clock3 size={16} /> Cổng thanh toán sandbox chưa được cấu hình. Hóa đơn chưa bị tính tiền.</p> : null}</div>}
          {invoice.status === "pending" || invoice.status === "paid" ? <div className="order-request"><h3>{invoice.status === "pending" ? "Cần hủy đơn?" : "Cần hoàn tiền?"}</h3><p>{invoice.status === "pending" ? "Nêu lý do trước khi thanh toán. Nếu phiên thanh toán đang mở, chúng tôi sẽ kiểm tra trước khi xác nhận hủy." : "Để bảo vệ đơn hàng, hãy đăng nhập bằng email nhận hóa đơn rồi gửi lý do. Tiền chỉ được ghi nhận đã hoàn khi cổng xác nhận."}</p>{loginRequired ? <p className="order-login-required"><Link href="/account/login?next=%2Forders">Đăng nhập để tiếp tục <ArrowRight size={15} /></Link></p> : null}<label className="label" htmlFor="order-reason">Lý do</label><textarea id="order-reason" className="input" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /><button type="button" className="button-secondary" disabled={Boolean(busy) || reason.trim().length < (invoice.status === "pending" ? 5 : 8)} onClick={() => void mutate(invoice.status === "pending" ? "cancel" : "refund-request", { reason }, invoice.status === "pending" ? "cancel" : "refund")}>{invoice.status === "pending" ? "Gửi yêu cầu hủy" : "Gửi yêu cầu hoàn tiền"}<RotateCcw size={16} /></button></div> : null}
          <div className="order-history"><h3>Lịch sử đơn</h3><ol>{detail?.events.map((event) => <li key={event.id}><span className="order-event-dot"><Check size={11} /></span><div><strong>{event.detail}</strong><time>{new Date(event.createdAt).toLocaleString("vi-VN")}</time></div></li>)}</ol></div>
        </>}
      </section>
    </div>
  </div>;
}
