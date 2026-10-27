import nodemailer from "nodemailer";
import { after } from "next/server";
import { z } from "zod";
import type { CreatedInvoice, CreatedSaleRequest, Invoice, SaleRequest } from "./types";

const emailSchema = z.string().trim().email().max(160);
const smtpSchema = z.object({
  host: z.string().trim().min(1).max(253),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.enum(["true", "false"]).transform((value) => value === "true"),
  user: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1000),
  from: z.string().trim().min(3).max(320),
  adminTo: emailSchema,
  replyTo: emailSchema.optional(),
});

export type EmailConfig = z.infer<typeof smtpSchema>;
export type EmailStatus = { configured: boolean; adminRecipientConfigured: boolean; mode: "smtp" | "disabled" };

export function scheduleOrderEmail(task: () => Promise<void>) {
  if (process.env.NODE_ENV === "test" || !emailConfigFromEnv()) return;
  after(task);
}

export function emailConfigFromEnv(): EmailConfig | null {
  const parsed = smtpSchema.safeParse({
    host: process.env.HOSTORA_SMTP_HOST,
    port: process.env.HOSTORA_SMTP_PORT ?? "587",
    secure: process.env.HOSTORA_SMTP_SECURE ?? "false",
    user: process.env.HOSTORA_SMTP_USER,
    password: process.env.HOSTORA_SMTP_PASSWORD,
    from: process.env.HOSTORA_EMAIL_FROM,
    adminTo: process.env.HOSTORA_ORDER_NOTIFICATION_EMAIL ?? process.env.HOSTORA_SMTP_USER,
    replyTo: process.env.HOSTORA_EMAIL_REPLY_TO || undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function emailStatusFromEnv(): EmailStatus {
  const config = emailConfigFromEnv();
  return { configured: Boolean(config), adminRecipientConfigured: Boolean(config?.adminTo), mode: config ? "smtp" : "disabled" };
}

const htmlEscape = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]!);

const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
const dateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const dateOnly = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));

function publicBaseUrl() {
  const fallback = "http://127.0.0.1:3000";
  try {
    const url = new URL(process.env.HOSTORA_PUBLIC_BASE_URL ?? fallback);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : fallback;
  } catch { return fallback; }
}

const publicOrderUrl = () => new URL("/orders", publicBaseUrl()).toString();
const adminOrderUrl = () => new URL("/admin/orders", publicBaseUrl()).toString();
const aiUrl = () => new URL("/ai-assistant", publicBaseUrl()).toString();
const requestPortalUrl = (request: CreatedSaleRequest) => `${publicOrderUrl()}#requestId=${encodeURIComponent(request.id)}&requestCode=${encodeURIComponent(request.accessCode)}`;
const invoicePortalUrl = (invoice: CreatedInvoice) => `${publicOrderUrl()}#invoiceId=${encodeURIComponent(invoice.id)}&accessCode=${encodeURIComponent(invoice.accessCode)}`;

type EmailAction = { label: string; url: string; tone?: "primary" | "danger" | "quiet" };
type EmailDocumentInput = { preheader: string; eyebrow: string; title: string; intro: string; body: string; actions?: EmailAction[]; reference?: string };

