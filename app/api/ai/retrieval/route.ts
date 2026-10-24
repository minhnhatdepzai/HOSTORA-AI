import { retrieveDetailed } from "@/lib/rag";
import { parseRequestJson } from "@/lib/api-validation";
import { z } from "zod";

export async function POST(request: Request) {
  const parsed = await parseRequestJson(
    request,
    z.object({
      query: z.string().min(2).max(500),
      limit: z.number().int().min(1).max(10).default(6),
    }),
  );
  if (parsed.response) return parsed.response;
  const { query, limit } = parsed.data;
  const startedAt = performance.now();
  const { documents, mode, reason } = await retrieveDetailed(query, limit);
  return Response.json({
    query,
    durationMs: Math.round(performance.now() - startedAt),
    mode,
    reason: reason ?? null,
    documents,
  });
}
