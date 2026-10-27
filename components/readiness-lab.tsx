"use client";

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleHelp,
  Gauge,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  DomainStatus,
  ProjectStage,
  ReadinessInput,
} from "@/lib/readiness";

type Report = {
  score: number;
  band: { id: string; label: string; copy: string };
  dimensions: Array<{
    id: string;
    label: string;
    score: number;
    max: number;
    percent: number;
    note: string;
  }>;
  blockers: string[];
  recommendation: {
    provider: string;
    name: string;
    fitScore: number;
    promoMonthlyVnd: number;
    renewalMonthlyVnd: number | null;
    billingMonths: number;
    sourceUrl: string;
    verifiedAt: string;
  };
  ai: {
    headline: string;
    summary: string;
    strengths: string[];
    nextActions: string[];
    judgeQuestions: string[];
  };
  aiMode: "local-ai" | "deterministic-fallback";
  retrievalMode: string;
  sources: Array<{
    citation: string;
    title: string;
    sourceUrl: string;
    verifiedAt: string;
  }>;
  disclaimer: string;
};

const defaults: ReadinessInput = {
  websiteType: "store",
  monthlyVisits: 5000,
  monthlyBudget: 300000,
  stage: "building",
  deadlineWeeks: 4,
  domainStatus: "need",
  contentReady: false,
  seoKeywordReady: false,
  analyticsReady: false,
  backupOwner: false,
  paymentReady: false,
  teamCanOperate: false,
};
const stages: Array<[ProjectStage, string]> = [
  ["idea", "Mới có ý tưởng"],
  ["content", "Chuẩn bị nội dung"],
  ["building", "Đang xây website"],
  ["live", "Đã chạy thật"],
];
const domains: Array<[DomainStatus, string]> = [
  ["need", "Chưa có"],
  ["owned", "Đã sở hữu"],
  ["connected", "Đã kết nối"],
];
const checks = [
  ["contentReady", "Nội dung/sản phẩm", "Đủ dữ liệu để nhập lên website"],
  ["seoKeywordReady", "Từ khóa SEO", "Có nhóm từ khóa và ý định tìm kiếm"],
  ["analyticsReady", "Đo lường", "Có analytics và conversion"],
  ["backupOwner", "Backup", "Có người chịu trách nhiệm backup/restore"],
  ["paymentReady", "Thanh toán", "Đã chuẩn bị luồng đặt hàng/thanh toán"],
  ["teamCanOperate", "Vận hành", "Có người cập nhật và xử lý sự cố"],
] as const;

