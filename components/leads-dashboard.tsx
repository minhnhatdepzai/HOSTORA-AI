"use client";

import { Bot, Phone, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
type Lead = {
  id: string;
  name: string;
  phone: string;
  plan: string;
  createdAt: string;
  status: string;
  intelligence?: {
    segment:
      "new-site" | "upgrade" | "price-sensitive" | "technical-consulting";
    unansweredQuestions: string[];
    suggestedNextMessage: string;
  };
};
const segmentLabels = {
  "new-site": "Website mới",
  upgrade: "Đang nâng cấp",
  "price-sensitive": "Nhạy cảm giá",
  "technical-consulting": "Cần kỹ thuật",
};
export function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setLeads(JSON.parse(localStorage.getItem("hostora:leads") ?? "[]"));
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  function remove(id: string) {
    if (!confirm("Xóa lead này khỏi trình duyệt?")) return;
    const next = leads.filter((x) => x.id !== id);
    setLeads(next);
    localStorage.setItem("hostora:leads", JSON.stringify(next));
  }
  async function classify(lead: Lead) {
    setClassifying(lead.id);
    setError("");
    try {
      const requirements = JSON.parse(
        localStorage.getItem("hostora:requirements") ?? "{}",
      );
      const response = await fetch("/api/ai/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: lead.plan,
          websiteType: requirements.websiteType ?? "store",
          monthlyBudget: requirements.monthlyBudget ?? 0,
          monthlyVisits: requirements.monthlyVisits ?? 0,
          notes: requirements.notes ?? "",
        }),
      });
      if (!response.ok) throw new Error("Local AI chưa sẵn sàng để phân loại.");
      const intelligence = await response.json();
      const next = leads.map((item) =>
        item.id === lead.id ? { ...item, intelligence } : item,
      );
      setLeads(next);
      localStorage.setItem("hostora:leads", JSON.stringify(next));
    } catch {
      setError(
        "Không phân loại được lead lúc này. Dữ liệu khách vẫn nằm trên trình duyệt.",
      );
    } finally {
      setClassifying(null);
    }
  }
  return (
    <div className="space-y-6">
      {error && (
        <p
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Tổng lead", leads.length],
          ["Mới", leads.filter((x) => x.status === "new").length],
          ["Lưu trữ", "localStorage"],
        ].map(([label, value]) => (
          <div className="panel p-5" key={String(label)}>
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <Users className="text-blue" />
            <h2 className="text-xl font-black">Danh sách khách hàng</h2>
          </div>
          <span className="text-xs text-slate-400">
            Chỉ trên trình duyệt này
          </span>
        </div>
        {leads.length === 0 ? (
          <div className="grid min-h-64 place-items-center text-center text-slate-400">
            <div>
              <Users className="mx-auto" />
              <p className="mt-3 font-bold">Chưa có đăng ký tư vấn</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.map((x) => (
              <article
                className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
                key={x.id}
              >
                <div>
                  <p className="font-black">{x.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Phone size={14} />
                    {x.phone}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-bold text-blue">
                    Quan tâm: {x.plan}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(x.createdAt).toLocaleString("vi-VN")}
                  </p>
                  {x.intelligence && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {x.intelligence.suggestedNextMessage}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => classify(x)}
                    disabled={classifying === x.id}
                    title="Chỉ gửi nhu cầu, không gửi tên hoặc số điện thoại"
                    className="flex items-center gap-1 rounded-full bg-violet/10 px-3 py-1 text-xs font-bold text-violet"
                  >
                    <Bot size={13} />
                    {classifying === x.id
                      ? "Đang phân loại…"
                      : x.intelligence
                        ? segmentLabels[x.intelligence.segment]
                        : "AI phân loại"}
                  </button>
                  <button
                    onClick={() => remove(x.id)}
                    aria-label={`Xóa ${x.name}`}
                    className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-slate-500">
        Nhãn AI là suy luận hỗ trợ tư vấn, không phải đánh giá con người. API
        chỉ nhận nhu cầu đã nhập; tên và số điện thoại không được gửi tới AI.
      </p>
    </div>
  );
}
