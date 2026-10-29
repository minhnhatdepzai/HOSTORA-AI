import { z } from "zod";
import { parseRequestJson } from "@/lib/api-validation";
import { captureSiteStudioFeedback } from "@/lib/ai-observability";
import {
  getStudioProject,
  isStudioProjectOwner,
  saveStudioFeedback,
} from "@/lib/site-studio-store";
import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { sameOrigin } from "@/lib/payments/admin-auth";
import { getCustomerStore } from "@/lib/customer/store";

const feedbackSchema = z
  .object({
    rating: z.enum(["helpful", "needs_work"]),
    reason: z.enum(["visual", "copy", "navigation", "business_fit", "other"]),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await context.params;
  const project = await getStudioProject(id);
  if (!project)
    return Response.json(
      { error: "Không tìm thấy bản website này." },
      { status: 404 },
    );
  if (!isStudioProjectOwner(project, customer.id))
    return Response.json(
      { error: "Website này không thuộc tài khoản của bạn." },
      { status: 403 },
    );
  const parsed = await parseRequestJson(request, feedbackSchema);
  if (parsed.response) return parsed.response;
  try {
    const event = await saveStudioFeedback(project, parsed.data);
    await captureSiteStudioFeedback({
      rating: event.rating,
      reason: event.reason,
      generationMode: event.generationMode,
      revisionCount: event.revisionCount,
    });
    if (event.rating === "needs_work")
      getCustomerStore().saveStudioPreferences(customer.id, {
        needsWorkReason: event.reason,
      });
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: "Chưa lưu được đánh giá. Hãy thử lại." },
      { status: 503 },
    );
  }
}
