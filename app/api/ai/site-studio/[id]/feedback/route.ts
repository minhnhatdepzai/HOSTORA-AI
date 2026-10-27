import { z } from "zod";
import { parseRequestJson } from "@/lib/api-validation";
import { captureSiteStudioFeedback } from "@/lib/ai-observability";
import { getStudioProject, saveStudioFeedback } from "@/lib/site-studio-store";

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
  const { id } = await context.params;
  const project = await getStudioProject(id);
  if (!project)
    return Response.json(
      { error: "Không tìm thấy bản website này." },
      { status: 404 },
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
    return Response.json({ saved: true });
  } catch {
    return Response.json(
      { error: "Chưa lưu được đánh giá. Hãy thử lại." },
      { status: 503 },
    );
  }
}
