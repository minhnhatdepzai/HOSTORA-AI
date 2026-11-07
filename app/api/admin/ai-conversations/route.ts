import { z } from "zod";
import { parseRequestJson } from "@/lib/api-validation";
import { getCustomerStore } from "@/lib/customer/store";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminSessionFromRequest(request))
    return Response.json(
      { error: "Bạn cần đăng nhập quản trị." },
      { status: 401 },
    );
  const url = new URL(request.url);
  const parsed = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(25).default(10),
    })
    .safeParse({
      q: url.searchParams.get("q") ?? "",
      page: url.searchParams.get("page") ?? "1",
      limit: url.searchParams.get("limit") ?? "10",
    });
  if (!parsed.success)
    return Response.json(
      { error: "Bộ lọc hội thoại không hợp lệ." },
      { status: 400 },
    );
  return Response.json(
    getCustomerStore().listAiConversationsPage({
      query: parsed.data.q,
      page: parsed.data.page,
      pageSize: parsed.data.limit,
    }),
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!adminSessionFromRequest(request))
    return Response.json(
      { error: "Bạn cần đăng nhập quản trị." },
      { status: 401 },
    );
  if (!sameOrigin(request))
    return Response.json(
      { error: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const parsed = await parseRequestJson(
    request,
    z
      .object({
        id: z.string().uuid(),
        reply: z.string().trim().min(2).max(4_000),
      })
      .strict(),
  );
  if (parsed.response) return parsed.response;
  const conversation = getCustomerStore().replyToAiConversation(
    parsed.data.id,
    parsed.data.reply,
  );
  if (!conversation)
    return Response.json(
      { error: "Không tìm thấy cuộc trò chuyện." },
      { status: 404 },
    );
  return Response.json(
    { conversation },
    { headers: { "cache-control": "no-store" } },
  );
}
