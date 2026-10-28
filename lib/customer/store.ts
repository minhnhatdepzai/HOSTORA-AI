import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  CustomerAccount,
  AdminCustomerSupportCase,
  CustomerOrderSummary,
  CustomerSession,
  CustomerSupportCase,
  CustomerVoucher,
} from "@/lib/customer/types";

type CustomerRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  failed_logins: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_MS = 30 * 60 * 1000;

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const normalizedEmail = (email: string) => email.trim().toLowerCase();

function toCustomer(row: CustomerRow): CustomerAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CustomerStore {
  private readonly db: DatabaseSync;

  constructor(
    filename = path.join(process.cwd(), "data", "runtime", "payments.sqlite"),
  ) {
    if (filename !== ":memory:")
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.db.exec(
      "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;",
    );
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customer_accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        failed_logins INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_sessions (
        token_hash TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_sessions_customer ON customer_sessions(customer_id, expires_at);
      CREATE TABLE IF NOT EXISTS customer_password_resets (
        token_hash TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_resets_customer ON customer_password_resets(customer_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS customer_auth_limits (
        limit_key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        window_started_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_support_cases (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customer_accounts(id),
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_support_customer ON customer_support_cases(customer_id, created_at DESC);
    `);
  }

  close() {
    this.db.close();
  }

  consumeRateLimit(key: string, limit: number, windowMs: number) {
    const safeKey = createHash("sha256").update(key).digest("hex");
    const now = Date.now();
    const row = this.db
      .prepare(
        "SELECT attempts, window_started_at FROM customer_auth_limits WHERE limit_key = ?",
      )
      .get(safeKey) as
      | { attempts: number; window_started_at: string }
      | undefined;
    if (!row || now - new Date(row.window_started_at).valueOf() >= windowMs) {
      this.db
        .prepare(
          "INSERT INTO customer_auth_limits (limit_key, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(limit_key) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at",
        )
        .run(safeKey, new Date(now).toISOString());
      return true;
    }
    if (row.attempts >= limit) return false;
    this.db
      .prepare(
        "UPDATE customer_auth_limits SET attempts = attempts + 1 WHERE limit_key = ?",
      )
      .run(safeKey);
    return true;
  }

  createCustomer(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): CustomerAccount {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO customer_accounts (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        normalizedEmail(input.email),
        input.name.trim(),
        input.passwordHash,
        now,
        now,
      );
    return this.getCustomer(id)!;
  }

  getCustomer(id: string): CustomerAccount | null {
    const row = this.db
      .prepare("SELECT * FROM customer_accounts WHERE id = ?")
      .get(id) as CustomerRow | undefined;
    return row ? toCustomer(row) : null;
  }

  getCustomerWithPassword(email: string): CustomerRow | null {
    const row = this.db
      .prepare("SELECT * FROM customer_accounts WHERE email = ?")
      .get(normalizedEmail(email)) as CustomerRow | undefined;
    return row ?? null;
  }

  recordLoginFailure(customerId: string) {
    const current = this.db
      .prepare("SELECT failed_logins FROM customer_accounts WHERE id = ?")
      .get(customerId) as { failed_logins: number } | undefined;
    if (!current) return;
    const next = current.failed_logins + 1;
    const lockedUntil =
      next >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    this.db
      .prepare(
        "UPDATE customer_accounts SET failed_logins = ?, locked_until = ?, updated_at = ? WHERE id = ?",
      )
      .run(next >= 5 ? 0 : next, lockedUntil, new Date().toISOString(), customerId);
  }

  clearLoginFailures(customerId: string) {
    this.db
      .prepare(
        "UPDATE customer_accounts SET failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
      )
      .run(new Date().toISOString(), customerId);
  }

  createSession(customerId: string): CustomerSession {
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.valueOf() + SESSION_MS).toISOString();
    this.db
      .prepare(
        "INSERT INTO customer_sessions (token_hash, customer_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(tokenHash(token), customerId, expiresAt, now.toISOString());
    return { customer: this.getCustomer(customerId)!, token, expiresAt };
  }

  findSession(token: string): CustomerAccount | null {
    if (!token || token.length > 256) return null;
    const row = this.db
      .prepare(
        `SELECT a.* FROM customer_sessions s
         JOIN customer_accounts a ON a.id = s.customer_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .get(tokenHash(token), new Date().toISOString()) as CustomerRow | undefined;
    return row ? toCustomer(row) : null;
  }

  deleteSession(token: string) {
    if (!token || token.length > 256) return;
    this.db
      .prepare("DELETE FROM customer_sessions WHERE token_hash = ?")
      .run(tokenHash(token));
  }

  createPasswordReset(customerId: string) {
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.valueOf() + RESET_MS).toISOString();
    this.db
      .prepare(
        "UPDATE customer_password_resets SET used_at = ? WHERE customer_id = ? AND used_at IS NULL",
      )
      .run(now.toISOString(), customerId);
    this.db
      .prepare(
        "INSERT INTO customer_password_resets (token_hash, customer_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(tokenHash(token), customerId, expiresAt, now.toISOString());
    return { token, expiresAt };
  }

  resetPassword(token: string, passwordHash: string) {
    if (!token || token.length > 256) return null;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare(
          "SELECT customer_id FROM customer_password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
        )
        .get(tokenHash(token), new Date().toISOString()) as
        | { customer_id: string }
        | undefined;
      if (!row) {
        this.db.exec("ROLLBACK");
        return null;
      }
      const now = new Date().toISOString();
      this.db
        .prepare(
          "UPDATE customer_accounts SET password_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
        )
        .run(passwordHash, now, row.customer_id);
      this.db
        .prepare(
          "UPDATE customer_password_resets SET used_at = ? WHERE token_hash = ?",
        )
        .run(now, tokenHash(token));
      this.db
        .prepare("DELETE FROM customer_sessions WHERE customer_id = ?")
        .run(row.customer_id);
      this.db.exec("COMMIT");
      return this.getCustomer(row.customer_id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listVouchers(email: string): CustomerVoucher[] {
    try {
      const rows = this.db
        .prepare(
          `SELECT v.code, v.amount_vnd, v.min_order_vnd, v.status,
                  v.expires_at, v.issued_invoice_id, v.redeemed_invoice_id
           FROM vouchers v
           JOIN invoices i ON i.id = v.issued_invoice_id
           WHERE lower(i.customer_email) = ?
           ORDER BY CASE v.status WHEN 'active' THEN 0 WHEN 'redeemed' THEN 1 ELSE 2 END,
                    v.expires_at ASC`,
        )
        .all(normalizedEmail(email)) as Array<{
        code: string;
        amount_vnd: number;
        min_order_vnd: number;
        status: CustomerVoucher["status"];
        expires_at: string;
        issued_invoice_id: string;
        redeemed_invoice_id: string | null;
      }>;
      return rows.map((row) => ({
        code: row.code,
        amountVnd: row.amount_vnd,
        minOrderVnd: row.min_order_vnd,
        status: row.status,
        expiresAt: row.expires_at,
        issuedInvoiceId: row.issued_invoice_id,
        redeemedInvoiceId: row.redeemed_invoice_id,
      }));
    } catch {
      return [];
    }
  }

  listOrders(email: string): CustomerOrderSummary[] {
    try {
      return (
        this.db
          .prepare(
            `SELECT id, title, amount_vnd, status, updated_at
             FROM invoices
             WHERE lower(customer_email) = ?
             ORDER BY updated_at DESC
             LIMIT 50`,
          )
          .all(normalizedEmail(email)) as Array<{
          id: string;
          title: string;
          amount_vnd: number;
          status: CustomerOrderSummary["status"];
          updated_at: string;
        }>
      ).map((row) => ({
        id: row.id,
        title: row.title,
        amountVnd: row.amount_vnd,
        status: row.status,
        updatedAt: row.updated_at,
      }));
    } catch {
      return [];
    }
  }

  bestActiveVoucher(email: string) {
    return (
      this.listVouchers(email).find(
        (voucher) =>
          voucher.status === "active" &&
          new Date(voucher.expiresAt).valueOf() > Date.now(),
      ) ?? null
    );
  }

  createSupportCase(
    customerId: string,
    input: {
      subject: string;
      category: CustomerSupportCase["category"];
      message: string;
    },
  ): CustomerSupportCase {
    const id = `HTR-${randomBytes(5).toString("hex").toUpperCase()}`;
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO customer_support_cases (id, customer_id, subject, category, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?)",
      )
      .run(
        id,
        customerId,
        input.subject.trim(),
        input.category,
        input.message.trim(),
        now,
        now,
      );
    return {
      id,
      subject: input.subject.trim(),
      category: input.category,
      message: input.message.trim(),
      status: "new",
      createdAt: now,
    };
  }

  listSupportCases(customerId: string): CustomerSupportCase[] {
    return (
      this.db
        .prepare(
          "SELECT id, subject, category, message, status, created_at FROM customer_support_cases WHERE customer_id = ? ORDER BY created_at DESC",
        )
        .all(customerId) as Array<{
        id: string;
        subject: string;
        category: CustomerSupportCase["category"];
        message: string;
        status: CustomerSupportCase["status"];
        created_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      subject: row.subject,
      category: row.category,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  listAllSupportCases(): AdminCustomerSupportCase[] {
    return (
      this.db
        .prepare(
          `SELECT s.id, s.subject, s.category, s.message, s.status,
                  s.created_at, s.updated_at, a.name, a.email
           FROM customer_support_cases s
           JOIN customer_accounts a ON a.id = s.customer_id
           ORDER BY CASE s.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
                    s.updated_at DESC`,
        )
        .all() as Array<{
        id: string;
        subject: string;
        category: CustomerSupportCase["category"];
        message: string;
        status: CustomerSupportCase["status"];
        created_at: string;
        updated_at: string;
        name: string;
        email: string;
      }>
    ).map((row) => ({
      id: row.id,
      subject: row.subject,
      category: row.category,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customerName: row.name,
      customerEmail: row.email,
    }));
  }

  updateSupportCaseStatus(
    id: string,
    status: CustomerSupportCase["status"],
  ): AdminCustomerSupportCase | null {
    this.db
      .prepare(
        "UPDATE customer_support_cases SET status = ?, updated_at = ? WHERE id = ?",
      )
      .run(status, new Date().toISOString(), id);
    return this.listAllSupportCases().find((item) => item.id === id) ?? null;
  }
}

let defaultStore: CustomerStore | undefined;
export function getCustomerStore() {
  return (defaultStore ??= new CustomerStore(process.env.HOSTORA_PAYMENTS_DB_PATH));
}
