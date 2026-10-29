import { randomUUID } from "node:crypto";
import { z } from "zod";
import { trustedClientIp } from "@/lib/security/client-ip";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5_000;

const responseSchema = z
  .object({
    success: z.boolean(),
    hostname: z.string().optional(),
    action: z.string().optional(),
    "error-codes": z.array(z.string()).optional(),
  })
  .passthrough();

export type TurnstileAction =
  | "customer_login"
  | "customer_register"
  | "customer_forgot";

type TurnstileStatus =
  | { state: "disabled" }
  | { state: "misconfigured" }
  | { state: "enabled"; secret: string; siteKey: string };

export function turnstileStatus(): TurnstileStatus {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const secret = process.env.HOSTORA_TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (!siteKey && !secret) return { state: "disabled" };
  if (!siteKey || !secret) return { state: "misconfigured" };
  return { state: "enabled", siteKey, secret };
}

function expectedHostnames() {
  const configured = (process.env.HOSTORA_TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return new Set(configured);
  try {
    const hostname = new URL(
      process.env.HOSTORA_PUBLIC_BASE_URL ?? "",
    ).hostname.toLowerCase();
    return hostname ? new Set([hostname]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export async function verifyTurnstile(input: {
  action: TurnstileAction;
  request: Request;
  token: string | undefined;
}) {
  const config = turnstileStatus();
  if (config.state !== "enabled")
    return { ok: false as const, reason: config.state };
  if (!input.token || input.token.length > 2048)
    return { ok: false as const, reason: "missing-or-invalid-token" };

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: config.secret,
        response: input.token,
        remoteip: trustedClientIp(input.request) ?? undefined,
        idempotency_key: randomUUID(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok)
      return { ok: false as const, reason: "siteverify-unavailable" };
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.success)
      return { ok: false as const, reason: "challenge-rejected" };
    if (parsed.data.action !== input.action)
      return { ok: false as const, reason: "action-mismatch" };

    const hostnames = expectedHostnames();
    if (process.env.NODE_ENV === "production" && hostnames.size === 0)
      return { ok: false as const, reason: "hostname-not-configured" };
    if (
      hostnames.size > 0 &&
      (!parsed.data.hostname ||
        !hostnames.has(parsed.data.hostname.toLowerCase()))
    )
      return { ok: false as const, reason: "hostname-mismatch" };

    return { ok: true as const };
  } catch {
    return { ok: false as const, reason: "siteverify-unavailable" };
  }
}
