import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { normalizeChatMemory } from "@/lib/chat-memory";
import { sameOrigin } from "@/lib/payments/admin-auth";

const conversationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const store = getCustomerStore();
  const requested = new URL(request.url).searchParams.get("conversationId");
  if (requested && !conversationIdPattern.test(requested))
    return Response.json({ error: "Mã cuộc trò chuyện không hợp lệ." }, { status: 400 });
  const conversationId = requested ?? store.latestConversationId(customer.id);
  const messages = conversationId
    ? store.listChatMessages(customer.id, conversationId, 120)
    : [];
  return Response.json(
    {
      conversationId,
      messages,
      memory: normalizeChatMemory(store.getAiMemory(customer.id)),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const clearMemory = new URL(request.url).searchParams.get("scope") === "all";
  getCustomerStore().clearAiHistory(customer.id, clearMemory);
  return Response.json(
    { deleted: true, memoryDeleted: clearMemory },
    { headers: { "cache-control": "no-store" } },
  );
}
