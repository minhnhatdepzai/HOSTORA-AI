"use client";

import {
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Globe2,
  LoaderCircle,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";

type Finding = {
  id: string;
  group: "indexability" | "content" | "technical" | "social" | "geo";
  label: string;
  status: "pass" | "warning" | "fail";
  impact: "high" | "medium" | "low";
  detail: string;
};
type AuditResult = {
  url: string;
  title: string | null;
  wordCount: number;
  scores: { overall: number; seo: number; aiVisibility: number };
  findings: Finding[];
  aiCrawlers: {
    id: string;
    vendor: string;
    status: "allowed" | "blocked";
    via: "specific" | "wildcard" | "default";
  }[];
  aiCategories: { id: string; label: string; weight: number; earned: number }[];
  aiDocuments: { llmsTxt: boolean; llmsFullTxt: boolean };
  ai: {
    executiveSummary: string;
    priorities: string[];
    contentIdeas: string[];
  };
  automationPlan: {
    id: string;
    priority: "P0" | "P1" | "P2";
    mode: "draft" | "verify";
    title: string;
    action: string;
    acceptance: string;
    evidence: string;
    draft: string | null;
  }[];
  sources: {
    citation: string;
    title: string;
    sourceUrl: string;
    verifiedAt: string;
  }[];
  limits: string[];
};

const groupLabels: Record<Finding["group"], string> = {
  indexability: "Lập chỉ mục",
  content: "Nội dung",
  technical: "Kỹ thuật",
  social: "Chia sẻ",
  geo: "AI hiểu website",
};
const statusLabels = {
  pass: "Đã đạt",
  warning: "Cần xem lại",
  fail: "Cần sửa",
} as const;
const viaLabels = {
  specific: "Quy tắc riêng",
  wildcard: "Quy tắc chung",
  default: "Mặc định",
} as const;

function Score({
  label,
  value,
  copy,
  primary = false,
}: {
  label: string;
  value: number;
  copy: string;
  primary?: boolean;
}) {
  const tone =
    value >= 80
      ? "text-emerald-700"
      : value >= 60
        ? "text-amber-700"
        : "text-red-700";
  return (
    <article
      className={
        primary
          ? "rounded-2xl bg-ink p-5 text-white"
          : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <p
        className={`text-xs font-black tracking-[.13em] uppercase ${primary ? "text-mint" : "text-slate-500"}`}
      >
        {label}
      </p>
      <div className="mt-3 flex items-end gap-1">
        <strong
          className={`text-5xl leading-none font-black tabular-nums ${primary ? "text-white" : tone}`}
        >
          {value}
        </strong>
        <span
          className={`pb-1 text-sm font-bold ${primary ? "text-slate-300" : "text-slate-500"}`}
        >
          /100
        </span>
      </div>
      <p
        className={`mt-3 text-sm leading-6 ${primary ? "text-slate-300" : "text-slate-600"}`}
      >
        {copy}
      </p>
    </article>
  );
}

function DocumentBadge({
  label,
  present,
}: {
  label: string;
  present: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${present ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
    >
      <span
        className={`flex items-center gap-1.5 text-xs font-black ${present ? "text-emerald-800" : "text-amber-900"}`}
      >
        {present ? (
          <CheckCircle2 aria-hidden="true" size={14} />
        ) : (
          <TriangleAlert aria-hidden="true" size={14} />
        )}
        {present ? "Đã có" : "Chưa thấy"}
      </span>
      <p className="mt-1 break-all text-xs font-bold text-slate-700">{label}</p>
    </div>
  );
}

function Report({ result }: { result: AuditResult }) {
  return (
    <div className="space-y-5" aria-live="polite">
      <section className="panel p-5 sm:p-7">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-black tracking-[.14em] text-teal uppercase">
            Báo cáo khả năng được tìm thấy
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            {result.title || "Website chưa có tên trang"}
          </h2>
          <p className="mt-2 break-all text-sm text-slate-500">
            {result.url} · {result.wordCount.toLocaleString("vi-VN")} từ
          </p>
        </div>
        <div
          className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]"
          role="region"
          aria-label="Ba điểm đánh giá"
        >
          <Score
            label="Điểm tổng quan"
            value={result.scores.overall}
            copy="Cân bằng khả năng xuất hiện trên Google và mức sẵn sàng cho AI."
            primary
          />
          <Score
            label="SEO Google"
            value={result.scores.seo}
            copy="Nội dung, lập chỉ mục, di động và nền tảng kỹ thuật công khai."
          />
          <Score
            label="AI có thể đọc và hiểu"
            value={result.scores.aiVisibility}
            copy="Crawler, thực thể thương hiệu, llms.txt và dữ liệu cấu trúc."
          />
        </div>
        <div className="mt-4 flex gap-3 rounded-2xl bg-slate-50 p-4">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-blue"
            size={20}
          />
          <div>
            <h3 className="font-black">HOSTORA tóm tắt</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {result.ai.executiveSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-black tracking-[.13em] text-red-700 uppercase">
            Xếp theo ảnh hưởng
          </p>
          <h2 className="mt-1 text-2xl font-black">Việc nên làm trước</h2>
        </div>
        {result.automationPlan.length ? (
          <ol className="divide-y divide-slate-200">
            {result.automationPlan.map((task, index) => (
              <li
                className="grid gap-3 py-5 sm:grid-cols-[2.75rem_1fr]"
                key={task.id}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-ink text-sm font-black text-mint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{task.title}</h3>
                    <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {task.action}
                  </p>
                  <p className="mt-2 text-xs leading-5 font-bold text-slate-500">
                    Hoàn thành khi: {task.acceptance}
                  </p>
                  {task.draft ? (
                    <code className="mt-3 block overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-mint">
                      {task.draft}
                    </code>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-5 text-sm text-slate-600">
            Chưa có lỗi ưu tiên từ lần kiểm tra này.
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="panel p-5 sm:p-7">
          <p className="text-xs font-black tracking-[.13em] text-blue uppercase">
            AI visibility
          </p>
          <h2 className="mt-1 text-xl font-black">
            AI đọc website qua những gì?
          </h2>
          <div className="mt-5 space-y-4">
            {result.aiCategories.map((category) => {
              const percent = Math.round(
                (category.earned / category.weight) * 100,
              );
              return (
                <div key={category.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold">{category.label}</span>
                    <span className="font-black tabular-nums text-slate-600">
                      {category.earned.toLocaleString("vi-VN")}/
                      {category.weight}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    aria-label={`${category.label}: ${percent}%`}
                  >
                    <div
                      className="h-full rounded-full bg-blue transition-[width] duration-500 motion-reduce:transition-none"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <DocumentBadge
              label="llms.txt"
              present={result.aiDocuments.llmsTxt}
            />
            <DocumentBadge
              label="llms-full.txt"
              present={result.aiDocuments.llmsFullTxt}
            />
          </div>
        </section>

        <section className="panel overflow-hidden p-5 sm:p-7">
          <p className="text-xs font-black tracking-[.13em] text-teal uppercase">
            Quyền truy cập công khai
          </p>
          <h2 className="mt-1 text-xl font-black">
            ChatGPT, Claude và các bot khác
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            “Cho phép” chỉ nghĩa là bot có thể đọc trang công khai, không bảo
            đảm thương hiệu sẽ được đề xuất.
          </p>
          <div
            className="mt-5 grid gap-2 sm:hidden"
            role="list"
            aria-label="Quyền truy cập của các bot AI trên điện thoại"
          >
            {result.aiCrawlers.map((crawler) => (
              <article
                className="rounded-xl border border-slate-200 p-3"
                key={crawler.id}
                role="listitem"
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="min-w-0 text-sm [overflow-wrap:anywhere]">
                    {crawler.id}
                  </strong>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-xs font-black ${crawler.status === "allowed" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {crawler.status === "allowed" ? (
                      <Check aria-hidden="true" size={14} />
                    ) : (
                      <ShieldAlert aria-hidden="true" size={14} />
                    )}
                    {crawler.status === "allowed" ? "Cho phép" : "Đang chặn"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {crawler.vendor} · {viaLabels[crawler.via]}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-5 hidden overflow-x-auto sm:block">
            <table
              className="w-full min-w-[32rem] border-collapse text-left text-sm"
              aria-label="Quyền truy cập của các bot AI"
            >
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="pb-3">Bot</th>
                  <th className="pb-3">Nhà cung cấp</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3">Nguồn quy tắc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.aiCrawlers.map((crawler) => (
                  <tr key={crawler.id}>
                    <th className="py-3 pr-4 font-black">{crawler.id}</th>
                    <td className="py-3 pr-4 text-slate-600">
                      {crawler.vendor}
                    </td>
                    <td
                      className={`py-3 pr-4 font-bold ${crawler.status === "allowed" ? "text-emerald-700" : "text-red-700"}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {crawler.status === "allowed" ? (
                          <Check aria-hidden="true" size={15} />
                        ) : (
                          <ShieldAlert aria-hidden="true" size={15} />
                        )}
                        {crawler.status === "allowed"
                          ? "Cho phép"
                          : "Đang chặn"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {viaLabels[crawler.via]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel p-5 sm:p-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.13em] text-teal uppercase">
              Bằng chứng quét được
            </p>
            <h2 className="mt-1 text-xl font-black">Tất cả mục đã kiểm tra</h2>
          </div>
          <p className="text-sm text-slate-500">
            {result.findings.filter((item) => item.status === "pass").length}/
            {result.findings.length} đạt
          </p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {result.findings.map((finding) => {
            const Icon =
              finding.status === "pass"
                ? CheckCircle2
                : finding.status === "warning"
                  ? TriangleAlert
                  : X;
            const tone =
              finding.status === "pass"
                ? "bg-emerald-50 text-emerald-800"
                : finding.status === "warning"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-800";
            return (
              <article
                className="rounded-2xl border border-slate-200 p-4"
                key={finding.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    {groupLabels[finding.group]}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${tone}`}
                  >
                    <Icon aria-hidden="true" size={14} />
                    {statusLabels[finding.status]}
                  </span>
                </div>
                <h3 className="mt-3 font-black">{finding.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {finding.detail}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Sparkles aria-hidden="true" className="text-blue" size={19} />Ý
            tưởng nội dung từ AI local
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Bản nháp để biên tập, không phải cam kết thứ hạng.
          </p>
          <ul className="mt-4 space-y-3">
            {result.ai.contentIdeas.map((idea) => (
              <li className="flex gap-3 text-sm leading-6" key={idea}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" />
                {idea}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5 sm:p-7">
          <h2 className="text-xl font-black">Nguồn và giới hạn</h2>
          <ul className="mt-4 space-y-2">
            {result.sources.map((source) => (
              <li key={source.citation}>
                <a
                  className="inline-flex items-start gap-2 text-sm font-bold text-blue underline decoration-blue/30 underline-offset-4"
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                    size={15}
                  />
                  {source.citation} · {source.title}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
            {result.limits.map((limit) => (
              <p
                className="flex gap-2 text-xs leading-5 text-slate-600"
                key={limit}
              >
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-700"
                  size={14}
                />
                {limit}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function WebsiteAnalyzer() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedUrl = url.trim();
    if (!submittedUrl) {
      setError("Hãy nhập địa chỉ website cần kiểm tra.");
      return;
    }
    setUrl(submittedUrl);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: submittedUrl, keyword: keyword.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as
        | AuditResult
        | { error?: string };
      if (!response.ok)
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Chưa thể kiểm tra website này.",
        );
      setResult(body as AuditResult);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chưa thể kiểm tra website này.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="panel p-5 sm:p-6 lg:sticky lg:top-28">
        <span className="grid size-12 place-items-center rounded-2xl bg-ink text-mint">
          <Globe2 aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-black">Website cần kiểm tra</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Dùng địa chỉ công khai. Từ khóa giúp AI local gợi ý nội dung sát nhu
          cầu khách hơn.
        </p>
        <form className="mt-6 space-y-4" onSubmit={analyze} aria-busy={loading}>
          <label className="block" htmlFor="audit-url">
            <span className="label">Địa chỉ website</span>
            <input
              className="input"
              id="audit-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              maxLength={2048}
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="tenmien.vn hoặc https://tenmien.vn"
              aria-describedby="audit-url-hint"
            />
            <small
              className="mt-2 block text-xs leading-5 text-slate-500"
              id="audit-url-hint"
            >
              Có thể dán tên miền không có https://. Chỉ kiểm tra website công
              khai, không đọc địa chỉ nội bộ.
            </small>
          </label>
          <label className="block" htmlFor="audit-keyword">
            <span className="label">Từ khóa khách thường tìm</span>
            <input
              className="input"
              id="audit-keyword"
              maxLength={120}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="hosting cho doanh nghiệp nhỏ"
            />
          </label>
          <button
            className="button-primary min-h-12 w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={17}
              />
            ) : (
              <Search aria-hidden="true" size={17} />
            )}
            {loading ? "Đang kiểm tra" : "Chấm điểm website"}
          </button>
        </form>
        {error ? (
          <div
            className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800"
            role="alert"
          >
            <ShieldAlert
              aria-hidden="true"
              className="mt-1 shrink-0"
              size={16}
            />
            {error}
          </div>
        ) : null}
        <p className="mt-5 flex gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          <Bot aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
          Nếu Ollama bận, điểm và kế hoạch tất định vẫn hoạt động.
        </p>
      </aside>
      <main className="min-w-0">
        {loading ? (
          <section
            className="panel min-h-96 p-6"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex items-center gap-3">
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin text-blue motion-reduce:animate-none"
              />
              <div>
                <h2 className="font-black">
                  Đang đọc website và tài liệu công khai
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Kiểm tra trang, robots.txt, sitemap và tài liệu cho AI.
                </p>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <div
                  className="h-40 rounded-2xl bg-slate-100 motion-safe:animate-pulse"
                  key={item}
                />
              ))}
            </div>
          </section>
        ) : result ? (
          <Report result={result} />
        ) : (
          <section className="panel grid min-h-96 place-items-center p-8 text-center">
            <div className="max-w-md">
              <Gauge
                aria-hidden="true"
                className="mx-auto text-blue"
                size={34}
              />
              <h2 className="mt-4 text-xl font-black">
                Bắt đầu bằng một địa chỉ website công khai
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Báo cáo tách điểm Google và AI, sau đó xếp việc cần sửa theo mức
                ảnh hưởng.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
