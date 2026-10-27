import { z } from "zod";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = await parseSmallJson(request, z.object({
      id: z.string().regex(/^HSR-[A-F0-9]{10}$/),
      accessCode: z.string().min(20).max(128),
    }));
    const saleRequest = getPaymentStore().findSaleRequestForCustomer(input.id, input.accessCode);
    if (!saleRequest) return jsonError("Không tìm thấy yêu cầu mua hoặc mã truy cập không đúng.", 404);
    return noStoreJson({ request: saleRequest });
  } catch {
    return jsonError("Không thể mở yêu cầu mua này.", 400);
  }
}
