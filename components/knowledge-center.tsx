"use client";

import { BookOpen, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
const topics = [
  "Hosting là gì?",
  "Domain là gì?",
  "Shared Hosting và VPS khác nhau thế nào?",
  "SSL có tác dụng gì?",
  "CDN giúp gì cho website?",
  "Backup là gì?",
  "Khi nào cần nâng cấp hosting?",
];
type Result = {
  explanation: string;
  keyPoints: string[];
  sources: Array<{ title: string; sourceUrl: string; verifiedAt: string }>;
};
export function KnowledgeCenter() {
  const [question, setQuestion] = useState(topics[0]);
  const [level, setLevel] = useState("beginner");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function explain(q = question) {
    setQuestion(q);
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, level }),
      });
      const output = await r.json();
      if (!r.ok) throw new Error(output.error ?? "Chưa thể tải giải thích.");
      setResult(output);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa thể tải giải thích.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.36fr_.64fr]">
      <aside className="panel h-fit p-4">
        <p className="px-2 pb-3 text-xs font-black uppercase tracking-widest text-slate-400">
          Chủ đề nền tảng
        </p>
        {topics.map((x) => (
          <button
            key={x}
            onClick={() => explain(x)}
            className={`mb-1 w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${question === x ? "bg-ink text-white" : "hover:bg-slate-100"}`}
          >
            {x}
          </button>
        ))}
      </aside>
      <section className="panel min-h-[480px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-blue/10 text-blue">
              <BookOpen size={20} />
            </span>
            <div>
              <p className="eyebrow">Tìm hiểu hosting</p>
              <h2 className="font-black">{question}</h2>
            </div>
          </div>
          <select
            aria-label="Mức độ giải thích"
            className="input w-full sm:w-auto"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="beginner">Người mới</option>
            <option value="business">Chủ kinh doanh</option>
            <option value="technical">Kỹ thuật</option>
          </select>
        </div>
        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <LoaderCircle className="animate-spin text-blue" />
          </div>
        ) : result ? (
          <div className="mt-8">
            <p className="text-lg leading-8 text-slate-700">
              {result.explanation}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {result.keyPoints.map((x) => (
                <div
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6"
                  key={x}
                >
                  {x}
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-slate-200 pt-5">
              <p className="text-xs font-black uppercase text-slate-400">
                Dữ liệu đã kiểm tra
              </p>
              {result.sources?.map((x) => (
                <p
                  className="mt-2 text-xs font-bold text-slate-600"
                  key={x.sourceUrl}
                >
                  {x.title} · {x.verifiedAt}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <button className="button-primary" onClick={() => explain()}>
              <Sparkles size={17} />
              Xem giải thích
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
