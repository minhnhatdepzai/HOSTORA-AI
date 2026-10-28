"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, LifeBuoy, LogOut, Sparkles, TicketCheck } from "lucide-react";
import type { CustomerAccount, CustomerOrderSummary, CustomerSupportCase, CustomerVoucher } from "@/lib/customer/types";

type SessionData = {
  customer: CustomerAccount;
  vouchers: CustomerVoucher[];
  orders: CustomerOrderSummary[];
  supportCases: CustomerSupportCase[];
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const orderStatus: Record<CustomerOrderSummary["status"], string> = {
  pending: "Chờ thanh toán", cancel_requested: "Đang xem yêu cầu hủy", paid: "Đã thanh toán",
  refund_requested: "Chờ duyệt hoàn tiền", refund_pending: "Đang hoàn tiền", refunded: "Đã hoàn tiền", cancelled: "Đã hủy",
};
const supportStatus: Record<CustomerSupportCase["status"], string> = { new: "Đã tiếp nhận", in_progress: "Đang xử lý", resolved: "Đã giải quyết" };

export function CustomerAccountPortal({ initialCustomer }: { initialCustomer: CustomerAccount }) {
  const router = useRouter();
  const [data, setData] = useState<SessionData>({ customer: initialCustomer, vouchers: [], orders: [], supportCases: [] });
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<CustomerSupportCase["category"]>("order");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());

  async function refresh() {
    const response = await fetch("/api/account/session", { cache: "no-store" });
    if (response.status === 401) { router.replace("/account/login"); return; }
    if (!response.ok) throw new Error("Chưa tải được sổ dịch vụ.");
    setData(await response.json() as SessionData);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
        .catch(() => setNotice("Chưa tải được dữ liệu mới nhất."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeVouchers = useMemo(() => data.vouchers.filter((voucher) => voucher.status === "active" && new Date(voucher.expiresAt).valueOf() > openedAt), [data.vouchers, openedAt]);

  async function sendSupport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/account/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject, category, message }) });
      const output = await response.json() as { error?: string; supportCase?: CustomerSupportCase };
      if (!response.ok) throw new Error(output.error ?? "Chưa gửi được yêu cầu.");
      setSubject(""); setMessage(""); setNotice(`Đã tạo yêu cầu ${output.supportCase?.id ?? "hỗ trợ"}. HOSTORA sẽ phản hồi qua email.`); await refresh();
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Chưa gửi được yêu cầu."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/account/session", { method: "DELETE" });
    router.replace("/account/login"); router.refresh();
  }

  return (
    <div className="customer-account-page">
      <header className="customer-account-hero">
        <div><p>SỔ DỊCH VỤ / {data.customer.email}</p><h1>Chào {data.customer.name}.</h1><span>Voucher, đơn hàng và những việc HOSTORA đang hỗ trợ bạn nằm cùng một chỗ.</span></div>
        <button type="button" onClick={() => void logout()}><LogOut size={17} /> Đăng xuất</button>
      </header>
      <nav className="customer-account-actions" aria-label="Việc thường làm">
        <Link href="/website-studio"><Sparkles size={21} /><span><strong>Tạo website với AI</strong><small>Bản tạo mới được giữ theo tài khoản này.</small></span><ArrowRight size={18} /></Link>
        <Link href="/orders"><BookOpen size={21} /><span><strong>Tra cứu hóa đơn</strong><small>Mở chi tiết bằng mã riêng trong email.</small></span><ArrowRight size={18} /></Link>
      </nav>
      <div className="customer-account-ledger">
        <section className="customer-voucher-section" aria-labelledby="voucher-title">
          <div className="customer-section-heading"><TicketCheck size={22} /><div><p>VÍ ƯU ĐÃI</p><h2 id="voucher-title">{activeVouchers.length ? `${activeVouchers.length} voucher sẵn sàng` : "Chưa có voucher mới"}</h2></div></div>
          <p className="customer-section-copy">Đơn từ 1.000.000đ đã thanh toán sẽ phát voucher. Khi bạn đặt mua bằng đúng email tài khoản, hệ thống tự chọn voucher còn hiệu lực.</p>
          <div className="customer-voucher-stack">
            {data.vouchers.length ? data.vouchers.map((voucher) => <article key={voucher.code} className={`customer-voucher-ticket is-${voucher.status}`}><div><small>{voucher.status === "active" ? "SẴN SÀNG" : voucher.status === "redeemed" ? "ĐÃ DÙNG" : "KHÔNG CÒN HIỆU LỰC"}</small><strong>{voucher.code}</strong><span>Giảm {money(voucher.amountVnd)} · đơn từ {money(voucher.minOrderVnd)}</span></div><time><CalendarDays size={15} /> {new Date(voucher.expiresAt).toLocaleDateString("vi-VN")}</time></article>) : <div className="customer-account-empty">Voucher mới sẽ tự xuất hiện sau khi đơn đủ điều kiện được thanh toán.</div>}
          </div>
        </section>
        <section className="customer-orders-section" aria-labelledby="account-orders-title">
          <div className="customer-section-heading"><BookOpen size={22} /><div><p>NHẬT KÝ MUA HÀNG</p><h2 id="account-orders-title">Đơn gần đây</h2></div></div>
          <div className="customer-order-list">{data.orders.length ? data.orders.map((order) => <div key={order.id}><span><strong>{order.title}</strong><small>{order.id} · {new Date(order.updatedAt).toLocaleDateString("vi-VN")}</small></span><span><strong>{money(order.amountVnd)}</strong><small>{orderStatus[order.status]}</small></span></div>) : <div className="customer-account-empty">Chưa có hóa đơn gắn với email này.</div>}</div>
        </section>
      </div>
      <section className="customer-support-section" aria-labelledby="support-title">
        <div className="customer-support-intro"><LifeBuoy size={26} /><p>CHĂM SÓC KHÁCH HÀNG</p><h2 id="support-title">Có vấn đề? Gửi một yêu cầu rõ ràng.</h2><span>Mỗi yêu cầu có mã riêng để bạn biết HOSTORA đã nhận và đang xử lý tới đâu.</span></div>
        <form onSubmit={sendSupport}>
          <label>Nhóm vấn đề<select value={category} onChange={(event) => setCategory(event.target.value as CustomerSupportCase["category"])}><option value="order">Đơn hàng</option><option value="payment">Thanh toán</option><option value="refund">Hoàn tiền</option><option value="website">Website AI</option><option value="account">Tài khoản</option><option value="other">Vấn đề khác</option></select></label>
          <label>Tiêu đề<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={5} maxLength={140} required /></label>
          <label>Mô tả điều đã xảy ra<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={20} maxLength={2000} rows={5} required /></label>
          {notice ? <p role="status" className="customer-support-notice">{notice}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu hỗ trợ"}<ArrowRight size={17} /></button>
        </form>
        <div className="customer-support-history"><h3>Yêu cầu đã gửi</h3>{loading ? <p>Đang tải…</p> : data.supportCases.length ? data.supportCases.map((item) => <article key={item.id}><span><strong>{item.subject}</strong><small>{item.id} · {new Date(item.createdAt).toLocaleString("vi-VN")}</small></span><em>{supportStatus[item.status]}</em></article>) : <p>Chưa có yêu cầu hỗ trợ.</p>}</div>
      </section>
    </div>
  );
}
