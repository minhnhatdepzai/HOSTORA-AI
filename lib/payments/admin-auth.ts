import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "hostora_admin_session";
const SESSION_MS = 8 * 60 * 60 * 1000;

export function adminSessionCookie(token: string, secure: boolean) {
  return `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? "; Secure" : ""}`;
}

export function clearedAdminSessionCookie(secure: boolean) {
  return `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function safeAdminNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

export type AdminConfig = { password: string; secret: string };

export function adminConfigFromEnv(): AdminConfig {
  const smtpDerivedSecret = process.env.HOSTORA_SMTP_PASSWORD
    ? createHash("sha256").update(`hostora-admin-session:${process.env.HOSTORA_SMTP_PASSWORD}`).digest("hex")
    : "";
  return {
    password: process.env.HOSTORA_ADMIN_PASSWORD ?? "",
    secret: process.env.HOSTORA_ADMIN_SESSION_SECRET ?? smtpDerivedSecret,
  };
}

function validConfig(config: AdminConfig) {
  return config.password.length >= 16 && config.secret.length >= 32;
}

function validSessionSecret(config: AdminConfig) {
  return config.secret.length >= 32;
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issueAdminSession(inputPassword: string, config: AdminConfig, now = Date.now()): string | null {
  if (!validConfig(config) || !equal(inputPassword, config.password)) return null;
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_MS, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, config.secret)}`;
}

export function issueAdminEmailSession(config: AdminConfig, now = Date.now()): string | null {
  if (!validSessionSecret(config)) return null;
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_MS, nonce: randomBytes(16).toString("hex"), method: "email" })).toString("base64url");
  return `${payload}.${signature(payload, config.secret)}`;
}

export function verifyAdminSession(token: string, config: AdminConfig, now = Date.now()): boolean {
  if (!validSessionSecret(config) || !token || token.length > 512) return false;
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra || !equal(mac, signature(payload, config.secret))) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown; nonce?: unknown };
    return typeof value.exp === "number" && value.exp > now && value.exp <= now + SESSION_MS && typeof value.nonce === "string";
  } catch {
    return false;
  }
}

export function adminSessionFromRequest(request: Request): boolean {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  const token = cookie?.slice(ADMIN_COOKIE.length + 1) ?? "";
  return verifyAdminSession(token, adminConfigFromEnv());
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host") ?? requestUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    return parsed.host === host && parsed.protocol === `${protocol}:` && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
