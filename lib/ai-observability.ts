import { startActiveObservation } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

const configured = () =>
  Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_BASE_URL,
  );

export async function captureFunnelEvent(input: {
  sessionId: string;
  step:
    | "studio_opened"
    | "demo_created"
    | "plan_opened"
    | "product_purchase_requested"
    | "checkout_started";
}) {
  if (!configured()) return;
  try {
    await startActiveObservation(
      "hostora-conversion-funnel",
      async (observation) => {
        observation.update({
          metadata: {
            feature: "website-studio",
            funnel_step: input.step,
            anonymous_session_id: input.sessionId,
          },
        });
      },
      { asType: "span" },
    );
    await langfuseSpanProcessor?.forceFlush();
  } catch {
    // Analytics is optional; a Langfuse outage must not interrupt the user flow.
  }
}

export async function captureSiteStudioRun(input: {
  sessionId: string | null;
  generationMode: "local-ai" | "template-fallback";
  recommendationCount: number;
  latencyMs: number;
}) {
  if (!configured()) return;
  try {
    await startActiveObservation(
      "hostora-site-studio-run",
      async (observation) => {
        observation.update({
          metadata: {
            feature: "website-studio",
            generation_mode: input.generationMode,
            recommendation_count: input.recommendationCount,
            latency_ms: input.latencyMs,
            ...(input.sessionId
              ? { anonymous_session_id: input.sessionId }
              : {}),
            content_capture: false,
          },
        });
      },
      { asType: "chain" },
    );
    await langfuseSpanProcessor?.forceFlush();
  } catch {
    // Analytics is optional; a Langfuse outage must not interrupt demo creation.
  }
}

export async function captureSiteStudioFeedback(input: {
  rating: "helpful" | "needs_work";
  reason: "visual" | "copy" | "navigation" | "business_fit" | "other";
  generationMode: "local-ai" | "template-fallback";
  revisionCount: number;
}) {
  if (!configured()) return;
  try {
    await startActiveObservation(
      "hostora-site-studio-feedback",
      async (observation) => {
        observation.update({
          metadata: {
            feature: "website-studio",
            feedback_rating: input.rating,
            feedback_reason: input.reason,
            generation_mode: input.generationMode,
            revision_count: input.revisionCount,
            content_capture: false,
          },
        });
      },
      { asType: "span" },
    );
    await langfuseSpanProcessor?.forceFlush();
  } catch {
    // Local feedback remains available when observability is offline.
  }
}
