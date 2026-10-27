import { z } from "zod";
import { captureFunnelEvent } from "@/lib/ai-observability";
import { parseRequestJson } from "@/lib/api-validation";

const eventSchema = z.object({
  sessionId: z.string().uuid(),
  step: z.enum(["studio_opened", "demo_created", "plan_opened", "product_purchase_requested", "checkout_started"]),
});

export async function POST(request: Request) {
  const parsed = await parseRequestJson(request, eventSchema);
  if (parsed.response) return parsed.response;

  try {
    await captureFunnelEvent(parsed.data);
    return new Response(null, { status: 204 });
  } catch {
    // Analytics must never interrupt creating a demo or opening a service.
    return new Response(null, { status: 204 });
  }
}
