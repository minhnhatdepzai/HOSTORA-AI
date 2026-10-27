"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hostingCatalog } from "@/data/hosting-catalog";
import { calculateCost } from "@/lib/pricing";
import { growthStage, simulateFlashSale } from "@/lib/scenario";
import { formatVnd } from "@/lib/utils";
import {
  AlertTriangle,
  Calculator,
  Gauge,
  LoaderCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export function IntelligenceSuite() {
  const [planId, setPlanId] = useState(hostingCatalog[2].id);
  const [months, setMonths] = useState<12 | 24 | 36 | 48>(48);
  const [domain, setDomain] = useState(350000);
  const [addons, setAddons] = useState(0);
  const [visits, setVisits] = useState(5000);
  const [multiplier, setMultiplier] = useState(5);
  const [duration, setDuration] = useState(3);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const plan = hostingCatalog.find((p) => p.id === planId)!;
  const cost = calculateCost(plan, months, domain, addons);
  const traffic = useMemo(
    () => simulateFlashSale(visits, multiplier, duration),
    [visits, multiplier, duration],
  );
  const growth = growthStage(visits * multiplier);
  async function explainScenario() {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: "traffic",
          facts: JSON.stringify({
            plan: plan.name,
            cost,
            baselineMonthlyVisits: visits,
            flashSaleMultiplier: multiplier,
            durationHours: duration,
            resultingGrowthStage: growth,
          }),
        }),
      });
      const result = await response.json();
      setAnalysis(
        `${result.summary}\n${(result.tradeoffs ?? []).map((item: string) => `• ${item}`).join("\n")}\nBước tiếp theo: ${result.nextStep}`,
      );
    } finally {
      setAnalyzing(false);
    }
  }
  return (
    <div className="space-y-7">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue/10 text-blue">
              <Calculator size={19} />
            </span>
            <div>
              <p className="eyebrow">Chi phí thực tế</p>
              <h2 className="text-xl font-black">Tổng chi phí sở hữu</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">Gói hosting</span>
              <select
                className="input"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {hostingCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Thời gian</span>
              <select
                className="input"
                value={months}
                onChange={(e) =>
                  setMonths(Number(e.target.value) as 12 | 24 | 36 | 48)
                }
              >
                {[12, 24, 36, 48].map((x) => (
                  <option key={x} value={x}>
                    {x} tháng
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Tên miền mỗi năm</span>
              <input
                className="input"
                type="number"
                value={domain}
                onChange={(e) => setDomain(Number(e.target.value))}
              />
            </label>
            <label>
              <span className="label">Dịch vụ bổ sung mỗi tháng</span>
              <input
                className="input"
                type="number"
                value={addons}
                onChange={(e) => setAddons(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="mt-6 rounded-2xl bg-ink p-4 text-white sm:p-5">
            <p className="text-xs font-bold text-mint">TỔNG {months} THÁNG</p>
            <p className="mt-1 text-3xl font-black">
              {cost.total === null ? "Chưa đủ dữ liệu" : formatVnd(cost.total)}
            </p>
            {cost.reason ? (
              <p className="mt-2 text-sm text-amber-200">{cost.reason}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-3">
              <span>
                Hosting
                <br />
                <b className="text-white">
                  {cost.hosting === null
                    ? "Chưa xác minh"
                    : formatVnd(cost.hosting)}
                </b>
              </span>
              <span>
                Tên miền
                <br />
                <b className="text-white">{formatVnd(cost.domain)}</b>
              </span>
              <span>
                Bình quân/tháng
                <br />
                <b className="text-white">
                  {cost.effectiveMonthly === null
                    ? "Chưa xác minh"
                    : formatVnd(cost.effectiveMonthly)}
                </b>
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Giá tên miền và dịch vụ bổ sung là giả định bạn nhập; xác nhận hóa đơn và điều
              kiện gói trước khi mua.
            </p>
          </div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Gauge size={19} />
            </span>
            <div>
              <p className="eyebrow">Lúc đông khách</p>
              <h2 className="text-xl font-black">Mô phỏng lượt truy cập tăng</h2>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label>
              <span className="label">Lượt xem/tháng</span>
              <input
                className="input"
                type="number"
                min="100"
                value={visits}
                onChange={(e) => setVisits(Number(e.target.value))}
              />
            </label>
            <label>
              <span className="label">Tăng gấp số lần</span>
              <input
                className="input"
                type="number"
                min="1"
                max="20"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
              />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="label">Số giờ</span>
              <input
                className="input"
                type="number"
                min="1"
                max="8"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={traffic}>
                <defs>
                  <linearGradient id="sale" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#11695e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#11695e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="sale"
                  stroke="#11695e"
                  fill="url(#sale)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="#7a8b84"
                  fill="transparent"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertTriangle className="shrink-0" size={15} />
            Đây là mô hình tương đối, không phải cam kết gói hosting chịu tải.
          </p>
        </div>
      </section>
      <section className="panel p-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue" />
          <div>
            <p className="eyebrow">Kế hoạch phát triển</p>
            <h2 className="text-2xl font-black">Giai đoạn: {growth.stage}</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {growth.actions.map((x, i) => (
            <div key={x} className="rounded-2xl bg-slate-50 p-5">
              <span className="text-xs font-black text-blue">0{i + 1}</span>
              <p className="mt-5 font-extrabold">{x}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">
          Lộ trình dựa trên giả định{" "}
          {Math.round(visits * multiplier).toLocaleString("vi-VN")} lượt/tháng.
          Hãy bổ sung concurrency, stack và benchmark thật trước quyết định nâng
          cấp.
        </p>
        {analysis && (
          <p className="mt-5 whitespace-pre-line rounded-2xl bg-blue/5 p-5 text-sm leading-7 text-slate-700">
            {analysis}
          </p>
        )}
        <button
          onClick={explainScenario}
          disabled={analyzing}
          className="button-primary mt-5"
        >
          {analyzing ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Sparkles size={17} />
          )}
          AI phân tích kịch bản
        </button>
      </section>
    </div>
  );
}
