import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  CustomerAccount,
  CustomerAiSource,
  CustomerChatMessage,
  CustomerStudioPreferences,
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

export type RateLimitResult = {
  allowed: boolean;
  attempts: number;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

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
      CREATE TABLE IF NOT EXISTS customer_ai_memory (
        customer_id TEXT PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
        memory_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_chat_messages (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_chat_customer_conversation ON customer_chat_messages(customer_id, conversation_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS customer_ai_sources (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('pdf', 'docx', 'text', 'web', 'image')),
        source_url TEXT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS customer_ai_sources_customer ON customer_ai_sources(customer_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS customer_studio_preferences (
        customer_id TEXT PRIMARY KEY REFERENCES customer_accounts(id) ON DELETE CASCADE,
        style TEXT,
        color TEXT,
        writing_tone TEXT NOT NULL DEFAULT 'direct',
        revision_hints_json TEXT NOT NULL DEFAULT '[]',
        needs_work_reasons_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      );
    `);
  }

  close() {
    this.db.close();
  }

  consumeRateLimitDetailed(
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitResult {
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
      return {
        allowed: true,
        attempts: 1,
        limit,
        remaining: Math.max(0, limit - 1),
        resetAt: now + windowMs,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }
    const resetAt = new Date(row.window_started_at).valueOf() + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    if (row.attempts >= limit)
      return {
        allowed: false,
        attempts: row.attempts,
        limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds,
      };
    this.db
      .prepare(
        "UPDATE customer_auth_limits SET attempts = attempts + 1 WHERE limit_key = ?",
      )
      .run(safeKey);
    const attempts = row.attempts + 1;
    return {
      allowed: true,
      attempts,
      limit,
      remaining: Math.max(0, limit - attempts),
      resetAt,
      retryAfterSeconds,
    };
  }

  consumeRateLimit(key: string, limit: number, windowMs: number) {
    return this.consumeRateLimitDetailed(key, limit, windowMs).allowed;
  }

  getAiMemory(customerId: string): unknown | null {
    const row = this.db
      .prepare(
        "SELECT memory_json FROM customer_ai_memory WHERE customer_id = ?",
      )
      .get(customerId) as { memory_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.memory_json) as unknown;
    } catch {
      return null;
    }
  }

  saveAiMemory(customerId: string, memory: unknown) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO customer_ai_memory (customer_id, memory_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET memory_json = excluded.memory_json, updated_at = excluded.updated_at`,
      )
      .run(customerId, JSON.stringify(memory), now);
  }

  latestConversationId(customerId: string) {
    const row = this.db
      .prepare(
        `SELECT conversation_id FROM customer_chat_messages
         WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(customerId) as { conversation_id: string } | undefined;
    return row?.conversation_id ?? null;
  }

  appendChatMessage(input: {
    id?: string;
    customerId: string;
    conversationId: string;
    role: CustomerChatMessage["role"];
    content: string;
    sources?: unknown[];
  }) {
    const id = input.id ?? randomUUID();
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT OR IGNORE INTO customer_chat_messages
         (id, customer_id, conversation_id, role, content, sources_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.customerId,
        input.conversationId,
        input.role,
        input.content.slice(0, 8_000),
        JSON.stringify(input.sources ?? []),
        createdAt,
      );
    return id;
  }

  listChatMessages(
    customerId: string,
    conversationId: string,
    limit = 100,
  ): CustomerChatMessage[] {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, role, content, sources_json, created_at
         FROM customer_chat_messages
         WHERE customer_id = ? AND conversation_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(customerId, conversationId, safeLimit) as Array<{
      id: string;
      conversation_id: string;
      role: CustomerChatMessage["role"];
      content: string;
      sources_json: string;
      created_at: string;
    }>;
    return rows.reverse().map((row) => {
      let sources: unknown[] = [];
      try {
        const parsed = JSON.parse(row.sources_json) as unknown;
        if (Array.isArray(parsed)) sources = parsed.slice(0, 20);
      } catch {}
      return {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        sources,
        createdAt: row.created_at,
      };
    });
  }

  clearAiHistory(customerId: string, clearMemory = false) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("DELETE FROM customer_chat_messages WHERE customer_id = ?")
        .run(customerId);
      if (clearMemory) {
        this.db
          .prepare("DELETE FROM customer_ai_memory WHERE customer_id = ?")
          .run(customerId);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createAiSource(
    customerId: string,
    input: {
      title: string;
      kind: CustomerAiSource["kind"];
      sourceUrl?: string | null;
      content: string;
    },
  ): CustomerAiSource {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO customer_ai_sources
         (id, customer_id, title, kind, source_url, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        customerId,
        input.title.trim().slice(0, 160),
        input.kind,
        input.sourceUrl ?? null,
        input.content.slice(0, 80_000),
        now,
        now,
      );
    return {
      id,
      title: input.title.trim().slice(0, 160),
      kind: input.kind,
      sourceUrl: input.sourceUrl ?? null,
      content: input.content.slice(0, 80_000),
      createdAt: now,
      updatedAt: now,
    };
  }

  listAiSources(customerId: string): CustomerAiSource[] {
    return (
      this.db
        .prepare(
          `SELECT id, title, kind, source_url, content, created_at, updated_at
           FROM customer_ai_sources WHERE customer_id = ?
           ORDER BY updated_at DESC LIMIT 30`,
        )
        .all(customerId) as Array<{
        id: string;
        title: string;
        kind: CustomerAiSource["kind"];
        source_url: string | null;
        content: string;
        created_at: string;
        updated_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      sourceUrl: row.source_url,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  deleteAiSource(customerId: string, id: string) {
    return (
      this.db
        .prepare(
          "DELETE FROM customer_ai_sources WHERE customer_id = ? AND id = ?",
        )
        .run(customerId, id).changes > 0
    );
  }

  getStudioPreferences(customerId: string): CustomerStudioPreferences {
    const row = this.db
      .prepare(
        `SELECT style, color, writing_tone, revision_hints_json,
                needs_work_reasons_json, updated_at
         FROM customer_studio_preferences WHERE customer_id = ?`,
      )
      .get(customerId) as
      | {
          style: CustomerStudioPreferences["style"];
          color: string | null;
          writing_tone: CustomerStudioPreferences["writingTone"];
          revision_hints_json: string;
          needs_work_reasons_json: string;
          updated_at: string;
        }
      | undefined;
    if (!row)
      return {
        style: null,
        color: null,
        writingTone: "direct",
        revisionHints: [],
        needsWorkReasons: [],
        updatedAt: null,
      };
    const array = <T>(value: string): T[] => {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    };
    return {
      style: row.style,
      color: row.color,
      writingTone: row.writing_tone,
      revisionHints: array<string>(row.revision_hints_json).slice(-8),
      needsWorkReasons: array<
        CustomerStudioPreferences["needsWorkReasons"][number]
      >(row.needs_work_reasons_json).slice(-8),
      updatedAt: row.updated_at,
    };
  }

  saveStudioPreferences(
    customerId: string,
    input: Partial<
      Pick<CustomerStudioPreferences, "style" | "color" | "writingTone">
    > & {
      revisionHint?: string;
      needsWorkReason?: CustomerStudioPreferences["needsWorkReasons"][number];
    },
  ) {
    const current = this.getStudioPreferences(customerId);
    const revisionHints = input.revisionHint
      ? [...current.revisionHints, input.revisionHint.trim().slice(0, 300)].slice(
          -8,
        )
      : current.revisionHints;
    const needsWorkReasons = input.needsWorkReason
      ? [...current.needsWorkReasons, input.needsWorkReason].slice(-8)
      : current.needsWorkReasons;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO customer_studio_preferences
         (customer_id, style, color, writing_tone, revision_hints_json, needs_work_reasons_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(customer_id) DO UPDATE SET
           style = excluded.style,
           color = excluded.color,
           writing_tone = excluded.writing_tone,
           revision_hints_json = excluded.revision_hints_json,
           needs_work_reasons_json = excluded.needs_work_reasons_json,
           updated_at = excluded.updated_at`,
      )
      .run(
        customerId,
        input.style ?? current.style,
        input.color ?? current.color,
        input.writingTone ?? current.writingTone,
        JSON.stringify(revisionHints),
        JSON.stringify(needsWorkReasons),
        now,
      );
    return this.getStudioPreferences(customerId);
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