function emailDocument(input: EmailDocumentInput) {
  const buttons = (input.actions ?? []).map((action) => {
    const colors = action.tone === "danger"
      ? "background:#fff;color:#b42318;border:1px solid #f1b4ae"
      : action.tone === "quiet"
        ? "background:#fff;color:#12332f;border:1px solid #b9cbc5"
        : "background:#0b6b5d;color:#fff;border:1px solid #0b6b5d";
    return `<a href="${htmlEscape(action.url)}" style="${colors};display:inline-block;text-decoration:none;padding:13px 18px;border-radius:8px;font-weight:700;font-size:14px;margin:0 8px 8px 0">${htmlEscape(action.label)}</a>`;
  }).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${htmlEscape(input.title)}</title></head><body style="margin:0;background:#eef3f0;font-family:Arial,'Helvetica Neue',sans-serif;color:#102c38"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${htmlEscape(input.preheader)}&#847;&zwnj;&nbsp;&#8199;</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #d8e3df"><tr><td style="background:#061f29;padding:22px 28px"><table role="presentation" width="100%"><tr><td style="color:#a9f2d2;font-size:15px;font-weight:800;letter-spacing:.16em">HOSTORA</td><td align="right" style="color:#8eaaa5;font-size:11px">CỐ VẤN WEBSITE</td></tr></table></td></tr><tr><td style="padding:34px 28px 18px"><p style="margin:0 0 12px;color:#0b6b5d;font-size:11px;font-weight:800;letter-spacing:.14em">${htmlEscape(input.eyebrow)}</p><h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;letter-spacing:-.02em;color:#09232d">${htmlEscape(input.title)}</h1><p style="margin:0;color:#526b66;font-size:15px;line-height:1.7">${htmlEscape(input.intro)}</p></td></tr><tr><td style="padding:0 28px 24px">${input.body}</td></tr>${buttons ? `<tr><td style="padding:0 28px 28px">${buttons}</td></tr>` : ""}<tr><td style="border-top:1px solid #e2ebe7;padding:20px 28px;color:#6d817c;font-size:12px;line-height:1.6"><strong style="color:#294942">HOSTORA</strong> · Email giao dịch tự động từ hệ thống đơn hàng.<br>${input.reference ? `Mã tham chiếu: ${htmlEscape(input.reference)} · ` : ""}Nếu cần hỗ trợ, hãy trả lời trực tiếp email này.</td></tr></table><p style="max-width:640px;margin:14px auto 0;color:#7a8d88;font-size:11px;line-height:1.5;text-align:center">Bạn nhận email vì đã tạo yêu cầu hoặc đơn hàng tại HOSTORA. Không chuyển tiếp mã truy cập cho người khác.</p></td></tr></table></body></html>`;
}

const rows = (items: Array<[string, string]>) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dce7e2;border-radius:10px;border-collapse:separate;overflow:hidden">${items.map(([label, value], index) => `<tr><td style="${index ? "border-top:1px solid #e4ece9;" : ""}padding:12px 14px;color:#6b7f79;font-size:13px;width:38%">${htmlEscape(label)}</td><td style="${index ? "border-top:1px solid #e4ece9;" : ""}padding:12px 14px;color:#102c38;font-size:13px;font-weight:700">${htmlEscape(value)}</td></tr>`).join("")}</table>`;
const notice = (title: string, copy: string, tone: "mint" | "amber" = "mint") => `<div style="margin-top:16px;padding:16px;border-left:4px solid ${tone === "mint" ? "#0b8b72" : "#d58a16"};background:${tone === "mint" ? "#ecf8f3" : "#fff7e8"}"><strong style="display:block;margin-bottom:5px;color:#173b34">${htmlEscape(title)}</strong><span style="color:#526b66;font-size:13px;line-height:1.6">${htmlEscape(copy)}</span></div>`;

async function sendMail(input: { to: string; subject: string; text: string; html: string; reference: string }) {
  const config = emailConfigFromEnv();
  if (!config) return { sent: false as const, reason: "not_configured" as const };
  const transporter = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.secure,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2" }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  await transporter.sendMail({
    from: config.from, to: input.to, replyTo: config.replyTo, subject: input.subject,
    text: input.text, html: input.html,
    headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All", "X-Entity-Ref-ID": input.reference },
  });
  return { sent: true as const };
}

async function safelySend(event: string, reference: string, messages: Parameters<typeof sendMail>[0][]) {
  const settled = await Promise.allSettled(messages.map((message) => sendMail(message)));
  for (const result of settled) if (result.status === "rejected") console.error("HOSTORA email delivery failed", { event, reference });
}

function consultationCopy(request: SaleRequest) {
  return request.consultationPreference === "ai"
    ? "AI HOSTORA tư vấn ngay sau khi gửi yêu cầu"
    : `${request.consultationAt ? dateTime(request.consultationAt) : "Chờ chọn giờ"} · ${request.consultationChannel === "video" ? "Cuộc gọi video" : request.consultationChannel === "phone" ? "Điện thoại" : "Email"}`;
}

