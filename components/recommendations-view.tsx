"use client";

import {
  AlertTriangle,
  Check,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { RecommendationScore, Requirements } from "@/lib/types";
import { formatVnd } from "@/lib/utils";

const defaults: Requirements = {
  websiteType: "store",
  monthlyVisits: 5000,
  monthlyBudget: 300000,
  needsDomain: true,
  ecommerce: true,
};
const backupLabel = {
  weekly: "Hàng tuần",
  daily: "Hàng ngày",
  "daily-on-demand": "Hàng ngày + theo yêu cầu",
};

export function RecommendationsView() {
  const [items, setItems] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");
  const selectedItem =
    items.find((item) => item.plan.id === selectedPlanId) ?? items[0];
  useEffect(() => {
    const controller = new AbortController();
    let requirements = defaults;
    try {
      requirements = {
        ...defaults,
        ...JSON.parse(localStorage.getItem("hostora:requirements") ?? "{}"),
      };
    } catch {}
    fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requirements),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Catalog chưa sẵn sàng.");
        return r.json();
      })
      .then((o) => {
        if (!Array.isArray(o.recommendations) || o.recommendations.length !== 3)
          throw new Error("Catalog chưa trả đủ ba gói để so sánh.");
        setItems(o.recommendations);
        setLoadError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError("Không kết nối được catalog. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  function saveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const savedLeads = JSON.parse(
        localStorage.getItem("hostora:leads") ?? "[]",
      );
      if (!Array.isArray(savedLeads))
        throw new Error("Dữ liệu lead cục bộ không hợp lệ.");
      savedLeads.unshift({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim(),
        plan: `${selectedItem.plan.provider} ${selectedItem.plan.name}`,
        planId: selectedItem.plan.id,
        createdAt: new Date().toISOString(),
        status: "new",
      });
      localStorage.setItem("hostora:leads", JSON.stringify(savedLeads));
      setLeadError("");
      setSaved(true);
      setName("");
      setPhone("");
    } catch {
      setLeadError(
        "Không lưu được trên trình duyệt này. Hãy kiểm tra bộ nhớ cục bộ rồi thử lại.",
      );
    }
  }
  async function explainRecommendation() {
    setExplaining(true);
    setExplainError("");
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: "recommendation",
          facts: JSON.stringify(items.slice(0, 3)),
        }),
      });
      if (!response.ok) throw new Error("Local AI chưa sẵn sàng.");
      const result = await response.json();
      setExplanation(
        `${result.summary}\n\n${(result.tradeoffs ?? []).map((item: string) => `• ${item}`).join("\n")}\n\nBước tiếp theo: ${result.nextStep}`,
      );
    } catch {
      setExplainError(
        "Không tải được giải thích AI. Điểm và bảng so sánh vẫn dùng dữ liệu catalog.",
      );
    } finally {
      setExplaining(false);
    }
  }
  if (loading)
    return (
      <div
        className="grid gap-5 lg:grid-cols-3"
        role="status"
        aria-live="polite"
      >
        {[0, 1, 2].map((index) => (
          <div key={index} className="panel min-h-[290px] p-6">
            <div className="h-5 w-1/3 rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="mt-7 h-8 w-2/3 rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="mt-7 h-10 w-1/2 rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="mt-8 h-20 rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        ))}
        <div className="sr-only">
          <LoaderCircle /> Đang chấm điểm catalog…
        </div>
      </div>
    );
  if (loadError || !items.length)
    return (
      <div className="panel p-8" role="alert">
        <p className="font-bold">{loadError || "Chưa có dữ liệu đề xuất."}</p>
        <p className="mt-2 text-sm text-slate-600">
          Không hiển thị giá hoặc xếp hạng dự phòng khi catalog không phản hồi.
        </p>
        <button
          className="button-primary mt-5"
          onClick={() => {
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Thử tải lại
        </button>
      </div>
    );
  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-3">
        {items.map((item, i) => (
          <article
            key={item.plan.id}
            className={`relative overflow-hidden rounded-[1.75rem] border bg-white p-6 ${i === 0 ? "border-blue shadow-[0_24px_70px_rgba(49,94,251,.15)]" : "border-slate-200"}`}
          >
            {i === 0 && (
              <div className="absolute inset-x-0 top-0 bg-blue py-2 text-center text-[10px] font-black tracking-[.18em] text-white">
                PHÙ HỢP NHẤT
              </div>
            )}
            <div className={i === 0 ? "pt-5" : ""}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600">
                    {item.plan.provider}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{item.plan.name}</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                  {item.total}/100
                </span>
              </div>
              <p className="mt-6 text-3xl font-black">
                {formatVnd(item.plan.promoMonthlyVnd)}
                <span className="text-sm text-slate-600">/th</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Kỳ ưu đãi {item.plan.billingMonths} tháng · trả trước{" "}
                {formatVnd(item.plan.promoMonthlyVnd * item.plan.billingMonths)}{" "}
                tiền hosting, chưa gồm VAT/add-on.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gia hạn: {formatVnd(item.plan.renewalMonthlyVnd)}/th
              </p>
              <div className="mt-6 space-y-3">
                {item.reasons.map((x) => (
                  <p
                    className="flex gap-2 text-sm leading-6 text-slate-700"
                    key={x}
                  >
                    <Check
                      className="mt-1 shrink-0 text-emerald-600"
                      size={15}
                    />
                    {x}
                  </p>
                ))}
              </div>
              {item.cautions[0] && (
                <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <AlertTriangle className="mr-1 inline" size={14} />
                  {item.cautions[0]}
                </div>
              )}
              <a
                href={item.plan.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue"
              >
                Nguồn · {item.plan.verifiedAt}
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                aria-pressed={selectedItem?.plan.id === item.plan.id}
                onClick={() => {
                  setSelectedPlanId(item.plan.id);
                  setSaved(false);
                }}
                className={`mt-5 block w-full rounded-xl border px-4 py-3 text-sm font-black ${selectedItem?.plan.id === item.plan.id ? "border-blue bg-blue text-white" : "border-slate-200 text-blue hover:border-blue"}`}
              >
                {selectedItem?.plan.id === item.plan.id
                  ? "Đang chọn gói này"
                  : `Chọn ${item.plan.name} để tư vấn`}
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <p className="eyebrow">So sánh 3 gói</p>
          <h2 className="mt-2 text-2xl font-black">
            Dữ liệu gốc, không để LLM sửa số.
          </h2>
        </div>
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Bảng so sánh ba gói"
          tabIndex={0}
        >
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50 p-4">Tiêu chí</th>
                {items.map((x) => (
                  <th className="p-4" key={x.plan.id}>
                    {x.plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Giá ưu đãi",
                  (x: RecommendationScore) => formatVnd(x.plan.promoMonthlyVnd),
                ],
                [
                  "Giá gia hạn",
                  (x: RecommendationScore) =>
                    formatVnd(x.plan.renewalMonthlyVnd),
                ],
                [
                  "Dung lượng",
                  (x: RecommendationScore) =>
                    `${x.plan.storageGb} GB ${x.plan.storageType}`,
                ],
                [
                  "Băng thông",
                  (x: RecommendationScore) =>
                    x.plan.bandwidth ?? "Chưa có dữ liệu",
                ],
                [
                  "SSL",
                  (x: RecommendationScore) =>
                    x.plan.ssl ? "Có" : "Chưa có dữ liệu",
                ],
                [
                  "Backup",
                  (x: RecommendationScore) =>
                    x.plan.backup
                      ? backupLabel[x.plan.backup]
                      : "Chưa có dữ liệu",
                ],
                [
                  "CDN",
                  (x: RecommendationScore) =>
                    x.plan.cdn === true
                      ? "Có"
                      : x.plan.cdn === false
                        ? "Không"
                        : "Chưa có dữ liệu",
                ],
                [
                  "Kỳ ưu đãi",
                  (x: RecommendationScore) => `${x.plan.billingMonths} tháng`,
                ],
                [
                  "E-commerce",
                  (x: RecommendationScore) =>
                    x.plan.ecommerce ? "Có hỗ trợ" : "Chưa xác nhận",
                ],
              ].map(([label, get]) => (
                <tr className="border-t border-slate-100" key={String(label)}>
                  <th className="sticky left-0 bg-white p-4 text-left font-bold">
                    {String(label)}
                  </th>
                  {items.map((x) => (
                    <td className="p-4 text-slate-600" key={x.plan.id}>
                      {(get as (x: RecommendationScore) => string)(x)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
        <div className="mesh-dark rounded-[1.75rem] p-7 text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="text-mint" />
            <h2 className="text-2xl font-black">Vì sao gói đầu đứng số 1?</h2>
          </div>
          <p className="mt-4 leading-7 text-slate-300">
            Điểm tổng được code tính từ ngân sách, tài nguyên ước tính,
            e-commerce, chi phí sở hữu, khả năng mở rộng, backup/bảo mật và độ
            dễ vận hành. AI không được phép thay điểm hoặc giá.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(items[0].breakdown)
              .slice(0, 4)
              .map(([key, value]) => (
                <div className="rounded-xl bg-white/8 p-3" key={key}>
                  <p className="text-[10px] uppercase text-slate-400">{key}</p>
                  <p className="mt-1 text-xl font-black">{Math.round(value)}</p>
                </div>
              ))}
          </div>
          {explanation && (
            <p className="mt-5 whitespace-pre-line rounded-2xl bg-white/8 p-4 text-sm leading-6 text-slate-200">
              {explanation}
            </p>
          )}
          {explainError && (
            <p className="mt-4 text-sm text-amber-200" role="alert">
              {explainError}
            </p>
          )}
          <button
            type="button"
            onClick={explainRecommendation}
            disabled={explaining}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2.5 text-sm font-black text-ink disabled:opacity-50"
          >
            {explaining ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            Vì sao AI chọn gói này?
          </button>
        </div>
        <form onSubmit={saveLead} className="panel p-6">
          <div className="flex items-center gap-2">
            <UserRoundPlus className="text-blue" />
            <h2 className="text-xl font-black">Đăng ký tư vấn</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Gói đang chọn:{" "}
            <strong>
              {selectedItem?.plan.provider} {selectedItem?.plan.name}
            </strong>
          </p>
          {saved ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-emerald-800">
              <ShieldCheck className="mb-2" />
              <p className="font-black">Đã lưu trên trình duyệt này.</p>
              <p className="mt-1 text-sm">
                Không gửi số điện thoại tới AI hoặc cloud.
              </p>
            </div>
          ) : (
            <>
              <label className="mt-5 block">
                <span className="label">Họ tên</span>
                <input
                  required
                  minLength={2}
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="mt-4 block">
                <span className="label">Số điện thoại</span>
                <input
                  required
                  pattern="[0-9 +]{9,15}"
                  inputMode="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <button className="button-primary mt-5 w-full">
                Lưu yêu cầu tư vấn
              </button>
            </>
          )}
          {leadError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {leadError}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
