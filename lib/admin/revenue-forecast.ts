export type RevenuePoint = {
  date: string;
  revenueVnd: number;
  paidOrders: number;
};

export type RevenueForecast =
  | {
      available: false;
      method: "moving_average_trend";
      confidence: "unavailable" | "low";
      sampleDays: number;
      reason: string;
    }
  | {
      available: true;
      method: "moving_average_trend";
      confidence: "medium" | "high";
      sampleDays: number;
      next30DaysVnd: number;
      lowerVnd: number;
      upperVnd: number;
    };

const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);

export function forecastRevenue(points: RevenuePoint[]): RevenueForecast {
  const values = points.map((point) => Math.max(0, point.revenueVnd));
  if (!values.length) {
    return {
      available: false,
      method: "moving_average_trend",
      confidence: "unavailable",
      sampleDays: 0,
      reason: "Chưa có doanh thu đã xác nhận.",
    };
  }
  if (!values.some((value) => value > 0)) {
    return {
      available: false,
      method: "moving_average_trend",
      confidence: "unavailable",
      sampleDays: values.length,
      reason: "Chưa có doanh thu đã xác nhận.",
    };
  }
  if (values.length < 7) {
    return {
      available: false,
      method: "moving_average_trend",
      confidence: "low",
      sampleDays: values.length,
      reason: "Cần ít nhất 7 ngày có lịch sử để ước tính.",
    };
  }

  const recent = values.slice(-7);
  const previous = values.slice(-14, -7);
  const recentAverage = average(recent);
  const previousAverage = previous.length ? average(previous) : recentAverage;
  const boundedTrend = previousAverage
    ? Math.max(-0.35, Math.min(0.35, (recentAverage - previousAverage) / previousAverage))
    : 0;
  const dailyEstimate = recentAverage * (1 + boundedTrend * 0.5);
  const variance = average(recent.map((value) => (value - recentAverage) ** 2));
  const dailyDeviation = Math.sqrt(variance);
  const next30DaysVnd = Math.round(dailyEstimate * 30);
  const margin = Math.round(dailyDeviation * Math.sqrt(30) * 1.65);

  return {
    available: true,
    method: "moving_average_trend",
    confidence: values.length >= 28 ? "high" : "medium",
    sampleDays: values.length,
    next30DaysVnd,
    lowerVnd: Math.max(0, next30DaysVnd - margin),
    upperVnd: next30DaysVnd + margin,
  };
}