const websiteStatusCopy: Record<SaleRequest["profile"]["websiteStatus"], string> = {
  idea: "Mới có ý tưởng",
  building: "Đang xây dựng",
  live: "Đã hoạt động",
  migrating: "Muốn chuyển hệ thống",
};
const trafficCopy: Record<SaleRequest["profile"]["estimatedTraffic"], string> = {
  under_1k: "Dưới 1.000 lượt/tháng",
  "1k_10k": "1.000–10.000 lượt/tháng",
  "10k_50k": "10.000–50.000 lượt/tháng",
  over_50k: "Trên 50.000 lượt/tháng",
};
const budgetCopy: Record<SaleRequest["profile"]["budgetRange"], string> = {
  under_500k: "Dưới 500.000đ/tháng",
  "500k_1m": "500.000đ–1 triệu/tháng",
  "1m_3m": "1–3 triệu/tháng",
  over_3m: "Trên 3 triệu/tháng",
};

export async function notifySaleRequestCreated(request: CreatedSaleRequest) {
  const config = emailConfigFromEnv(); if (!config) return;
  const manageUrl = requestPortalUrl(request);
  const detailRows: Array<[string, string]> = [
    ["Mã yêu cầu", request.id], ["Dịch vụ", `${request.productName} · ${request.provider}`],
    ["Khách hàng", request.profile.customerName], ["Doanh nghiệp", request.profile.companyName || "Cá nhân / chưa cung cấp"],
    ["Ngành kinh doanh", request.profile.businessType], ["Tình trạng website", websiteStatusCopy[request.profile.websiteStatus]],
    ["Website hiện tại", request.profile.currentWebsite || "Chưa có / chưa cung cấp"],
    ["Sản phẩm chủ lực", request.profile.mainOffer || "Chưa cung cấp"],
    ["Khu vực phục vụ", request.profile.serviceArea || "Chưa cung cấp"],
    ["Mục tiêu", request.profile.websiteGoal], ["Khách hàng mục tiêu", request.profile.targetCustomers],
    ["Mục tiêu SEO", request.profile.seoGoals || "Chưa xác định từ khóa"],
    ["Lượt truy cập dự kiến", trafficCopy[request.profile.estimatedTraffic]], ["Ngân sách", budgetCopy[request.profile.budgetRange]],
    ["Tư vấn", consultationCopy(request)],
  ];
  const customerBody = rows(detailRows) + notice("Bước tiếp theo", request.consultationPreference === "ai" ? "Bạn có thể mở AI HOSTORA ngay. Báo giá và điều kiện vẫn do HOSTORA xác nhận trước khi phát hành hóa đơn." : "HOSTORA sẽ xác nhận lại lịch tư vấn qua email. Bạn chưa bị tính tiền.");
  const adminBody = rows([
    ...detailRows, ["Email", request.contact], ["Điện thoại", request.profile.phone || "Không cung cấp"],
    ["Mã voucher", request.voucherCode || "Không dùng"], ["Ghi chú", request.note || "Không có"],
  ]);
  await safelySend("sale_request_created", request.id, [
    { to: config.adminTo, subject: `[HOSTORA] Yêu cầu mới ${request.id} · ${request.productName}`, reference: request.id,
      text: `Yêu cầu ${request.id}: ${request.productName}. Khách: ${request.profile.customerName}. Email: ${request.contact}. Tư vấn: ${consultationCopy(request)}. Quản trị: ${adminOrderUrl()}`,
      html: emailDocument({ preheader: `${request.profile.customerName} vừa yêu cầu ${request.productName}`, eyebrow: "YÊU CẦU MUA MỚI", title: "Có hồ sơ khách hàng cần xử lý", intro: "Thông tin doanh nghiệp, nhu cầu và lịch tư vấn đã được lưu vào backend HOSTORA.", body: adminBody, actions: [{ label: "Mở trang quản trị", url: adminOrderUrl() }], reference: request.id }) },
    { to: request.contact, subject: `HOSTORA đã nhận yêu cầu ${request.id}`, reference: request.id,
      text: `HOSTORA đã nhận yêu cầu ${request.id} cho ${request.productName}. ${consultationCopy(request)}. Theo dõi hoặc hủy: ${manageUrl}`,
      html: emailDocument({ preheader: `Yêu cầu ${request.id} đã được ghi nhận`, eyebrow: "ĐÃ NHẬN YÊU CẦU", title: `Chào ${request.profile.customerName}, hồ sơ đã sẵn sàng`, intro: "HOSTORA đã lưu nhu cầu của bạn. Chúng tôi sẽ chỉ tạo hóa đơn sau khi xác nhận giá, kỳ hạn và điều kiện.", body: customerBody, actions: [{ label: request.consultationPreference === "ai" ? "Tư vấn với AI ngay" : "Theo dõi yêu cầu", url: request.consultationPreference === "ai" ? aiUrl() : manageUrl }, { label: "Hủy yêu cầu", url: manageUrl, tone: "danger" }], reference: request.id }) },
  ]);
}

