"use client";

import { Check, Globe2, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
type Result = {
  url: string;
  title: string | null;
  description: string | null;
  score: number;
  checks: Record<string, boolean>;
  disclaimer: string;
};
const labels: Record<string, string> = {
  title: "Có tiêu đề trang",
  description: "Có mô tả trang",
  viewport: "Hiển thị trên điện thoại",
  favicon: "Có biểu tượng website",
  language: "Khai báo ngôn ngữ",
  https: "Dùng HTTPS",
  headings: "Đúng một thẻ H1",
};
export function WebsiteAnalyzer() {
  const [url, setUrl] = useState("https://example.com");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/website-analyzer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error ?? "Không thể truy cập website");
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
        <h2 className="mt-5 text-2xl font-black">Địa chỉ website</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nhập địa chỉ website công khai. Công cụ kiểm tra các thông tin cơ bản
          trên trang; không truy cập website nội bộ.
        </p>
        <label className="mt-6 block">
          <span className="label">Website</span>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <button
          className="button-primary mt-4 w-full"
          onClick={analyze}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <ShieldAlert size={17} />
          )}
          Kiểm tra website
        </button>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">
            {error}
          </p>
        )}
      </section>
      <section className="panel min-h-72 p-5 sm:min-h-96 sm:p-6">
        {!result ? (
          <div className="grid min-h-64 place-items-center text-center text-slate-400 sm:min-h-80">
            <div>
              <ShieldAlert className="mx-auto" size={34} />
              <p className="mt-3 font-bold">
                Kết quả kiểm tra sẽ hiện ở đây
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid size-24 shrink-0 place-items-center rounded-full bg-ink text-3xl font-black text-mint">
                {result.score}
              </div>
              <div>
                <p className="text-xs font-bold text-blue">{result.url}</p>
                <h2 className="mt-1 text-2xl font-black">
                  {result.title ?? "Không tìm thấy tiêu đề"}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {result.description ?? "Không tìm thấy mô tả trang"}
                </p>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {Object.entries(result.checks).map(([key, value]) => (
                <div
                  className={`flex items-center gap-3 rounded-xl p-4 text-sm font-bold ${value ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
                  key={key}
                >
                  {value ? <Check size={17} /> : <X size={17} />}{" "}
                  {labels[key] ?? key}
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              {result.disclaimer}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
