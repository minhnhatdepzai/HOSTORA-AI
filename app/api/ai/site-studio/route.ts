import { parseRequestJson } from "@/lib/api-validation";
import { runSiteStudioWorkflow } from "@/lib/site-studio-workflow";
import { siteIdeaSchema } from "@/lib/site-studio";
import { captureSiteStudioRun } from "@/lib/ai-observability";
import { createStudioProject } from "@/lib/site-studio-store";
import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { sameOrigin } from "@/lib/payments/admin-auth";

export async function POST(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json(
      { error: "Bạn cần đăng nhập để tạo website với AI." },
      { status: 401 },
    );
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(request, siteIdeaSchema);
  if (parsed.response) return parsed.response;
  const startedAt = Date.now();
  try {
    const result = await runSiteStudioWorkflow(parsed.data);
    const project = await createStudioProject(parsed.data, result, customer.id);
    const requestedSessionId = request.headers.get("x-hostora-session");
    const sessionId =
      requestedSessionId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestedSessionId,
      )
        ? requestedSessionId
        : null;
    await captureSiteStudioRun({
      sessionId,
      generationMode: result.generationMode,
      recommendationCount: result.recommendations.length,
      latencyMs: Date.now() - startedAt,
    });
    return Response.json({ ...result, project });
  } catch {
    return Response.json(
      { error: "Không thể tạo bản demo lúc này. Hãy thử lại sau." },
      { status: 503 },
    );
  }
}
