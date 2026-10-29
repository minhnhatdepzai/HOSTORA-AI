import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  ConsultationChannel,
  ConsultationPreference,
  CreatedInvoice,
  CreatedSaleRequest,
  Invoice,
  InvoiceEvent,
  InvoiceListQuery,
  InvoicePage,
  InvoiceStatus,
  PaymentMethod,
  PaymentProvider,
  PurchaseProfile,
  SaleRequest,
  SaleRequestPage,
  RevenueAnalytics,
} from "./types";

type InvoiceRow = {
  id: string;
  access_hash: string;
  customer_email: string | null;
  title: string;
  description: string;
  amount_vnd: number;
  sale_type: "hostora_service" | "partner_service";
  partner_provider: string | null;
  status: InvoiceStatus;
  provider: PaymentProvider | null;
  provider_reference: string | null;
  gateway_create_date: string | null;
  gateway_payment_date: string | null;
  gateway_transaction_no: string | null;
  refund_reference: string | null;
  refund_reason: string | null;
  subtotal_vnd: number | null;
  discount_vnd: number | null;
  voucher_code: string | null;
  earned_voucher_code: string | null;
  earned_voucher_amount_vnd: number | null;
  earned_voucher_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    customerEmail: row.customer_email,
    title: row.title,
    description: row.description,
    amountVnd: row.amount_vnd,
    saleType: row.sale_type,
    partnerProvider: row.partner_provider,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    gatewayCreateDate: row.gateway_create_date,
    gatewayPaymentDate: row.gateway_payment_date,
    gatewayTransactionNo: row.gateway_transaction_no,
    refundReference: row.refund_reference,
    refundReason: row.refund_reason,
    subtotalVnd: row.subtotal_vnd ?? row.amount_vnd,
    discountVnd: row.discount_vnd ?? 0,
    voucherCode: row.voucher_code,
    earnedVoucherCode: row.earned_voucher_code,
    earnedVoucherAmountVnd: row.earned_voucher_amount_vnd,
    earnedVoucherExpiresAt: row.earned_voucher_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hashAccessCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

const emptyProfile: PurchaseProfile = {
  customerName: "Khách hàng HOSTORA",
  phone: "",
  companyName: "",
  businessType: "Chưa cung cấp",
  currentWebsite: "",
  mainOffer: "",
  serviceArea: "",
  seoGoals: "",
  websiteStatus: "idea",
  websiteGoal: "Chưa cung cấp",
  targetCustomers: "Chưa cung cấp",
  estimatedTraffic: "under_1k",
  budgetRange: "under_500k",
};

function parseProfile(value: string): PurchaseProfile {
  try {
    return { ...emptyProfile, ...(JSON.parse(value) as Partial<PurchaseProfile>) };
  } catch {
    return emptyProfile;
  }
}

export class PaymentStore {
  private readonly db: DatabaseSync;

  constructor(filename = path.join(process.cwd(), "data", "runtime", "payments.sqlite")) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        access_hash TEXT NOT NULL,
        customer_email TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
        sale_type TEXT NOT NULL DEFAULT 'hostora_service',
        partner_provider TEXT,
        status TEXT NOT NULL,
        provider TEXT,
        provider_reference TEXT,
        gateway_create_date TEXT,
        gateway_payment_date TEXT,
        gateway_transaction_no TEXT,
        refund_reference TEXT,
        refund_reason TEXT,
        subtotal_vnd INTEGER,
        discount_vnd INTEGER NOT NULL DEFAULT 0,
        voucher_code TEXT,
        earned_voucher_code TEXT,
        earned_voucher_amount_vnd INTEGER,
        earned_voucher_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invoice_events (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES invoices(id),
        type TEXT NOT NULL,
        detail TEXT NOT NULL,
        external_key TEXT UNIQUE,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS invoice_events_invoice ON invoice_events(invoice_id, created_at);
      CREATE INDEX IF NOT EXISTS invoices_created ON invoices(created_at DESC);
      CREATE INDEX IF NOT EXISTS invoices_status_created ON invoices(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS invoices_provider_created ON invoices(provider, created_at DESC);
      CREATE INDEX IF NOT EXISTS invoices_sale_type_created ON invoices(sale_type, created_at DESC);
      CREATE TABLE IF NOT EXISTS sale_requests (
        id TEXT PRIMARY KEY,
        access_hash TEXT NOT NULL DEFAULT '',
        product_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        product_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        profile_json TEXT NOT NULL DEFAULT '{}',
        consultation_preference TEXT NOT NULL DEFAULT 'ai',
        consultation_at TEXT,
        consultation_channel TEXT NOT NULL DEFAULT 'email',
        voucher_code TEXT,
        cancel_reason TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        invoice_id TEXT REFERENCES invoices(id),
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sale_requests_created ON sale_requests(created_at DESC);
      CREATE INDEX IF NOT EXISTS sale_requests_invoice ON sale_requests(invoice_id);
      CREATE INDEX IF NOT EXISTS sale_requests_status_created ON sale_requests(status, created_at DESC);
      CREATE TABLE IF NOT EXISTS vouchers (
        code TEXT PRIMARY KEY,
        amount_vnd INTEGER NOT NULL,
        min_order_vnd INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        issued_invoice_id TEXT NOT NULL REFERENCES invoices(id),
        redeemed_invoice_id TEXT REFERENCES invoices(id),
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        redeemed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS admin_email_codes (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `);
    const columns = this.db.prepare("PRAGMA table_info(invoices)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "customer_email")) this.db.exec("ALTER TABLE invoices ADD COLUMN customer_email TEXT");
    if (!columns.some((column) => column.name === "sale_type")) this.db.exec("ALTER TABLE invoices ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'hostora_service'");
    if (!columns.some((column) => column.name === "partner_provider")) this.db.exec("ALTER TABLE invoices ADD COLUMN partner_provider TEXT");
    if (!columns.some((column) => column.name === "gateway_create_date")) this.db.exec("ALTER TABLE invoices ADD COLUMN gateway_create_date TEXT");
    if (!columns.some((column) => column.name === "gateway_payment_date")) this.db.exec("ALTER TABLE invoices ADD COLUMN gateway_payment_date TEXT");
    if (!columns.some((column) => column.name === "gateway_transaction_no")) this.db.exec("ALTER TABLE invoices ADD COLUMN gateway_transaction_no TEXT");
    if (!columns.some((column) => column.name === "subtotal_vnd")) this.db.exec("ALTER TABLE invoices ADD COLUMN subtotal_vnd INTEGER");
    if (!columns.some((column) => column.name === "discount_vnd")) this.db.exec("ALTER TABLE invoices ADD COLUMN discount_vnd INTEGER NOT NULL DEFAULT 0");
    if (!columns.some((column) => column.name === "voucher_code")) this.db.exec("ALTER TABLE invoices ADD COLUMN voucher_code TEXT");
    if (!columns.some((column) => column.name === "earned_voucher_code")) this.db.exec("ALTER TABLE invoices ADD COLUMN earned_voucher_code TEXT");
    if (!columns.some((column) => column.name === "earned_voucher_amount_vnd")) this.db.exec("ALTER TABLE invoices ADD COLUMN earned_voucher_amount_vnd INTEGER");
    if (!columns.some((column) => column.name === "earned_voucher_expires_at")) this.db.exec("ALTER TABLE invoices ADD COLUMN earned_voucher_expires_at TEXT");
    const saleRequestColumns = this.db.prepare("PRAGMA table_info(sale_requests)").all() as { name: string }[];
    if (!saleRequestColumns.some((column) => column.name === "access_hash")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN access_hash TEXT NOT NULL DEFAULT ''");
    if (!saleRequestColumns.some((column) => column.name === "profile_json")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN profile_json TEXT NOT NULL DEFAULT '{}'");
    if (!saleRequestColumns.some((column) => column.name === "consultation_preference")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN consultation_preference TEXT NOT NULL DEFAULT 'ai'");
    if (!saleRequestColumns.some((column) => column.name === "consultation_at")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN consultation_at TEXT");
    if (!saleRequestColumns.some((column) => column.name === "consultation_channel")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN consultation_channel TEXT NOT NULL DEFAULT 'email'");
    if (!saleRequestColumns.some((column) => column.name === "voucher_code")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN voucher_code TEXT");
    if (!saleRequestColumns.some((column) => column.name === "cancel_reason")) this.db.exec("ALTER TABLE sale_requests ADD COLUMN cancel_reason TEXT");
  }

  close() {
    this.db.close();
  }

  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private addEvent(invoiceId: string, type: string, detail: string, externalKey?: string) {
    this.db.prepare("INSERT OR IGNORE INTO invoice_events (id, invoice_id, type, detail, external_key, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), invoiceId, type, detail, externalKey ?? null, new Date().toISOString());
  }

  createSaleRequest(input: {
    productId: string;
    provider: string;
    productName: string;
    contact: string;
    note?: string;
    profile: PurchaseProfile;
    consultationPreference: ConsultationPreference;
    consultationAt?: string | null;
    consultationChannel: ConsultationChannel;
    voucherCode?: string;
  }): CreatedSaleRequest {
    const productId = input.productId.trim();
    const provider = input.provider.trim();
    const productName = input.productName.trim();
    const contact = input.contact.trim();
    const note = (input.note ?? "").trim();
    const profile = input.profile;
    const consultationAt = input.consultationAt ? new Date(input.consultationAt) : null;
    const voucherCode = (input.voucherCode ?? "").trim().toUpperCase() || null;
    const now = Date.now();
    if (
      !/^[a-z0-9-]{2,80}$/.test(productId) || !provider || provider.length > 100 ||
      !productName || productName.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ||
      contact.length > 160 || note.length > 1500 || profile.customerName.trim().length < 2 ||
      profile.customerName.length > 100 || profile.phone.length > 30 || profile.companyName.length > 160 ||
      profile.businessType.trim().length < 2 || profile.businessType.length > 120 ||
      profile.currentWebsite.length > 253 || profile.mainOffer.length > 500 ||
      profile.serviceArea.length > 160 || profile.seoGoals.length > 500 ||
      profile.websiteGoal.trim().length < 5 || profile.websiteGoal.length > 500 ||
      profile.targetCustomers.trim().length < 3 || profile.targetCustomers.length > 500 ||
      !["idea", "building", "live", "migrating"].includes(profile.websiteStatus) ||
      !["under_1k", "1k_10k", "10k_50k", "over_50k"].includes(profile.estimatedTraffic) ||
      !["under_500k", "500k_1m", "1m_3m", "over_3m"].includes(profile.budgetRange) ||
      !["scheduled", "ai"].includes(input.consultationPreference) ||
      !["email", "phone", "video"].includes(input.consultationChannel) ||
      (input.consultationPreference === "scheduled" && input.consultationChannel === "phone" && profile.phone.trim().length < 8) ||
      (input.consultationPreference === "scheduled" && (!consultationAt || Number.isNaN(consultationAt.valueOf()) || consultationAt.valueOf() < now + 30 * 60 * 1000 || consultationAt.valueOf() > now + 90 * 24 * 60 * 60 * 1000))
    ) {
      throw new Error("Thông tin yêu cầu mua chưa hợp lệ.");
    }
    if (voucherCode) {
      const voucher = this.db.prepare("SELECT status, expires_at FROM vouchers WHERE code = ?").get(voucherCode) as { status: string; expires_at: string } | undefined;
      if (!voucher || voucher.status !== "active" || new Date(voucher.expires_at).valueOf() <= now) throw new Error("Voucher không hợp lệ hoặc đã hết hạn.");
    }
    const id = `HSR-${randomBytes(5).toString("hex").toUpperCase()}`;
    const accessCode = randomBytes(24).toString("base64url");
    const createdAt = new Date().toISOString();
    this.db.prepare("INSERT INTO sale_requests (id, access_hash, product_id, provider, product_name, contact, note, profile_json, consultation_preference, consultation_at, consultation_channel, voucher_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)")
      .run(id, hashAccessCode(accessCode), productId, provider, productName, contact.toLowerCase(), note, JSON.stringify(profile), input.consultationPreference, consultationAt?.toISOString() ?? null, input.consultationChannel, voucherCode, createdAt);
    return {
      id, accessCode, productId, provider, productName, contact: contact.toLowerCase(), note,
      profile, consultationPreference: input.consultationPreference,
      consultationAt: consultationAt?.toISOString() ?? null,
      consultationChannel: input.consultationChannel, voucherCode, cancelReason: null,
      status: "new", invoiceId: null, createdAt,
    };
  }

  listSaleRequests(): SaleRequest[] {
    const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM sale_requests WHERE created_at < ?").run(retentionCutoff);
    const rows = this.db.prepare("SELECT id, product_id, provider, product_name, contact, note, profile_json, consultation_preference, consultation_at, consultation_channel, voucher_code, cancel_reason, status, invoice_id, created_at FROM sale_requests ORDER BY created_at DESC").all() as {
      id: string; product_id: string; provider: string; product_name: string; contact: string; note: string; profile_json: string; consultation_preference: ConsultationPreference; consultation_at: string | null; consultation_channel: ConsultationChannel; voucher_code: string | null; cancel_reason: string | null; status: SaleRequest["status"]; invoice_id: string | null; created_at: string;
    }[];
    return rows.map((row) => ({ id: row.id, productId: row.product_id, provider: row.provider, productName: row.product_name, contact: row.contact, note: row.note, profile: parseProfile(row.profile_json), consultationPreference: row.consultation_preference, consultationAt: row.consultation_at, consultationChannel: row.consultation_channel, voucherCode: row.voucher_code, cancelReason: row.cancel_reason, status: row.status, invoiceId: row.invoice_id, createdAt: row.created_at }));
  }

  listSaleRequestsPage(input: {
    search?: string;
    status?: SaleRequest["status"];
    page: number;
    pageSize: number;
  }): SaleRequestPage {
    const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare("DELETE FROM sale_requests WHERE created_at < ?").run(retentionCutoff);
    const page = Math.max(1, Math.trunc(input.page));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize)));
    const where: string[] = [];
    const values: string[] = [];
    const search = input.search?.trim().toLocaleLowerCase("vi").slice(0, 160);
    if (search) {
      const escaped = search.replace(/[\\%_]/g, "\\$&");
      where.push("(lower(id) LIKE ? ESCAPE '\\' OR lower(product_name) LIKE ? ESCAPE '\\' OR lower(provider) LIKE ? ESCAPE '\\' OR lower(contact) LIKE ? ESCAPE '\\' OR lower(note) LIKE ? ESCAPE '\\' OR lower(profile_json) LIKE ? ESCAPE '\\')");
      for (let index = 0; index < 6; index += 1) values.push(`%${escaped}%`);
    }
    if (input.status) {
      where.push("status = ?");
      values.push(input.status);
    }
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const total = (this.db.prepare(`SELECT COUNT(*) AS count FROM sale_requests${whereSql}`).get(...values) as { count: number }).count;
    const rows = this.db.prepare(`SELECT id, product_id, provider, product_name, contact, note, profile_json, consultation_preference, consultation_at, consultation_channel, voucher_code, cancel_reason, status, invoice_id, created_at FROM sale_requests${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...values, pageSize, (page - 1) * pageSize) as {
        id: string; product_id: string; provider: string; product_name: string; contact: string; note: string; profile_json: string; consultation_preference: ConsultationPreference; consultation_at: string | null; consultation_channel: ConsultationChannel; voucher_code: string | null; cancel_reason: string | null; status: SaleRequest["status"]; invoice_id: string | null; created_at: string;
      }[];
    const counts = this.db.prepare(`
      SELECT COUNT(*) AS all_count,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN status = 'invoiced' THEN 1 ELSE 0 END) AS invoiced,
        SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) AS declined,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM sale_requests
    `).get() as { all_count: number; new_count: number; invoiced: number; declined: number; cancelled: number };
    return {
      items: rows.map((row) => ({ id: row.id, productId: row.product_id, provider: row.provider, productName: row.product_name, contact: row.contact, note: row.note, profile: parseProfile(row.profile_json), consultationPreference: row.consultation_preference, consultationAt: row.consultation_at, consultationChannel: row.consultation_channel, voucherCode: row.voucher_code, cancelReason: row.cancel_reason, status: row.status, invoiceId: row.invoice_id, createdAt: row.created_at })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      counts: { all: counts.all_count, new: counts.new_count, invoiced: counts.invoiced, declined: counts.declined, cancelled: counts.cancelled },
    };
  }

  findSaleRequestForCustomer(id: string, accessCode: string): SaleRequest | null {
    const row = this.db.prepare("SELECT access_hash FROM sale_requests WHERE id = ?").get(id) as { access_hash: string } | undefined;
    if (!row || !accessCode || accessCode.length > 128 || !row.access_hash) return null;
    const actual = Buffer.from(hashAccessCode(accessCode), "hex");
    const expected = Buffer.from(row.access_hash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return this.listSaleRequests().find((request) => request.id === id) ?? null;
  }

  cancelSaleRequest(id: string, accessCode: string, reason: string): SaleRequest {
    const request = this.findSaleRequestForCustomer(id, accessCode);
    const detail = reason.trim();
    if (!request || request.status !== "new" || detail.length < 5 || detail.length > 500) {
      throw new Error("Yêu cầu mua không thể hủy hoặc lý do chưa hợp lệ.");
    }
    this.db.prepare("UPDATE sale_requests SET status = 'cancelled', cancel_reason = ? WHERE id = ? AND status = 'new'").run(detail, id);
    return this.listSaleRequests().find((item) => item.id === id)!;
  }

  createAdminEmailCode(now = Date.now()): { code: string; expiresAt: string } {
    const existing = this.db.prepare("SELECT requested_at FROM admin_email_codes WHERE singleton = 1").get() as { requested_at: string } | undefined;
    if (existing && new Date(existing.requested_at).valueOf() > now - 60_000) throw new Error("Vui lòng đợi trước khi gửi mã mới.");
    const code = String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
    const requestedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + 10 * 60_000).toISOString();
    this.db.prepare("INSERT INTO admin_email_codes (singleton, code_hash, expires_at, requested_at, attempts) VALUES (1, ?, ?, ?, 0) ON CONFLICT(singleton) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, requested_at = excluded.requested_at, attempts = 0")
      .run(hashAccessCode(code), expiresAt, requestedAt);
    return { code, expiresAt };
  }

  verifyAdminEmailCode(code: string, now = Date.now()): boolean {
    const row = this.db.prepare("SELECT code_hash, expires_at, attempts FROM admin_email_codes WHERE singleton = 1").get() as { code_hash: string; expires_at: string; attempts: number } | undefined;
    if (!row || !/^\d{6}$/.test(code) || row.attempts >= 5 || new Date(row.expires_at).valueOf() <= now) return false;
    this.db.prepare("UPDATE admin_email_codes SET attempts = attempts + 1 WHERE singleton = 1").run();
    const actual = Buffer.from(hashAccessCode(code), "hex");
    const expected = Buffer.from(row.code_hash, "hex");
    const valid = actual.length === expected.length && timingSafeEqual(actual, expected);
    if (valid) this.db.prepare("DELETE FROM admin_email_codes WHERE singleton = 1").run();
    return valid;
  }

  createInvoiceForSaleRequest(id: string, input: { amountVnd: number; description?: string }): CreatedInvoice {
    const row = this.db.prepare("SELECT provider, product_name, contact, voucher_code, status FROM sale_requests WHERE id = ?").get(id) as { provider: string; product_name: string; contact: string; voucher_code: string | null; status: SaleRequest["status"] } | undefined;
    if (!row || row.status !== "new") throw new Error("Yêu cầu mua không còn chờ báo giá.");
    const invoice = this.createInvoice({ title: row.product_name, description: input.description, amountVnd: input.amountVnd, saleType: "partner_service", partnerProvider: row.provider, customerEmail: row.contact, voucherCode: row.voucher_code ?? undefined });
    this.db.prepare("UPDATE sale_requests SET status = 'invoiced', invoice_id = ? WHERE id = ? AND status = 'new'").run(invoice.id, id);
    return invoice;
  }

  createInvoice(input: { title: string; amountVnd: number; description?: string; saleType?: "hostora_service" | "partner_service"; partnerProvider?: string; customerEmail?: string; voucherCode?: string }): CreatedInvoice {
    const title = input.title.trim();
    const description = (input.description ?? "").trim();
    const saleType = input.saleType ?? "hostora_service";
    const partnerProvider = (input.partnerProvider ?? "").trim();
    const customerEmail = (input.customerEmail ?? "").trim().toLowerCase();
    const voucherCode = (input.voucherCode ?? "").trim().toUpperCase() || null;
    let discountVnd = 0;
    if (voucherCode) {
      const voucher = this.db.prepare("SELECT amount_vnd, min_order_vnd, status, expires_at FROM vouchers WHERE code = ?").get(voucherCode) as { amount_vnd: number; min_order_vnd: number; status: string; expires_at: string } | undefined;
      if (!voucher || voucher.status !== "active" || new Date(voucher.expires_at).valueOf() <= Date.now() || input.amountVnd < voucher.min_order_vnd) throw new Error("Voucher không đủ điều kiện áp dụng.");
      discountVnd = Math.min(voucher.amount_vnd, input.amountVnd - 5000);
    }
    const payableVnd = input.amountVnd - discountVnd;
    if (!title || title.length > 160 || description.length > 1000 || !Number.isSafeInteger(input.amountVnd) || input.amountVnd < 5000 || input.amountVnd > 1_000_000_000 ||
      (saleType === "partner_service" && (!partnerProvider || partnerProvider.length > 100)) ||
      (customerEmail && (customerEmail.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)))) {
      throw new Error("Thông tin hóa đơn hoặc số tiền không hợp lệ.");
    }
    const id = `HST-${randomBytes(6).toString("hex").toUpperCase()}`;
    const accessCode = randomBytes(24).toString("base64url");
    const now = new Date().toISOString();
    this.transaction(() => {
      this.db.prepare("INSERT INTO invoices (id, access_hash, customer_email, title, description, amount_vnd, subtotal_vnd, discount_vnd, voucher_code, sale_type, partner_provider, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)")
        .run(id, hashAccessCode(accessCode), customerEmail || null, title, description, payableVnd, input.amountVnd, discountVnd, voucherCode, saleType, saleType === "partner_service" ? partnerProvider : null, now, now);
      if (voucherCode) this.db.prepare("UPDATE vouchers SET status = 'redeemed', redeemed_invoice_id = ?, redeemed_at = ? WHERE code = ? AND status = 'active'").run(id, now, voucherCode);
      this.addEvent(id, "created", "Hóa đơn được tạo bởi quản trị viên.");
    });
    return { ...this.getInvoice(id)!, accessCode };
  }

  getInvoice(id: string): Invoice | null {
    const row = this.db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as InvoiceRow | undefined;
    return row ? toInvoice(row) : null;
  }

  listInvoices(): Invoice[] {
    return (this.db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all() as InvoiceRow[]).map(toInvoice);
  }

  getRevenueAnalytics(now = new Date()): RevenueAnalytics {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dateKey = (offset: number) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    const currentStart = dateKey(-29);
    const previousStart = dateKey(-59);
    const previousEnd = dateKey(-30);
    const recognized = "('paid','refund_requested','refund_pending')";
    const dailyRows = this.db.prepare(`
      SELECT substr(created_at, 1, 10) AS day,
        SUM(CASE WHEN status IN ${recognized} THEN amount_vnd ELSE 0 END) AS revenue_vnd,
        SUM(CASE WHEN status IN ${recognized} THEN 1 ELSE 0 END) AS paid_orders
      FROM invoices
      WHERE substr(created_at, 1, 10) >= ?
      GROUP BY day
      ORDER BY day
    `).all(previousStart) as Array<{ day: string; revenue_vnd: number; paid_orders: number }>;
    const byDay = new Map(dailyRows.map((row) => [row.day, row]));
    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = dateKey(index - 29);
      const row = byDay.get(date);
      return { date, revenueVnd: row?.revenue_vnd ?? 0, paidOrders: row?.paid_orders ?? 0 };
    });
    const period = (from: string, to: string) => this.db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ${recognized} THEN amount_vnd ELSE 0 END), 0) AS revenue_vnd,
        COALESCE(SUM(CASE WHEN status IN ${recognized} THEN 1 ELSE 0 END), 0) AS paid_orders
      FROM invoices
      WHERE substr(created_at, 1, 10) BETWEEN ? AND ?
    `).get(from, to) as { revenue_vnd: number; paid_orders: number };
    const current = period(currentStart, dateKey(0));
    const previous = period(previousStart, previousEnd);
    const mixRows = this.db.prepare("SELECT status, COUNT(*) AS count FROM invoices GROUP BY status").all() as Array<{ status: InvoiceStatus; count: number }>;
    const statusMix: Record<InvoiceStatus, number> = {
      pending: 0, cancel_requested: 0, paid: 0, refund_requested: 0,
      refund_pending: 0, refunded: 0, cancelled: 0,
    };
    for (const row of mixRows) statusMix[row.status] = row.count;
    const differenceVnd = current.revenue_vnd - previous.revenue_vnd;
    return {
      daily,
      statusMix,
      current30Days: { revenueVnd: current.revenue_vnd, paidOrders: current.paid_orders },
      previous30Days: { revenueVnd: previous.revenue_vnd, paidOrders: previous.paid_orders },
      differenceVnd,
      differencePercent: previous.revenue_vnd > 0 ? Math.round((differenceVnd / previous.revenue_vnd) * 10_000) / 100 : null,
    };
  }

  listInvoicesPage(input: InvoiceListQuery): InvoicePage {
    const page = Math.max(1, Math.trunc(input.page));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize)));
    const where: string[] = [];
    const values: Array<string | number> = [];
    const search = input.search?.trim().toLocaleLowerCase("vi").slice(0, 160);
    if (search) {
      const escaped = search.replace(/[\\%_]/g, "\\$&");
      where.push("(lower(id) LIKE ? ESCAPE '\\' OR lower(COALESCE(customer_email, '')) LIKE ? ESCAPE '\\' OR lower(title) LIKE ? ESCAPE '\\' OR lower(description) LIKE ? ESCAPE '\\' OR lower(COALESCE(partner_provider, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(provider, '')) LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM sale_requests sr WHERE sr.invoice_id = invoices.id AND lower(sr.profile_json) LIKE ? ESCAPE '\\'))");
      for (let index = 0; index < 7; index += 1) values.push(`%${escaped}%`);
    }
    const queueStatuses: Record<NonNullable<InvoiceListQuery["queue"]>, InvoiceStatus[]> = {
      all: [],
      awaiting_payment: ["pending", "cancel_requested"],
      paid: ["paid"],
      refunds: ["refund_requested", "refund_pending", "refunded"],
      cancelled: ["cancelled"],
    };
    const statuses = queueStatuses[input.queue ?? "all"];
    if (statuses.length) {
      where.push(`status IN (${statuses.map(() => "?").join(", ")})`);
      values.push(...statuses);
    }
    if (input.provider === "unassigned") where.push("provider IS NULL");
    else if (input.provider) {
      where.push("provider = ?");
      values.push(input.provider);
    }
    if (input.saleType) {
      where.push("sale_type = ?");
      values.push(input.saleType);
    }
    if (input.createdFrom) {
      where.push("created_at >= ?");
      values.push(input.createdFrom);
    }
    if (input.createdTo) {
      where.push("created_at <= ?");
      values.push(input.createdTo);
    }
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS count FROM invoices${whereSql}`).get(...values) as { count: number };
    const sortColumns = { createdAt: "created_at", updatedAt: "updated_at", amountVnd: "amount_vnd" } as const;
    const sortColumn = sortColumns[input.sortBy ?? "createdAt"];
    const direction = input.sortDirection === "asc" ? "ASC" : "DESC";
    const rows = this.db.prepare(`SELECT * FROM invoices${whereSql} ORDER BY ${sortColumn} ${direction}, id DESC LIMIT ? OFFSET ?`)
      .all(...values, pageSize, (page - 1) * pageSize) as InvoiceRow[];
    const counts = this.db.prepare(`
      SELECT
        COUNT(*) AS all_count,
        SUM(CASE WHEN status IN ('pending', 'cancel_requested') THEN 1 ELSE 0 END) AS awaiting_payment,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN status IN ('refund_requested', 'refund_pending', 'refunded') THEN 1 ELSE 0 END) AS refunds,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status IN ('paid', 'refund_requested', 'refund_pending') THEN 1 ELSE 0 END) AS recognized_paid_orders,
        SUM(CASE WHEN status IN ('paid', 'refund_requested', 'refund_pending') THEN amount_vnd ELSE 0 END) AS recognized_revenue_vnd
      FROM invoices
    `).get() as { all_count: number; awaiting_payment: number; paid: number; refunds: number; cancelled: number; recognized_paid_orders: number; recognized_revenue_vnd: number };
    const total = totalRow.count;
    return {
      items: rows.map(toInvoice),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      counts: {
        all: counts.all_count,
        awaitingPayment: counts.awaiting_payment,
        paid: counts.paid,
        refunds: counts.refunds,
        cancelled: counts.cancelled,
      },
      financials: {
        recognizedPaidOrders: counts.recognized_paid_orders,
        recognizedRevenueVnd: counts.recognized_revenue_vnd,
      },
    };
  }

  findForCustomer(id: string, accessCode: string): Invoice | null {
    const row = this.db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as InvoiceRow | undefined;
    if (!row || !accessCode || accessCode.length > 128) return null;
    const actual = Buffer.from(hashAccessCode(accessCode), "hex");
    const expected = Buffer.from(row.access_hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? toInvoice(row) : null;
  }

  getEvents(invoiceId: string): InvoiceEvent[] {
    const rows = this.db.prepare("SELECT id, invoice_id, type, detail, created_at FROM invoice_events WHERE invoice_id = ? ORDER BY created_at, rowid").all(invoiceId) as {
      id: string; invoice_id: string; type: string; detail: string; created_at: string;
    }[];
    return rows.map((row) => ({ id: row.id, invoiceId: row.invoice_id, type: row.type, detail: row.detail, createdAt: row.created_at }));
  }

  beginPayment(id: string, provider: PaymentProvider): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || invoice.status !== "pending" || (invoice.provider && invoice.provider !== provider)) {
        throw new Error("Hóa đơn đã dùng cổng thanh toán khác hoặc không còn chờ thanh toán.");
      }
      if (invoice.provider === provider) return invoice;
      this.db.prepare("UPDATE invoices SET provider = ?, updated_at = ? WHERE id = ?")
        .run(provider, new Date().toISOString(), id);
      this.addEvent(id, "payment_started", `Khách chọn ${provider}.`);
      return this.getInvoice(id)!;
    });
  }

  setCheckoutReference(id: string, reference: string, createDate?: string): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || !invoice.provider || !["pending", "cancel_requested"].includes(invoice.status) || !reference || (invoice.providerReference && invoice.providerReference !== reference)) {
        throw new Error("Không thể lưu phiên thanh toán này.");
      }
      if (createDate && !/^\d{14}$/.test(createDate)) throw new Error("Ngày giao dịch không hợp lệ.");
      this.db.prepare("UPDATE invoices SET provider_reference = ?, gateway_create_date = ?, updated_at = ? WHERE id = ?")
        .run(reference, createDate ?? invoice.gatewayCreateDate, new Date().toISOString(), id);
      this.addEvent(id, "checkout_created", `Đã tạo phiên ${invoice.provider}.`, `${invoice.provider}:checkout:${reference}`);
      return this.getInvoice(id)!;
    });
  }

  markPaid(id: string, provider: PaymentProvider, reference: string, amountVnd: number, currency: string, paymentDate?: string, transactionNo?: string): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || amountVnd !== invoice.amountVnd || currency.toLowerCase() !== "vnd" || !reference) throw new Error("Giao dịch không khớp hóa đơn.");
      if (invoice.status === "paid" && invoice.provider === provider && invoice.providerReference === reference) return invoice;
      if (!["pending", "cancel_requested"].includes(invoice.status) || (invoice.provider && invoice.provider !== provider) || (invoice.providerReference && invoice.providerReference !== reference)) throw new Error("Đơn không ở trạng thái chờ thanh toán qua cổng này.");
      if (paymentDate && !/^\d{14}$/.test(paymentDate)) throw new Error("Ngày giao dịch không hợp lệ.");
      const now = new Date().toISOString();
      const status = invoice.status === "cancel_requested" ? "refund_requested" : "paid";
      this.db.prepare("UPDATE invoices SET status = ?, provider = ?, provider_reference = ?, gateway_payment_date = ?, gateway_transaction_no = ?, updated_at = ? WHERE id = ?")
        .run(status, provider, reference, paymentDate ?? null, transactionNo ?? null, now, id);
      this.addEvent(id, "paid", `Đã xác nhận thanh toán qua ${provider}.`, `${provider}:paid:${reference}`);
      if (status === "paid" && invoice.amountVnd >= 1_000_000 && !invoice.earnedVoucherCode) {
        const code = `HOSTORA-${randomBytes(5).toString("hex").toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        this.db.prepare("INSERT INTO vouchers (code, amount_vnd, min_order_vnd, status, issued_invoice_id, expires_at, created_at) VALUES (?, 100000, 1000000, 'active', ?, ?, ?)")
          .run(code, id, expiresAt, now);
        this.db.prepare("UPDATE invoices SET earned_voucher_code = ?, earned_voucher_amount_vnd = 100000, earned_voucher_expires_at = ? WHERE id = ?")
          .run(code, expiresAt, id);
        this.addEvent(id, "voucher_issued", "Đã phát voucher 100.000đ cho đơn tiếp theo từ 1.000.000đ.");
      }
      if (status === "refund_requested") this.addEvent(id, "refund_requested", "Khách đã yêu cầu hủy trong lúc thanh toán; cần hoàn tiền.");
      return this.getInvoice(id)!;
    });
  }

  completeDemoPayment(id: string, accessCode: string, method: PaymentMethod): Invoice {
    const invoice = this.findForCustomer(id, accessCode);
    const reference = `DEMO-${method}-${id}`;
    if (!invoice) throw new Error("Không tìm thấy hóa đơn với mã truy cập này.");
    if (invoice.status === "paid" && invoice.provider === "demo" && invoice.providerReference === reference) return invoice;
    if (invoice.status !== "pending" || invoice.provider) throw new Error("Hóa đơn không còn chờ thanh toán mô phỏng.");

    this.beginPayment(id, "demo");
    this.setCheckoutReference(id, reference);
    const paid = this.markPaid(id, "demo", reference, invoice.amountVnd, "vnd");
    this.addEvent(
      id,
      "demo_payment",
      `Khách hoàn tất thanh toán mô phỏng ${method === "stripe" ? "Stripe" : "VNPay"}; không có tiền thật được thu.`,
      `demo:completed:${reference}`,
    );
    return paid;
  }

  completeDemoRefund(id: string, note: string): Invoice {
    const invoice = this.getInvoice(id);
    if (!invoice || invoice.provider !== "demo" || invoice.status !== "refund_requested") {
      throw new Error("Đơn không thể hoàn tiền mô phỏng.");
    }
    const reference = `DEMO-REFUND-${id}`;
    this.startRefund(id, reference, note);
    const refunded = this.markRefunded(id, reference, invoice.amountVnd);
    this.addEvent(
      id,
      "demo_refunded",
      "HOSTORA hoàn tất hoàn tiền mô phỏng; không có tiền thật được chuyển.",
      `demo:refunded:${reference}`,
    );
    return refunded;
  }

  requestCancel(id: string, accessCode: string, reason: string): Invoice {
    return this.transaction(() => {
      const invoice = this.findForCustomer(id, accessCode);
      if (!invoice || invoice.status !== "pending") throw new Error("Hóa đơn không thể hủy ở trạng thái này.");
      const detail = reason.trim();
      if (detail.length < 5 || detail.length > 500) throw new Error("Lý do hủy không hợp lệ.");
      const status = invoice.provider ? "cancel_requested" : "cancelled";
      this.db.prepare("UPDATE invoices SET status = ?, refund_reason = ?, updated_at = ? WHERE id = ?")
        .run(status, detail, new Date().toISOString(), id);
      if (status === "cancelled" && invoice.voucherCode) {
        this.db.prepare("UPDATE vouchers SET status = 'active', redeemed_invoice_id = NULL, redeemed_at = NULL WHERE code = ? AND status = 'redeemed' AND redeemed_invoice_id = ?")
          .run(invoice.voucherCode, id);
      }
      this.addEvent(id, status, status === "cancelled" ? "Khách hủy trước khi thanh toán." : "Khách yêu cầu hủy khi phiên thanh toán đang mở.");
      return this.getInvoice(id)!;
    });
  }

  requestRefund(id: string, accessCode: string, reason: string): Invoice {
    return this.transaction(() => {
      const invoice = this.findForCustomer(id, accessCode);
      if (!invoice || invoice.status !== "paid") throw new Error("Đơn chưa đủ điều kiện yêu cầu hoàn tiền.");
      const detail = reason.trim();
      if (detail.length < 8 || detail.length > 500) throw new Error("Vui lòng nêu lý do từ 8 đến 500 ký tự.");
      this.db.prepare("UPDATE invoices SET status = 'refund_requested', refund_reason = ?, updated_at = ? WHERE id = ?")
        .run(detail, new Date().toISOString(), id);
      if (invoice.earnedVoucherCode) this.db.prepare("UPDATE vouchers SET status = 'revoked' WHERE code = ? AND status = 'active'").run(invoice.earnedVoucherCode);
      this.addEvent(id, "refund_requested", "Khách gửi yêu cầu hoàn tiền.");
      return this.getInvoice(id)!;
    });
  }

  startRefund(id: string, reference: string, note = "Quản trị viên duyệt yêu cầu hoàn tiền."): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || invoice.status !== "refund_requested" || !reference || note.trim().length < 8 || note.length > 500) throw new Error("Yêu cầu hoàn tiền chưa sẵn sàng.");
      this.db.prepare("UPDATE invoices SET status = 'refund_pending', refund_reference = ?, updated_at = ? WHERE id = ?")
        .run(reference, new Date().toISOString(), id);
      this.addEvent(id, "refund_pending", `Quản trị viên duyệt: ${note.trim()} Đã gửi yêu cầu tới cổng thanh toán.`, `refund:pending:${reference}`);
      return this.getInvoice(id)!;
    });
  }

  rejectRefund(id: string, note: string): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      const detail = note.trim();
      if (!invoice || invoice.status !== "refund_requested" || detail.length < 8 || detail.length > 500) throw new Error("Không thể từ chối yêu cầu hoàn tiền.");
      this.db.prepare("UPDATE invoices SET status = 'paid', updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
      if (invoice.earnedVoucherCode) {
        this.db.prepare("UPDATE vouchers SET status = 'active' WHERE code = ? AND status = 'revoked' AND expires_at > ?")
          .run(invoice.earnedVoucherCode, new Date().toISOString());
      }
      this.addEvent(id, "refund_rejected", detail);
      return this.getInvoice(id)!;
    });
  }

  markRefundFailed(id: string, reference: string, detail: string): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || invoice.status !== "refund_pending" || invoice.refundReference !== reference) throw new Error("Không tìm thấy khoản hoàn đang chờ.");
      this.db.prepare("UPDATE invoices SET status = 'refund_requested', refund_reference = NULL, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
      this.addEvent(id, "refund_failed", detail.slice(0, 300), `refund:failed:${reference}`);
      return this.getInvoice(id)!;
    });
  }

  markRefunded(id: string, reference: string, amountVnd: number): Invoice {
    return this.transaction(() => {
      const invoice = this.getInvoice(id);
      if (!invoice || invoice.refundReference !== reference || amountVnd !== invoice.amountVnd) throw new Error("Khoản hoàn không khớp hóa đơn.");
      if (invoice.status === "refunded") return invoice;
      if (invoice.status !== "refund_pending") throw new Error("Khoản hoàn chưa được gửi đi.");
      this.db.prepare("UPDATE invoices SET status = 'refunded', updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
      if (invoice.voucherCode) {
        this.db.prepare("UPDATE vouchers SET status = 'active', redeemed_invoice_id = NULL, redeemed_at = NULL WHERE code = ? AND status = 'redeemed' AND redeemed_invoice_id = ? AND expires_at > ?")
          .run(invoice.voucherCode, id, new Date().toISOString());
      }
      this.addEvent(id, "refunded", "Cổng thanh toán xác nhận hoàn tiền.", `refund:succeeded:${reference}`);
      return this.getInvoice(id)!;
    });
  }
}

let defaultStore: PaymentStore | undefined;
export function getPaymentStore() {
  return (defaultStore ??= new PaymentStore(process.env.HOSTORA_PAYMENTS_DB_PATH));
}
