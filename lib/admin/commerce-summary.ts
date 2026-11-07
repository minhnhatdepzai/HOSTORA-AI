export type CommerceSummary = {
  orders: number;
  requests: number;
  paid: number;
  newRequests: number;
  invoicedRequests: number;
  closedRequests: number;
  revenueVnd: number;
  customers: number;
};

type OrderPageSummary = {
  counts?: { all?: unknown };
  financials?: {
    recognizedPaidOrders?: unknown;
    recognizedRevenueVnd?: unknown;
  };
};

type RequestPageSummary = {
  counts?: {
    all?: unknown;
    new?: unknown;
    invoiced?: unknown;
    declined?: unknown;
    cancelled?: unknown;
  };
};

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function normalizeCommerceSummary(
  orders: OrderPageSummary,
  requests: RequestPageSummary,
  customers: unknown = 0,
): CommerceSummary {
  return {
    orders: safeNumber(orders.counts?.all),
    requests: safeNumber(requests.counts?.all),
    paid: safeNumber(orders.financials?.recognizedPaidOrders),
    newRequests: safeNumber(requests.counts?.new),
    invoicedRequests: safeNumber(requests.counts?.invoiced),
    closedRequests:
      safeNumber(requests.counts?.declined) +
      safeNumber(requests.counts?.cancelled),
    revenueVnd: safeNumber(orders.financials?.recognizedRevenueVnd),
    customers: safeNumber(customers),
  };
}
