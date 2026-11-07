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
  Treemap,
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
  const productMix = useMemo(() => data?.productMix.slice(0, 8).map((item) => ({
    ...item,
    label: `${item.provider} ${item.title}`,
  })) ?? [], [data]);
  const totalOrders = statusMix.reduce((sum, item) => sum + item.value, 0);
  const topProduct = productMix[0];

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
          <section className="admin-product-analysis" aria-labelledby="product-analysis-title">
            <div className="admin-product-analysis-head">
              <div><p>PHÂN TÍCH THEO GÓI</p><h3 id="product-analysis-title">Gói nào tạo ra nhiều đơn đã trả nhất?</h3></div>
              <span>{topProduct ? `${topProduct.label} · ${topProduct.paidOrders} đơn` : "Chưa có đơn đã thanh toán"}</span>
            </div>
            <div className="admin-product-bar" role="img" aria-label="Biểu đồ số đơn đã thanh toán theo gói">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productMix.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#E3EAE7" strokeDasharray="3 5" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#667A74" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={132} tick={{ fontSize: 10, fill: "#38534C" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value} đơn`, "Đã thanh toán"]} />
                  <Bar dataKey="paidOrders" name="Đơn đã thanh toán" fill="#0B6B5D" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-product-table" aria-label="Số liệu gói đã bán">
              {productMix.slice(0, 6).map((item, index) => <div key={`${item.planId ?? item.title}-${index}`}><span>{index + 1}. {item.label}</span><strong>{item.paidOrders} đơn · {formatVnd(item.revenueVnd)} · {item.sharePercent}%</strong></div>)}
              {!productMix.length ? <p>Chưa có dữ liệu theo gói. Biểu đồ sẽ xuất hiện sau đơn thanh toán đầu tiên.</p> : null}
            </div>
          </section>
        </div>
        <aside className="admin-revenue-side">
          <RevenueScene />
          <section className="admin-status-mix" aria-labelledby="status-mix-title"><div className="admin-status-copy"><p>CƠ CẤU ĐƠN</p><strong id="status-mix-title">{totalOrders} đơn</strong><span>Vòng tròn thể hiện tỷ lệ mọi trạng thái đơn hiện có.</span></div><div className="admin-pie"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusMix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>{statusMix.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip formatter={(value, name) => [`${value} đơn`, name]} /></PieChart></ResponsiveContainer><div className="admin-pie-center"><strong>{totalOrders}</strong><span>TỔNG ĐƠN</span></div></div><div className="admin-status-legend">{statusMix.map((item, index) => <div key={item.name}><i style={{ background: pieColors[index % pieColors.length] }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></section>
          <section className="admin-plan-treemap" aria-labelledby="treemap-title"><div><p>GÓI BÁN NHIỀU NHẤT</p><h3 id="treemap-title">Tỷ trọng theo số đơn</h3></div><div className="admin-treemap" role="img" aria-label="Biểu đồ ô vuông tỷ trọng gói bán nhiều nhất"><ResponsiveContainer width="100%" height="100%"><Treemap data={productMix} dataKey="paidOrders" nameKey="label" stroke="#071827" fill="#72C5A4"><Tooltip formatter={(value, _name, item) => [`${value} đơn`, String(item?.payload?.label ?? "Gói")]} /></Treemap></ResponsiveContainer></div><p>{topProduct ? <><strong>{topProduct.label}</strong> đứng đầu với {topProduct.paidOrders} đơn, chiếm {topProduct.sharePercent}%.</> : "Chưa có đơn đã thanh toán để xếp hạng."}</p></section>
          <div className="admin-orders-bars"><p>ĐƠN ĐÃ TRẢ THEO NGÀY</p><div><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.slice(-14)}><Bar dataKey="paidOrders" name="Đơn" fill="#72C5A4" radius={[3,3,0,0]}/><Tooltip/><XAxis dataKey="label" hide/><YAxis hide/></BarChart></ResponsiveContainer></div></div>
        </aside>
      </div>
    </section>
  );
}
