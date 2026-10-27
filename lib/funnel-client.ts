const storageKey = "hostora-anonymous-session-v1";

export type FunnelStep =
  | "studio_opened"
  | "demo_created"
  | "plan_opened"
  | "product_purchase_requested"
  | "checkout_started";

function anonymousSessionId() {
  let sessionId = window.sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

export function trackFunnelStep(step: FunnelStep) {
  if (typeof window === "undefined") return;
  try {
    const sessionId = anonymousSessionId();
    void fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, step }),
      keepalive: true,
    });
  } catch {
    // Tracking is optional and must not block the customer flow.
  }
}

export function getAnonymousSessionId() {
  if (typeof window === "undefined") return null;
  try {
    return anonymousSessionId();
  } catch {
    return null;
  }
}