export async function notifySaleRequestCancelled(request: SaleRequest) {
  const config = emailConfigFromEnv(); if (!config) return;
  const body = rows([["Mã yêu cầu", request.id], ["Dịch vụ", request.productName], ["Trạng thái", "Đã hủy"], ["Lý do", request.cancelReason || "Không cung cấp"]]);
  await safelySend("sale_request_cancelled", request.id, [config.adminTo, request.contact].map((to) => ({
    to, subject: `[HOSTORA] Đã hủy yêu cầu ${request.id}`, reference: request.id,
    text: `Yêu cầu ${request.id} đã được hủy. Lý do: ${request.cancelReason || "Không cung cấp"}.`,
    html: emailDocument({ preheader: `Yêu cầu ${request.id} đã được hủy`, eyebrow: "CẬP NHẬT YÊU CẦU", title: "Yêu cầu mua đã được hủy", intro: "HOSTORA đã ghi nhận thay đổi và sẽ không phát hành hóa đơn từ yêu cầu này.", body, reference: request.id }),
  })));
}

export async function notifyInvoiceCreated(invoice: CreatedInvoice) {
  const config = emailConfigFromEnv(); if (!config) return;
  const portalUrl = invoicePortalUrl(invoice);
  const priceRows: Array<[string, string]> = [["Mã hóa đơn", invoice.id], ["Dịch vụ", invoice.title]];
  if (invoice.discountVnd > 0) priceRows.push(["Giá trước giảm", money(invoice.subtotalVnd)], ["Voucher", `-${money(invoice.discountVnd)} · ${invoice.voucherCode}`]);
  priceRows.push(["Tổng cần thanh toán", money(invoice.amountVnd)], ["Mã truy cập", invoice.accessCode]);
  const voucherNotice = invoice.amountVnd >= 1_000_000 ? notice("Quà cho đơn từ 1 triệu", "Sau khi thanh toán được xác nhận, bạn nhận voucher 100.000đ cho đơn tiếp theo từ 1.000.000đ, hiệu lực 30 ngày.") : "";
  const body = rows(priceRows) + voucherNotice;
  const messages: Parameters<typeof sendMail>[0][] = [{ to: config.adminTo, subject: `[HOSTORA] Đã tạo hóa đơn ${invoice.id}`, reference: invoice.id,
    text: `Hóa đơn ${invoice.id} - ${invoice.title} - ${money(invoice.amountVnd)} đã được tạo.`,
    html: emailDocument({ preheader: `Hóa đơn ${invoice.id} trị giá ${money(invoice.amountVnd)}`, eyebrow: "HÓA ĐƠN MỚI", title: "Hóa đơn đã được phát hành", intro: "Đơn đã sẵn sàng để khách kiểm tra và thanh toán trên HOSTORA.", body, actions: [{ label: "Mở trang quản trị", url: adminOrderUrl() }], reference: invoice.id }) }];
  if (invoice.customerEmail) messages.push({ to: invoice.customerEmail, subject: `Hóa đơn HOSTORA ${invoice.id} · ${money(invoice.amountVnd)}`, reference: invoice.id,
    text: `Hóa đơn ${invoice.id} - ${invoice.title} - ${money(invoice.amountVnd)}. Mã truy cập: ${invoice.accessCode}. Xem, thanh toán hoặc hủy: ${portalUrl}`,
    html: emailDocument({ preheader: `Hóa đơn ${invoice.id} đã sẵn sàng`, eyebrow: "HÓA ĐƠN HOSTORA", title: "Kiểm tra trước khi thanh toán", intro: "Hãy kiểm tra dịch vụ, số tiền và điều kiện. Bạn có thể hủy trước khi thanh toán ngay trên HOSTORA.", body, actions: [{ label: "Xem và thanh toán", url: portalUrl }, { label: "Hủy trước thanh toán", url: portalUrl, tone: "danger" }], reference: invoice.id }) });
  await safelySend("invoice_created", invoice.id, messages);
}

