export interface TrafficPoint {
  hour: string;
  baseline: number;
  sale: number;
}

export function simulateFlashSale(
  monthlyVisits: number,
  multiplier: number,
  durationHours: number,
): TrafficPoint[] {
  const hourly = Math.max(1, monthlyVisits / 30 / 12);
  return Array.from({ length: 12 }, (_, index) => ({
    hour: `${index + 8}:00`,
    baseline: Math.round(hourly),
    sale: Math.round(
      hourly *
        (index >= 3 && index < 3 + Math.min(durationHours, 8) ? multiplier : 1),
    ),
  }));
}

export function growthStage(monthlyVisits: number) {
  if (monthlyVisits < 10000)
    return {
      stage: "Khởi động",
      actions: [
        "Ưu tiên hosting được quản lý",
        "Bật SSL và backup",
        "Theo dõi Core Web Vitals",
      ],
    };
  if (monthlyVisits < 50000)
    return {
      stage: "Tăng trưởng",
      actions: [
        "Bật CDN và cache trang",
        "Đo tải luồng checkout",
        "Tối ưu database và ảnh",
      ],
    };
  return {
    stage: "Mở rộng",
    actions: [
      "Đánh giá cloud hosting/VPS",
      "Thiết lập giám sát và cảnh báo",
      "Benchmark trước chiến dịch lớn",
    ],
  };
}
