import { z } from "zod";
import { getCatalogStore } from "@/lib/admin/catalog-store";
import { jsonError, noStoreJson } from "@/lib/payments/route-utils";
import { getPaymentStore } from "@/lib/payments/store";
import { notifySaleRequestCreated, scheduleOrderEmail } from "@/lib/payments/email";
import {
  customerFromRequest,
  requestUsesBearer,
  sessionTokenFromRequest,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";

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

const fieldLabels: Record<string, string> = {
  productId: "Dịch vụ",
  contact: "Email nhận xác nhận",
  "profile.customerName": "Họ tên người phụ trách",
  "profile.phone": "Số điện thoại",
  "profile.companyName": "Tên doanh nghiệp",
  "profile.businessType": "Ngành kinh doanh",
  "profile.currentWebsite": "Website hiện tại",
  "profile.mainOffer": "Sản phẩm hoặc dịch vụ chủ lực",
  "profile.serviceArea": "Khu vực phục vụ",
  "profile.seoGoals": "Mục tiêu tìm kiếm",
  "profile.websiteStatus": "Tình trạng website",
  "profile.websiteGoal": "Mục tiêu website",
  "profile.targetCustomers": "Khách hàng mục tiêu",
  "profile.estimatedTraffic": "Lượng truy cập dự kiến",
  "profile.budgetRange": "Ngân sách dự kiến",
  consultationPreference: "Hình thức tư vấn",
  consultationAt: "Thời gian tư vấn",
  consultationChannel: "Kênh tư vấn",
  voucherCode: "Mã ưu đãi",
};

async function parsePurchaseRequest(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 4096) {
    return { error: "Thông tin gửi lên quá dài.", input: null } as const;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { error: "Thông tin gửi lên không đúng định dạng.", input: null } as const;
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.map(String).join(".") ?? "";
    const label = fieldLabels[path] ?? "Thông tin bắt buộc";
    return { error: `${label} chưa hợp lệ. Vui lòng kiểm tra lại.`, input: null } as const;
  }
  return { error: null, input: parsed.data } as const;
}

export async function POST(request: Request) {
  try {
    const parsed = await parsePurchaseRequest(request);
    if (!parsed.input) return jsonError(parsed.error, 400);
    const input = parsed.input;
    const sessionToken = sessionTokenFromRequest(request);
    if (sessionToken && !requestUsesBearer(request) && !sameOrigin(request))
      return jsonError("Nguồn yêu cầu không hợp lệ.", 403);
    const customer = customerFromRequest(request);
    let voucherCode = input.voucherCode;
    if (customer) {
      if (input.contact.toLowerCase() !== customer.email)
        return jsonError(
          "Email nhận xác nhận phải trùng với tài khoản đang đăng nhập.",
          403,
        );
      const customerStore = getCustomerStore();
      if (voucherCode) {
        const owned = customerStore
          .listVouchers(customer.email)
          .some(
            (voucher) =>
              voucher.code === voucherCode?.trim().toUpperCase() &&
              voucher.status === "active" &&
              new Date(voucher.expiresAt).valueOf() > Date.now(),
          );
        if (!owned)
          return jsonError("Voucher này không thuộc tài khoản của bạn.", 403);
      } else {
        voucherCode = customerStore.bestActiveVoucher(customer.email)?.code;
      }
    }
    const product = getCatalogStore().getPublishedProduct(input.productId);
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
      voucherCode,
    });
    scheduleOrderEmail(() => notifySaleRequestCreated(created));
    return noStoreJson({ id: created.id, accessCode: created.accessCode, productName: created.productName, status: created.status, consultationPreference: created.consultationPreference }, 201);
  } catch {
    return jsonError("Chưa gửi được yêu cầu. Hãy kiểm tra thông tin rồi thử lại.", 400);
  }
}
