import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "@/next.config";
import { CustomerStore } from "@/lib/customer/store";
import { protectPublicAuthAction } from "@/lib/security/abuse-protection";
import { trustedClientIp } from "@/lib/security/client-ip";
import { verifyTurnstile } from "@/lib/security/turnstile";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const request = (headers: Record<string, string> = {}) =>
  new Request("https://hostora.example/api/account/login", { headers });

function enableTurnstile() {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
  vi.stubEnv("HOSTORA_TURNSTILE_SECRET_KEY", "test-secret-key");
  vi.stubEnv("HOSTORA_TURNSTILE_HOSTNAMES", "hostora.example");
}

describe("security headers", () => {
  it("sets a global browser security baseline and keeps vendor assets cross-origin", async () => {
    const rules = await nextConfig.headers!();
    const global = rules.find((rule) => rule.source === "/:path*");
    const vendor = rules.find((rule) => rule.source === "/vendor/:path*");
    expect(global?.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ]),
    );
    expect(
      global?.headers.find((header) => header.key === "Content-Security-Policy")
        ?.value,
    ).toContain("frame-src https://challenges.cloudflare.com");
    expect(vendor?.headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "cross-origin",
    });
  });
});

describe("trusted proxy identity", () => {
  it("ignores spoofable forwarding headers until a proxy is explicitly trusted", () => {
    const spoofed = request({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.2",
    });
    expect(trustedClientIp(spoofed)).toBeNull();
    vi.stubEnv("HOSTORA_TRUST_CLOUDFLARE_PROXY", "true");
    expect(trustedClientIp(spoofed)).toBe("203.0.113.9");
  });

  it("rejects malformed IP values even behind a trusted proxy", () => {
    vi.stubEnv("HOSTORA_TRUST_CLOUDFLARE_PROXY", "true");
    expect(trustedClientIp(request({ "cf-connecting-ip": "not-an-ip" }))).toBeNull();
  });
});

describe("Turnstile server verification", () => {
  it("fails closed when only one Turnstile key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    vi.stubEnv("HOSTORA_TURNSTILE_SECRET_KEY", "");
    await expect(
      verifyTurnstile({
        action: "customer_login",
        request: request(),
        token: "token",
      }),
    ).resolves.toEqual({ ok: false, reason: "misconfigured" });
  });

  it("validates token, action and hostname without trusting the browser result", async () => {
    enableTurnstile();
    vi.stubEnv("HOSTORA_TRUST_CLOUDFLARE_PROXY", "true");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: true,
        action: "customer_login",
        hostname: "hostora.example",
      }),
    );
    await expect(
      verifyTurnstile({
        action: "customer_login",
        request: request({ "cf-connecting-ip": "203.0.113.9" }),
        token: "single-use-token",
      }),
    ).resolves.toEqual({ ok: true });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, string>;
    expect(body).toMatchObject({
      remoteip: "203.0.113.9",
      response: "single-use-token",
      secret: "test-secret-key",
    });
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("fails closed when Siteverify returns a different action or hostname", async () => {
    enableTurnstile();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: true,
        action: "customer_register",
        hostname: "evil.example",
      }),
    );
    await expect(
      verifyTurnstile({
        action: "customer_login",
        request: request(),
        token: "replayed-or-wrong-token",
      }),
    ).resolves.toMatchObject({ ok: false });
  });

  it("rejects a replayed token reported by Siteverify", async () => {
    enableTurnstile();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    );
    await expect(
      verifyTurnstile({
        action: "customer_login",
        request: request(),
        token: "already-used-token",
      }),
    ).resolves.toEqual({ ok: false, reason: "challenge-rejected" });
  });

  it("fails closed when Siteverify exceeds its timeout", async () => {
    enableTurnstile();
    const controller = new AbortController();
    controller.abort();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_url, init) => {
        expect(init?.signal?.aborted).toBe(true);
        throw new DOMException("Timed out", "AbortError");
      },
    );

    await expect(
      verifyTurnstile({
        action: "customer_login",
        request: request(),
        token: "slow-token",
      }),
    ).resolves.toEqual({ ok: false, reason: "siteverify-unavailable" });
    expect(timeout).toHaveBeenCalledWith(5_000);
  });
});

describe("adaptive abuse protection", () => {
  it("asks for Turnstile after repeated browser attempts, then accepts a verified token", async () => {
    enableTurnstile();
    const store = new CustomerStore(":memory:");
    const input = {
      action: "customer_login" as const,
      challengeAfter: 1,
      identity: "owner@example.com",
      limit: 4,
      mobile: false,
      request: request(),
      store,
      windowMs: 60_000,
    };
    await expect(protectPublicAuthAction(input)).resolves.toBeNull();
    const challenged = await protectPublicAuthAction(input);
    expect(challenged?.status).toBe(403);
    await expect(challenged?.json()).resolves.toMatchObject({
      code: "CAPTCHA_REQUIRED",
      action: "customer_login",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: true,
        action: "customer_login",
        hostname: "hostora.example",
      }),
    );
    await expect(
      protectPublicAuthAction({ ...input, token: "fresh-token" }),
    ).resolves.toBeNull();
    store.close();
  });

  it("hard blocks excessive attempts with Retry-After even when Turnstile is disabled", async () => {
    const store = new CustomerStore(":memory:");
    const input = {
      action: "customer_forgot" as const,
      challengeAfter: 99,
      identity: "owner@example.com",
      limit: 1,
      mobile: false,
      request: request(),
      store,
      windowMs: 60_000,
    };
    await expect(protectPublicAuthAction(input)).resolves.toBeNull();
    const blocked = await protectPublicAuthAction(input);
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("retry-after"))).toBeGreaterThan(0);
    store.close();
  });

  it("hard blocks one client that rotates identities to evade per-account limits", async () => {
    const store = new CustomerStore(":memory:");
    for (let index = 0; index < 5; index += 1) {
      await expect(
        protectPublicAuthAction({
          action: "customer_register",
          challengeAfter: 99,
          identity: `rotated-${index}@example.com`,
          limit: 1,
          mobile: true,
          request: request(),
          store,
          windowMs: 60_000,
        }),
      ).resolves.toBeNull();
    }
    const blocked = await protectPublicAuthAction({
      action: "customer_register",
      challengeAfter: 99,
      identity: "rotated-6@example.com",
      limit: 1,
      mobile: true,
      request: request(),
      store,
      windowMs: 60_000,
    });
    expect(blocked?.status).toBe(429);
    store.close();
  });
});
