"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, RefreshCw, TrendingUp } from "lucide-react";
import type { InvoiceStatus, RevenueAnalytics } from "@/lib/payments/types";
import type { RevenueForecast } from "@/lib/admin/revenue-forecast";
import { formatVnd } from "@/lib/utils";

const RevenueScene = dynamic(
  () => import("./admin-revenue-scene").then((module) => module.AdminRevenueScene),
  { ssr: false },
);

type AnalyticsResponse = RevenueAnalytics & {
  forecast: RevenueForecast;
  generatedAt: string;
};

const statusLabels: Record<InvoiceStatus, string> = {
  pending: "Chờ thanh toán",
  cancel_requested: "Chờ hủy",
  paid: "Đã thanh toán",
  refund_requested: "Chờ hoàn tiền",
  refund_pending: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
  cancelled: "Đã hủy",
};
const pieColors = ["#0B6B5D", "#E0A52D", "#2A7784", "#C26A50", "#7057A8", "#8A9C97", "#D0D8D5"];

export function AdminRevenueDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      if (response.status === 401) {
        window.location.replace("/admin/login?next=%2Fadmin");
        return;
      }
      const result = (await response.json()) as AnalyticsResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Không tải được doanh thu.");
      setData(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được doanh thu.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const statusMix = useMemo(() => data ? Object.entries(data.statusMix)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ name: statusLabels[key as InvoiceStatus], value })) : [], [data]);
  const chartData = useMemo(() => data?.daily.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(`${point.date}T00:00:00Z`)),
  })) ?? [], [data]);

  const differencePositive = (data?.differenceVnd ?? 0) >= 0;
  const forecastNote = !data
    ? "Đang tính"
    : data.forecast.available
      ? `${formatVnd(data.forecast.lowerVnd)} – ${formatVnd(data.forecast.upperVnd)} · tin cậy ${data.forecast.confidence === "high" ? "cao" : "vừa"}`
      : data.forecast.reason;
  return (
    <section className="admin-revenue" aria-labelledby="admin-revenue-title">
      <div className="admin-revenue-head">
        <div><p>DÒNG TIỀN ĐÃ XÁC NHẬN</p><h2 id="admin-revenue-title">Doanh thu và nhịp tăng trưởng.</h2><span>Chỉ tính đơn đã thanh toán và chưa hoàn tất hoàn tiền.</span></div>
        <button className="button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Cập nhật</button>
      </div>
      {error ? <p className="admin-revenue-error" role="alert">{error}</p> : null}
      <div className="admin-revenue-grid">
        <div className="admin-revenue-main">
          <div className="admin-revenue-metrics">
            <article><span>30 ngày gần nhất</span><strong>{data ? formatVnd(data.current30Days.revenueVnd) : "—"}</strong><small>{data ? `${data.current30Days.paidOrders} đơn được ghi nhận` : "Đang tổng hợp"}</small></article>
            <article><span>So với 30 ngày trước</span><strong className={differencePositive ? "is-up" : "is-down"}>{data ? `${differencePositive ? "+" : ""}${formatVnd(data.differenceVnd)}` : "—"}</strong><small>{data?.differencePercent == null ? "Chưa có kỳ trước để so sánh" : `${data.differencePercent > 0 ? "+" : ""}${data.differencePercent}%`}</small></article>
            <article><span>Ước tính 30 ngày tới</span><strong>{data?.forecast.available ? formatVnd(data.forecast.next30DaysVnd) : "Chưa đủ dữ liệu"}</strong><small>{forecastNote}</small></article>
          </div>
          <div
            className="admin-revenue-chart"
            role="img"
            aria-label="Biểu đồ doanh thu 30 ngày"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B6B5D" stopOpacity=".32"/><stop offset="1" stopColor="#0B6B5D" stopOpacity="0"/></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#DDE7E3" strokeDasharray="3 5" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#667A74" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}tr`} tick={{ fontSize: 10, fill: "#667A74" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatVnd(Number(value))} labelFormatter={(label) => `Ngày ${label}`} />
                <Area type="monotone" dataKey="revenueVnd" name="Doanh thu" stroke="#0B6B5D" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="admin-revenue-foot"><span>{differencePositive ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>} {data?.differencePercent == null ? "Chờ đủ hai kỳ để tính hiệu số" : `Hiệu số ${data.differencePercent}%`}</span><span><TrendingUp size={15}/> Dự báo: trung bình động + xu hướng, không dùng LLM để bịa số</span></div>
        </div>
        <aside className="admin-revenue-side">
          <RevenueScene />
          <div className="admin-status-mix"><div><p>CƠ CẤU ĐƠN</p><strong>{statusMix.reduce((sum, item) => sum + item.value, 0)} đơn</strong></div><div className="admin-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2}>{statusMix.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
          <div className="admin-orders-bars"><p>ĐƠN ĐÃ TRẢ THEO NGÀY</p><div><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.slice(-14)}><Bar dataKey="paidOrders" name="Đơn" fill="#72C5A4" radius={[3,3,0,0]}/><Tooltip/><XAxis dataKey="label" hide/><YAxis hide/></BarChart></ResponsiveContainer></div></div>
        </aside>
      </div>
    </section>
  );
}
