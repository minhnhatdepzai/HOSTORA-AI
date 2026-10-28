export type CommerceSummary = {
  orders: number;
  requests: number;
  paid: number;
  newRequests: number;
  revenueVnd: number;
};

type OrderPageSummary = {
  counts?: { all?: unknown };
  financials?: {
    recognizedPaidOrders?: unknown;
    recognizedRevenueVnd?: unknown;
  };
};

type RequestPageSummary = {
  counts?: { all?: unknown; new?: unknown };
};

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function normalizeCommerceSummary(
  orders: OrderPageSummary,
  requests: RequestPageSummary,
): CommerceSummary {
  return {
    orders: safeNumber(orders.counts?.all),
    requests: safeNumber(requests.counts?.all),
    paid: safeNumber(orders.financials?.recognizedPaidOrders),
    newRequests: safeNumber(requests.counts?.new),
    revenueVnd: safeNumber(orders.financials?.recognizedRevenueVnd),
  };
}