export function ReadinessLab() {
  const [form, setForm] = useState(defaults);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem("hostora:requirements") ?? "null",
        );
        if (saved)
          setForm((current) => ({
            ...current,
            websiteType: saved.websiteType ?? current.websiteType,
            monthlyVisits: saved.monthlyVisits ?? current.monthlyVisits,
            monthlyBudget: saved.monthlyBudget ?? current.monthlyBudget,
            domainStatus: saved.needsDomain ? "need" : "owned",
          }));
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function analyze() {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch("/api/ai/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const output = await response.json();
      if (!response.ok)
        throw new Error(output.error ?? "Không thể chấm hồ sơ website.");
      setReport(output);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể chấm hồ sơ website.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[.43fr_.57fr]">
      <section className="panel h-fit p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink text-mint">
            <Gauge size={23} />
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
            KIỂM TRA MỨC SẴN SÀNG
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-black">Hồ sơ dự án</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Không cần tên, email hay số điện thoại. Điểm được tính theo tiêu chí
          cố định; AI trên máy giúp xem lại kế hoạch.
        </p>

        <FieldLabel>Loại website</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["store", "Bán hàng"],
              ["company", "Giới thiệu"],
              ["blog", "Blog"],
            ] as const
          ).map(([value, label]) => (
            <Choice
              key={value}
              active={form.websiteType === value}
              label={label}
              onClick={() => setForm({ ...form, websiteType: value })}
            />
          ))}
        </div>

        <FieldLabel>Giai đoạn hiện tại</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {stages.map(([value, label]) => (
            <Choice
              key={value}
              active={form.stage === value}
              label={label}
              onClick={() => setForm({ ...form, stage: value })}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Lượt truy cập/tháng</span>
            <input
              aria-label="Lượt truy cập mỗi tháng"
              className="input mt-2"
              type="number"
              min={1}
              value={form.monthlyVisits}
              onChange={(event) =>
                setForm({ ...form, monthlyVisits: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span className="label">Ngân sách/tháng</span>
            <input
              aria-label="Ngân sách mỗi tháng"
              className="input mt-2"
              type="number"
              min={10000}
              value={form.monthlyBudget}
              onChange={(event) =>
                setForm({ ...form, monthlyBudget: Number(event.target.value) })
              }
            />
          </label>
        </div>

        <FieldLabel>Thời gian tới khi ra mắt</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 4, 8].map((weeks) => (
            <Choice
              key={weeks}
              active={form.deadlineWeeks === weeks}
              label={`${weeks} tuần`}
              onClick={() => setForm({ ...form, deadlineWeeks: weeks })}
            />
          ))}
        </div>

        <FieldLabel>Tình trạng tên miền</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {domains.map(([value, label]) => (
            <Choice
              key={value}
              active={form.domainStatus === value}
              label={label}
              onClick={() => setForm({ ...form, domainStatus: value })}
            />
          ))}
        </div>

        <FieldLabel>Việc đã chuẩn bị</FieldLabel>
        <div className="space-y-2">
          {checks
            .filter(
              ([key]) => key !== "paymentReady" || form.websiteType === "store",
            )
            .map(([key, label, copy]) => (
              <button
                key={key}
                type="button"
                aria-pressed={form[key]}
                onClick={() => setForm({ ...form, [key]: !form[key] })}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${form[key] ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-xl ${form[key] ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  <Check size={16} />
                </span>
                <span>
                  <strong className="block text-sm">{label}</strong>
                  <span className="text-xs leading-5 text-slate-500">
                    {copy}
                  </span>
                </span>
              </button>
            ))}
        </div>

        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="button-primary mt-6 w-full"
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <BrainCircuit size={18} />
          )}
          {loading
            ? "Đang đánh giá dự án…"
            : "Xem mức sẵn sàng"}
        </button>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </section>

      <section aria-live="polite">
        {!report ? (
          <div className="panel grid min-h-[620px] place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-blue/10 text-blue">
                <Sparkles size={28} />
              </span>
              <h2 className="mt-5 text-2xl font-black">
                Một điểm số, một lộ trình rõ
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Kết quả chỉ ra điểm mạnh, điểm nghẽn, gói đang khớp và ba câu
                câu hỏi giúp bạn rà lại kế hoạch trước khi ra mắt.
              </p>
            </div>
          </div>
        ) : (
          <ReportView report={report} />
        )}
      </section>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-5">
      <article className="mesh-dark overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid size-32 shrink-0 place-items-center rounded-full border-[10px] border-mint/80 bg-white/5">
            <div className="text-center">
              <p className="text-4xl font-black">{report.score}</p>
              <p className="text-xs font-bold text-slate-400">/100</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-mint">
              {report.aiMode === "local-ai"
                ? "ĐÃ CÓ NHẬN XÉT TỪ AI TRÊN MÁY"
                : "ĐIỂM VẪN ĐƯỢC TÍNH KHI AI CHƯA SẴN SÀNG"}
            </p>
            <h2 className="mt-2 text-3xl font-black">{report.band.label}</h2>
            <p className="mt-2 leading-7 text-slate-300">{report.band.copy}</p>
          </div>
        </div>
      </article>

      <div className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">Bản đồ sẵn sàng</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            Tính theo tiêu chí cố định
          </span>
        </div>
        <div className="mt-5 space-y-5">
          {report.dimensions.map((item) => (
            <div key={item.id}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-extrabold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.note}
                  </p>
                </div>
                <strong className="shrink-0 text-sm">
                  {item.score}/{item.max}
                </strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-blue/10 text-blue">
            <BrainCircuit size={19} />
          </span>
          <div>
            <p className="eyebrow">Gợi ý cho dự án</p>
            <h3 className="font-black">{report.ai.headline}</h3>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          {report.ai.summary}
        </p>
        <h4 className="mt-6 font-black">Kế hoạch ưu tiên</h4>
        <ol className="mt-3 space-y-3">
          {report.ai.nextActions.map((action, index) => (
            <li className="flex gap-3 text-sm leading-6" key={action}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-black text-mint">
                {index + 1}
              </span>
              {action}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={18} />
            <h3 className="font-black">Điểm nghẽn</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {(report.blockers.length
              ? report.blockers
              : ["Không có blocker lớn trong checklist hiện tại."]
            ).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-2 text-blue">
            <ShieldCheck size={18} />
            <h3 className="font-black">Gói đang khớp</h3>
          </div>
          <p className="mt-4 text-lg font-black">
            {report.recommendation.provider} {report.recommendation.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Độ phù hợp {report.recommendation.fitScore}/100 · kỳ{" "}
            {report.recommendation.billingMonths} tháng
          </p>
          <p className="mt-3 text-sm font-bold">
            {report.recommendation.promoMonthlyVnd.toLocaleString("vi-VN")}
            đ/tháng
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-xs font-black text-blue underline"
            href="/services?category=hosting"
          >
            Đặt mua qua HOSTORA
            <ArrowRight size={13} />
          </Link>
          <p className="mt-2 text-xs text-slate-500">
            HOSTORA kiểm tra dữ liệu ngày {report.recommendation.verifiedAt}
          </p>
        </div>
      </div>

      <div className="panel border-violet-200 bg-violet-50/60 p-6">
        <div className="flex items-center gap-2 text-violet-800">
          <CircleHelp size={20} />
          <h3 className="text-lg font-black">AI phản biện như giám khảo</h3>
        </div>
        <div className="mt-4 space-y-3">
          {report.ai.judgeQuestions.map((question, index) => (
            <p
              className="rounded-2xl bg-white p-4 text-sm font-semibold leading-6"
              key={question}
            >
              <span className="mr-2 text-violet-600">Q{index + 1}.</span>
              {question}
            </p>
          ))}
        </div>
      </div>

      <div className="panel p-5 text-xs leading-5 text-slate-500">
        <p>{report.disclaimer}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {report.sources.map((source) => (
            <span
              key={source.citation}
              className="font-bold text-slate-600"
            >
              [{source.citation}] {source.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="label mb-2 mt-5">{children}</p>;
}

function Choice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${active ? "border-blue bg-blue text-white" : "border-slate-200 bg-white text-slate-600"}`}
    >
      {label}
    </button>
  );
}
