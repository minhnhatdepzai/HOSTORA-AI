import { noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export function GET() {
  return noStoreJson({ inventory: getPaymentStore().listPlanInventory() });
}
