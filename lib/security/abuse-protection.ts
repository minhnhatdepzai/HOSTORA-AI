import { createHash } from "node:crypto";
import type { CustomerStore } from "@/lib/customer/store";
import { trustedClientIp } from "@/lib/security/client-ip";
import {
  turnstileStatus,
  verifyTurnstile,
  type TurnstileAction,
} from "@/lib/security/turnstile";

function opaquePart(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      error: "Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}

function challengeResponse(action: TurnstileAction, unavailable = false) {
  return Response.json(
    unavailable
      ? {
          error: "Lớp xác minh chống tự động đang chưa sẵn sàng.",
          code: "CAPTCHA_UNAVAILABLE",
        }
      : {
          error: "Vui lòng hoàn tất bước xác minh trước khi tiếp tục.",
          code: "CAPTCHA_REQUIRED",
          action,
        },
    {
      status: unavailable ? 503 : 403,
      headers: { "cache-control": "no-store" },
    },
  );
}

export function protectRateLimitedAction(input: {
  action: string;
  identity?: string;
  limit: number;
  request: Request;
  store: CustomerStore;
  windowMs: number;
}) {
  const client = trustedClientIp(input.request) ?? "untrusted-proxy";
  const budget = input.store.consumeRateLimitDetailed(
    `sensitive-action:${input.action}:${client}:${opaquePart(input.identity ?? input.action)}`,
    input.limit,
    input.windowMs,
  );
  return budget.allowed ? null : rateLimitResponse(budget.retryAfterSeconds);
}

export async function protectPublicAuthAction(input: {
  action: TurnstileAction;
  challengeAfter: number;
  identity: string;
  limit: number;
  mobile: boolean;
  request: Request;
  store: CustomerStore;
  token?: string;
  windowMs: number;
}) {
  const client = trustedClientIp(input.request) ?? "untrusted-proxy";
  const clientBudget = input.store.consumeRateLimitDetailed(
    `public-auth-client:${input.action}:${client}`,
    input.limit * 5,
    input.windowMs,
  );
  const identityBudget = input.store.consumeRateLimitDetailed(
    `public-auth-identity:${input.action}:${opaquePart(input.identity)}`,
    input.limit,
    input.windowMs,
  );
  if (!clientBudget.allowed || !identityBudget.allowed)
    return rateLimitResponse(
      Math.max(
        clientBudget.allowed ? 0 : clientBudget.retryAfterSeconds,
        identityBudget.allowed ? 0 : identityBudget.retryAfterSeconds,
      ),
    );

  const turnstile = turnstileStatus();
  if (turnstile.state === "misconfigured") return challengeResponse(input.action, true);
  if (
    turnstile.state === "disabled" ||
    identityBudget.attempts <= input.challengeAfter ||
    input.mobile
  )
    return null;

  const verification = await verifyTurnstile({
    action: input.action,
    request: input.request,
    token: input.token,
  });
  return verification.ok ? null : challengeResponse(input.action);
}
