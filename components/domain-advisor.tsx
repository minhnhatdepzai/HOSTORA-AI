"use client";

import { Copy, Globe2, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

type Result = {
  summary: string;
  domains: Array<{ domain: string; reason: string }>;
  slogans: string[];
  tagline: string;
  availability: string;
  disclaimer: string;
};
export function DomainAdvisor() {
  const [brand, setBrand] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/ai/domain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand }),
      });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error ?? "Không thể phân tích");
      setResult(x);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.4fr_.6fr]">
      <section className="panel h-fit p-6">
        <span className="grid size-12 place-items-center rounded-2xl bg-ink text-mint">
          <Globe2 />
        </span>
        <h2 className="mt-5 text-2xl font-black">Tên thương hiệu của bạn</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nhập tên cửa hàng hoặc thương hiệu. HOSTORA gợi ý tên miền dễ đọc và
          dễ nhớ. Tình trạng còn hay hết tên miền cần được kiểm tra riêng.
        </p>
        <label className="mt-6 block">
          <span className="label">Tên thương hiệu</span>
          <input
            className="input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={80}
            placeholder="Ví dụ: Tiệm Mây"
          />
        </label>
        <button
          className="button-primary mt-4 w-full"
          onClick={run}
          disabled={loading || brand.trim().length < 2}
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Sparkles size={17} />
          )}
          Xem gợi ý tên miền
        </button>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
      <section className="panel min-h-72 p-5 sm:min-h-96 sm:p-6">
        {!result ? (
          <div className="grid min-h-64 place-items-center text-center text-slate-400 sm:min-h-80">
            <div>
              <Globe2 className="mx-auto" size={34} />
              <p className="mt-3 font-bold">Gợi ý tên miền sẽ hiện ở đây</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Gợi ý thương hiệu</p>
                <h2 className="mt-2 text-2xl font-black">{result.summary}</h2>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                Chưa kiểm tra tên miền còn trống
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {result.domains.map((x) => (
                <article
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  key={x.domain}
                >
                  <div>
                    <p className="font-black text-blue">{x.domain}</p>
                    <p className="mt-1 text-xs text-slate-500">{x.reason}</p>
                  </div>
                  <button
                    aria-label={`Sao chép ${x.domain}`}
                    onClick={() => navigator.clipboard.writeText(x.domain)}
                    className="grid size-9 place-items-center rounded-xl bg-slate-100"
                  >
                    <Copy size={15} />
                  </button>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-ink p-5 text-white">
              <p className="text-xs font-black text-mint">CÂU GIỚI THIỆU</p>
              <p className="mt-2 text-xl font-black">“{result.tagline}”</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.slogans.map((x) => (
                  <span
                    className="rounded-full bg-white/10 px-3 py-1 text-xs"
                    key={x}
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">{result.disclaimer}</p>
          </div>
        )}
      </section>
    </div>
  );
}