const statusCopy: Record<Invoice["status"], string> = {
  pending: "Đơn đang chờ thanh toán.", cancel_requested: "Yêu cầu hủy đang được kiểm tra.", paid: "Thanh toán đã được xác nhận.",
  refund_requested: "Yêu cầu hoàn tiền đang chờ xử lý.", refund_pending: "Yêu cầu hoàn tiền đã được gửi tới cổng thanh toán.",
  refunded: "Cổng thanh toán đã xác nhận hoàn tiền.", cancelled: "Đơn đã được hủy.",
};

export async function notifyInvoiceStatusChanged(invoice: Invoice) {
  const config = emailConfigFromEnv(); if (!config) return;
  const copy = invoice.provider === "demo" && invoice.status === "paid"
    ? "Giao dịch kiểm thử đã hoàn tất; không có tiền thật được thu."
    : invoice.provider === "demo" && invoice.status === "refunded"
      ? "Hoàn tiền trong môi trường kiểm thử đã hoàn tất; không có tiền thật được chuyển."
      : statusCopy[invoice.status];
  const body = rows([["Mã đơn", invoice.id], ["Dịch vụ", invoice.title], ["Tổng tiền", money(invoice.amountVnd)], ["Trạng thái", copy]]) +
    (invoice.earnedVoucherCode && invoice.earnedVoucherAmountVnd && invoice.earnedVoucherExpiresAt
      ? notice(`Voucher ${money(invoice.earnedVoucherAmountVnd)}`, `Mã ${invoice.earnedVoucherCode} · dùng cho đơn tiếp theo từ 1.000.000đ · hết hạn ${dateOnly(invoice.earnedVoucherExpiresAt)}.`)
      : "");
  const messages: Parameters<typeof sendMail>[0][] = [{ to: config.adminTo, subject: `[HOSTORA] ${invoice.id} · ${copy}`, reference: invoice.id,
    text: `${invoice.id} - ${invoice.title}: ${copy}`, html: emailDocument({ preheader: copy, eyebrow: "TRẠNG THÁI ĐƠN HÀNG", title: `Đơn ${invoice.id} vừa thay đổi`, intro: "Backend HOSTORA đã ghi nhận trạng thái mới từ khách hoặc cổng thanh toán.", body, actions: [{ label: "Mở trang quản trị", url: adminOrderUrl() }], reference: invoice.id }) }];
  if (invoice.customerEmail) messages.push({ to: invoice.customerEmail, subject: `Cập nhật đơn HOSTORA ${invoice.id}`, reference: invoice.id,
    text: `${invoice.id} - ${invoice.title}: ${copy}${invoice.earnedVoucherCode ? ` Voucher: ${invoice.earnedVoucherCode}` : ""}`,
    html: emailDocument({ preheader: copy, eyebrow: "CẬP NHẬT ĐƠN HÀNG", title: copy, intro: `HOSTORA vừa cập nhật đơn ${invoice.id}.`, body, actions: [{ label: "Mở đơn hàng", url: publicOrderUrl() }], reference: invoice.id }) });
  await safelySend(`invoice_${invoice.status}`, invoice.id, messages);
}

export async function notifyAdminLoginCode(code: string, expiresAt: string) {
  const config = emailConfigFromEnv(); if (!config) return;
  const body = `<div style="padding:22px;background:#061f29;color:#fff;text-align:center;font-size:32px;font-weight:800;letter-spacing:.22em;border-radius:10px">${htmlEscape(code)}</div>` + notice("Bảo mật", `Mã hết hạn lúc ${dateTime(expiresAt)} và chỉ dùng một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.`, "amber");
  await safelySend("admin_login_code", "ADMIN-LOGIN", [{ to: config.adminTo, subject: `[HOSTORA] Mã đăng nhập quản trị ${code}`, reference: "ADMIN-LOGIN",
    text: `Mã đăng nhập quản trị HOSTORA: ${code}. Hết hạn: ${dateTime(expiresAt)}.`,
    html: emailDocument({ preheader: "Mã đăng nhập quản trị HOSTORA", eyebrow: "ĐĂNG NHẬP QUẢN TRỊ", title: "Mã xác minh dùng một lần", intro: "Nhập mã bên dưới tại trang quản trị. HOSTORA không bao giờ hỏi lại mã này qua điện thoại.", body, reference: "ADMIN-LOGIN" }) }]);
}
