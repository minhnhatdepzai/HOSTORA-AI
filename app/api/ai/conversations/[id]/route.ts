import { customerFromRequest } from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";

export const runtime = "nodejs";

const conversationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!conversationIdPattern.test(id))
    return Response.json(
      { error: "Không tìm thấy cuộc trò chuyện." },
      { status: 404 },
    );
  const customer = customerFromRequest(request);
  const conversation = getCustomerStore().getAiConversationForViewer({
    conversationId: id,
    customerId: customer?.id,
    accessToken: request.headers.get("x-hostora-conversation-access"),
  });
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
