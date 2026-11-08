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
  const conversations = store.listChatSummaries(customer.id);
  if (requested && !conversations.some((item) => item.conversationId === requested))
    return Response.json(
      { error: "Không tìm thấy cuộc trò chuyện của tài khoản này." },
      { status: 404 },
    );
  const conversationId = requested ?? conversations[0]?.conversationId ?? null;
  const supportConversation = conversationId
    ? store.getAiConversationForViewer({
        conversationId,
        customerId: customer.id,
      })
    : null;
  const adminMessageIds = new Set(
    supportConversation?.messages
      .filter((message) => message.role === "admin")
      .map((message) => message.id) ?? [],
  );
  const messages = conversationId
    ? store.listChatMessages(customer.id, conversationId, 120).map((message) => ({
        ...message,
        fromAdmin: adminMessageIds.has(message.id),
      }))
    : [];
  const supportStatus = supportConversation?.status ?? "active";
  return Response.json(
    {
      conversationId,
      conversations,
      messages,
      supportStatus,
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
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const store = getCustomerStore();
  if (conversationId) {
    if (!conversationIdPattern.test(conversationId))
      return Response.json(
        { error: "Mã cuộc trò chuyện không hợp lệ." },
        { status: 400 },
      );
    if (!store.deleteAiConversation(customer.id, conversationId))
      return Response.json(
        { error: "Không tìm thấy cuộc trò chuyện của tài khoản này." },
        { status: 404 },
      );
    return Response.json(
      { deleted: true, conversationId, memoryDeleted: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const clearMemory = url.searchParams.get("scope") === "all";
  store.clearAiHistory(customer.id, clearMemory);
  return Response.json(
    { deleted: true, memoryDeleted: clearMemory },
    { headers: { "cache-control": "no-store" } },
  );
}
