"use client";

import {
  AlertTriangle,
  Check,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecommendationScore, Requirements } from "@/lib/types";
import { formatVnd } from "@/lib/utils";
import { normalizeContact } from "@/shared/contact";
import { adminLeadSchema, mergeStoredLeads, readStoredLeads } from "@/lib/local-admin";
import { recommendationDecision } from "@/lib/recommendation";
import { featureState } from "@/lib/advisor-explanation";

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
  const [requirements, setRequirements] = useState(defaults);
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
        if (!r.ok) throw new Error("Bảng giá chưa sẵn sàng.");
        return r.json();
      })
      .then((o) => {
        if (!Array.isArray(o.recommendations) || o.recommendations.length !== 3)
          throw new Error("Chưa nhận đủ ba gói để so sánh.");
        setItems(o.recommendations);
        setRequirements(o.requirements);
        setLoadError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError("Chưa tải được bảng giá. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  function saveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    const contact = normalizeContact({ name, phone });
    if (contact.error) { setLeadError(contact.error); return; }
    try {
      const raw = localStorage.getItem("hostora:leads");
      const savedLeads = readStoredLeads(raw);
      savedLeads.unshift(adminLeadSchema.parse({
        id: crypto.randomUUID(),
        name: contact.name,
        phone: contact.phone,
        plan: `${selectedItem.plan.provider} ${selectedItem.plan.name}`,
        planId: selectedItem.plan.id,
        createdAt: new Date().toISOString(),
        status: "new",
      }));
      localStorage.setItem("hostora:leads", mergeStoredLeads(raw, savedLeads));
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
          requirements,
        }),
      });
      if (!response.ok) throw new Error("Local AI chưa sẵn sàng.");
      const result = await response.json();
      setExplanation(
        `${result.aiAvailable === false ? "Trợ lý đang bận. Đây là giải thích từ dữ liệu đã kiểm tra.\n\n" : ""}${result.summary}\n\n${(result.tradeoffs ?? []).map((item: string) => `• ${item}`).join("\n")}\n\nBước tiếp theo: ${result.nextStep}`,
      );
    } catch {
      setExplainError(
        "Chưa tải được giải thích. Bạn vẫn có thể xem giá và điều kiện trong bảng so sánh.",
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
          <LoaderCircle /> Đang so sánh các gói…
        </div>
      </div>
    );
  if (loadError || !items.length)
    return (
      <div className="panel p-8" role="alert">
        <p className="font-bold">{loadError || "Chưa có dữ liệu đề xuất."}</p>
        <p className="mt-2 text-sm text-slate-600">
          Không hiển thị giá hoặc xếp hạng dự phòng khi chưa tải được bảng giá.
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
      <section className={`rounded-2xl border p-5 ${recommendationDecision(items).status === "no-match" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`} aria-label="Kết luận theo ngân sách">
        <h2 className="text-lg font-black">{recommendationDecision(items).status === "no-match" ? "Chưa có gói đáp ứng ngân sách này" : "Có gói đáp ứng ngân sách lưu trữ"}</h2>
        <p className="mt-2 text-sm leading-6">{recommendationDecision(items).message}</p>
        <p className="mt-2 text-sm">Ngân sách hosting: {formatVnd(requirements.monthlyBudget)}/tháng · Trả trước tối đa: {requirements.upfrontBudget === undefined ? "Chưa xác nhận" : formatVnd(requirements.upfrontBudget)}.</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">Điểm và thứ tự chỉ giúp so sánh theo thông tin đã công bố, không phải cam kết hiệu năng hay tổng giá thanh toán.</p>
        <Link href="/consultation" className="mt-3 inline-block font-bold text-blue underline">Sửa nhu cầu và ngân sách</Link>
      </section>
      <div className="grid gap-5 lg:grid-cols-3">
        {items.map((item, i) => (
          <article
            key={item.plan.id}
            className={`relative overflow-hidden rounded-2xl border bg-white p-5 sm:p-6 ${i === 0 ? "border-blue shadow-[0_16px_40px_rgba(17,105,94,.12)]" : "border-slate-200"}`}
          >
            {i === 0 && (
              <div className="absolute inset-x-0 top-0 bg-blue py-2 text-center text-[10px] font-black tracking-[.18em] text-white">
                {item.eligibility === "eligible" ? "ƯU TIÊN THEO NGÂN SÁCH LƯU TRỮ" : "PHƯƠNG ÁN THAM KHẢO"}
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
                <span className="text-sm text-slate-600">/tháng</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Kỳ ưu đãi {item.plan.billingMonths} tháng · trả trước{" "}
                {formatVnd(item.plan.promoMonthlyVnd * item.plan.billingMonths)}{" "}
                tiền hosting, chưa gồm thuế và dịch vụ bổ sung.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gia hạn: {formatVnd(item.plan.renewalMonthlyVnd)}/tháng
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
              {item.eligibility !== "eligible" && <p className="mt-3 text-sm font-bold text-amber-800">Chỉ tham khảo · chưa đáp ứng đủ điều kiện</p>}
              {item.cautions.length > 0 && (
                <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  <AlertTriangle className="mr-1 inline" size={14} />
                  {item.cautions[0]}
                  <details className="mt-2"><summary className="cursor-pointer font-bold">Xem toàn bộ điều kiện</summary><ul className="mt-2 list-disc space-y-1 pl-4">{item.cautions.slice(1).map((caution) => <li key={caution}>{caution}</li>)}</ul></details>
                </div>
              )}
              <p className="mt-5 text-xs font-bold text-slate-500">
                HOSTORA kiểm tra ngày {item.plan.verifiedAt}
              </p>
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
              <Link
                href="/services?category=hosting"
                className="mt-3 block w-full rounded-xl bg-ink px-4 py-3 text-center text-sm font-black text-white"
              >
                Đặt mua qua HOSTORA
              </Link>
            </div>
          </article>
        ))}
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <p className="eyebrow">So sánh 3 gói</p>
          <h2 className="mt-2 text-2xl font-black">
            Giá, kỳ hạn và những gì bạn nhận được.
          </h2>
          <p className="mt-2 text-sm text-slate-600">Vuốt ngang để xem đủ ba gói. “Chưa xác minh” nghĩa là chưa đủ thông tin, không có nghĩa tính năng không tồn tại.</p>
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
                    featureState(x.plan.ssl),
                ],
                [
                  "Sao lưu",
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
                  "Bán hàng trực tuyến",
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
            <h2 className="text-2xl font-black">Vì sao có thứ tự này?</h2>
          </div>
          <p className="mt-4 leading-7 text-slate-300">
            Gói đáp ứng ngân sách được ưu tiên trước. Điểm giúp so sánh chi phí,
            nhu cầu bán hàng, sao lưu và độ dễ vận hành; không phải phần trăm
            bảo đảm phù hợp hay cam kết sức chịu tải. Chưa nhập tiền trả trước
            thì cần xác nhận khoản này trước khi mua.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(items[0].breakdown)
              .slice(0, 4)
              .map(([key, value]) => (
                <div className="rounded-xl bg-white/8 p-3" key={key}>
                  <p className="text-[10px] uppercase text-slate-400">{{ budget: "Ngân sách", resources: "Tài nguyên cần xác nhận", ecommerce: "Bán hàng", ownership: "Chi phí dài hạn" }[key as "budget"] ?? key}</p>
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
            Giải thích các gói cho tôi
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
                Thông tin liên hệ chỉ lưu tại đây; chưa gửi cho nhân viên. Để được hỗ trợ, hãy gửi yêu cầu từ trang tài khoản.
              </p>
              <Link href="/account" className="mt-3 inline-block font-bold underline">Gửi yêu cầu hỗ trợ</Link>
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
                  maxLength={30}
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
