import { z } from "zod";
import { productCatalog } from "@/data/product-catalog";
import { jsonError, noStoreJson, parseSmallJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { notifySaleRequestCreated, scheduleOrderEmail } from "@/lib/payments/email";

export const runtime = "nodejs";

const requestSchema = z.object({
  productId: z.string().min(2).max(80),
  contact: z.string().trim().email().max(160),
  note: z.string().trim().max(1500).optional(),
  profile: z.object({
    customerName: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30),
    companyName: z.string().trim().max(160),
    businessType: z.string().trim().min(2).max(120),
    currentWebsite: z.string().trim().max(253).default(""),
    mainOffer: z.string().trim().max(500).default(""),
    serviceArea: z.string().trim().max(160).default(""),
    seoGoals: z.string().trim().max(500).default(""),
    websiteStatus: z.enum(["idea", "building", "live", "migrating"]),
    websiteGoal: z.string().trim().min(5).max(500),
    targetCustomers: z.string().trim().min(3).max(500),
    estimatedTraffic: z.enum(["under_1k", "1k_10k", "10k_50k", "over_50k"]),
    budgetRange: z.enum(["under_500k", "500k_1m", "1m_3m", "over_3m"]),
  }),
  consultationPreference: z.enum(["scheduled", "ai"]),
  consultationAt: z.string().datetime({ offset: true }).nullable().optional(),
  consultationChannel: z.enum(["email", "phone", "video"]),
  voucherCode: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const input = await parseSmallJson(request, requestSchema);
    const product = productCatalog.find((item) => item.id === input.productId);
    if (!product) return jsonError("Sản phẩm này không còn trong danh mục.", 404);
    const created = getPaymentStore().createSaleRequest({
      productId: product.id,
      provider: product.provider,
      productName: product.name,
      contact: input.contact,
      note: input.note,
      profile: input.profile,
      consultationPreference: input.consultationPreference,
      consultationAt: input.consultationAt,
      consultationChannel: input.consultationChannel,
      voucherCode: input.voucherCode,
    });
    scheduleOrderEmail(() => notifySaleRequestCreated(created));
    return noStoreJson({ id: created.id, accessCode: created.accessCode, productName: created.productName, status: created.status, consultationPreference: created.consultationPreference }, 201);
  } catch {
    return jsonError("Chưa gửi được yêu cầu. Hãy kiểm tra thông tin rồi thử lại.", 400);
  }
}
