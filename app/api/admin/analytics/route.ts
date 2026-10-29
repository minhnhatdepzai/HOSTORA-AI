import { forecastRevenue } from "@/lib/admin/revenue-forecast";
import { adminSessionFromRequest } from "@/lib/payments/admin-auth";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export function GET(request: Request) {
  if (!adminSessionFromRequest(request)) return jsonError("Cần đăng nhập quản trị.", 401);
  const analytics = getPaymentStore().getRevenueAnalytics();
  return noStoreJson({
    ...analytics,
    forecast: forecastRevenue(analytics.daily),
    generatedAt: new Date().toISOString(),
  });
}
