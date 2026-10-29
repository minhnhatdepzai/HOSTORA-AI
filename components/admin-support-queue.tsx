"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, RefreshCw, Search } from "lucide-react";
import type { AdminCustomerSupportCase, CustomerSupportCase } from "@/lib/customer/types";

const statusLabels: Record<CustomerSupportCase["status"], string> = { new: "Đã tiếp nhận", in_progress: "Đang xử lý", resolved: "Đã giải quyết" };
const categoryLabels: Record<CustomerSupportCase["category"], string> = { order: "Đơn hàng", payment: "Thanh toán", refund: "Hoàn tiền", website: "Website AI", account: "Tài khoản", other: "Khác" };

export function AdminSupportQueue() {
  const [cases, setCases] = useState<AdminCustomerSupportCase[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerSupportCase["status"] | "all">("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function refresh() {
    const response = await fetch("/api/admin/support", { cache: "no-store" });
    if (!response.ok) throw new Error("Chưa tải được yêu cầu hỗ trợ.");
    setCases(((await response.json()) as { cases: AdminCustomerSupportCase[] }).cases);
  }
  useEffect(() => { const timer = window.setTimeout(() => void refresh().catch((cause) => setMessage(cause instanceof Error ? cause.message : "Chưa tải được dữ liệu.")), 0); return () => window.clearTimeout(timer); }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    return cases.filter((item) => (status === "all" || item.status === status) && (!needle || [item.id, item.subject, item.customerName, item.customerEmail, item.message].some((value) => value.toLocaleLowerCase("vi").includes(needle))));
  }, [cases, query, status]);

  async function update(id: string, nextStatus: CustomerSupportCase["status"]) {
    setBusy(id); setMessage("");
    try {
      const response = await fetch("/api/admin/support", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: nextStatus }) });
      const output = await response.json() as { error?: string; supportCase?: AdminCustomerSupportCase };
      if (!response.ok || !output.supportCase) throw new Error(output.error ?? "Chưa cập nhật được.");
      setCases((current) => current.map((item) => item.id === id ? output.supportCase! : item));
      setMessage(`Đã cập nhật ${id}.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Chưa cập nhật được."); }
    finally { setBusy(""); }
  }

  return <main className="admin-support-page">
    <header className="admin-support-header"><div><Link href="/admin"><ArrowLeft size={17} /> Trung tâm quản trị</Link><p>CHĂM SÓC KHÁCH HÀNG</p><h1>Yêu cầu cần được theo dõi đến cùng.</h1><span>Không gửi thêm email cho quản trị. Mọi vấn đề được gom tại đây và đồng bộ trạng thái về tài khoản khách.</span></div><button type="button" onClick={() => void refresh()}><RefreshCw size={17} /> Tải lại</button></header>
    <section className="admin-support-tools"><label><Search size={17} /><input aria-label="Tìm yêu cầu hỗ trợ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, email, chủ đề hoặc nội dung…" /></label><div>{(["all", "new", "in_progress", "resolved"] as const).map((item) => <button key={item} type="button" className={status === item ? "is-active" : ""} onClick={() => setStatus(item)}>{item === "all" ? "Tất cả" : statusLabels[item]}</button>)}</div></section>
    {message ? <p className="admin-support-message" role="status">{message}</p> : null}
    <section className="admin-support-list" aria-label="Danh sách yêu cầu hỗ trợ">{visible.length ? visible.map((item) => <article key={item.id}><div className="admin-support-case-mark"><LifeBuoy size={19} /><span>{item.id}</span></div><div className="admin-support-case-body"><div><span>{categoryLabels[item.category]}</span><time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time></div><h2>{item.subject}</h2><p>{item.message}</p><small>{item.customerName} · {item.customerEmail}</small></div><div className="admin-support-case-action"><label>Trạng thái<select aria-label={`Trạng thái ${item.id}`} value={item.status} disabled={busy === item.id} onChange={(event) => void update(item.id, event.target.value as CustomerSupportCase["status"])}><option value="new">Đã tiếp nhận</option><option value="in_progress">Đang xử lý</option><option value="resolved">Đã giải quyết</option></select></label><em>{statusLabels[item.status]}</em></div></article>) : <div className="admin-support-empty"><LifeBuoy size={30} /><h2>Không có yêu cầu phù hợp</h2><p>Thử đổi từ khóa hoặc trạng thái lọc.</p></div>}</section>
  </main>;
}
