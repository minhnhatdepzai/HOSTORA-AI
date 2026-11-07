import { beforeAll, describe, expect, it } from "vitest";
import { GET as getConversation } from "@/app/api/ai/conversations/[id]/route";
import {
  GET as listAdminConversations,
  PATCH as replyToAdminConversation,
} from "@/app/api/admin/ai-conversations/route";
import { getCustomerStore } from "@/lib/customer/store";
import { ADMIN_COOKIE, issueAdminSession } from "@/lib/payments/admin-auth";

const origin = "http://127.0.0.1:3000";

beforeAll(() => {
  delete process.env.HOSTORA_PUBLIC_BASE_URL;
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
  process.env.HOSTORA_ADMIN_PASSWORD = "test-admin-password-long-enough";
  process.env.HOSTORA_ADMIN_SESSION_SECRET =
    "test-admin-session-secret-long-enough";
});

function adminCookie() {
  const token = issueAdminSession(process.env.HOSTORA_ADMIN_PASSWORD!, {
    password: process.env.HOSTORA_ADMIN_PASSWORD!,
    secret: process.env.HOSTORA_ADMIN_SESSION_SECRET!,
  });
  return `${ADMIN_COOKIE}=${token}`;
}

describe("AI conversation inbox routes", () => {
  it("lets only the guest holding the one-time access token read the saved thread", async () => {
    const conversationId = crypto.randomUUID();
    const store = getCustomerStore();
    const opened = store.openAiConversation({ conversationId });
    store.appendAiConversationMessage({
      conversationId,
      role: "user",
      content: "Câu hỏi đã được ẩn thông tin liên hệ.",
    });

    const context = { params: Promise.resolve({ id: conversationId }) };
    const denied = await getConversation(
      new Request(`${origin}/api/ai/conversations/${conversationId}`, {
        headers: { "x-hostora-conversation-access": "wrong-token" },
      }),
      context,
    );
    expect(denied.status).toBe(404);

    const accepted = await getConversation(
      new Request(`${origin}/api/ai/conversations/${conversationId}`, {
        headers: {
          "x-hostora-conversation-access": opened.accessToken!,
        },
      }),
      context,
    );
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({
      conversation: {
        id: conversationId,
        messages: [
          { role: "user", content: "Câu hỏi đã được ẩn thông tin liên hệ." },
        ],
      },
    });
  });

  it("requires an admin session and same-origin request before replying", async () => {
    const conversationId = crypto.randomUUID();
    const store = getCustomerStore();
    store.openAiConversation({ conversationId });
    store.appendAiConversationMessage({
      conversationId,
      role: "user",
      content: "Quản trị viên có thể giúp tôi không?",
    });
    store.escalateAiConversation(conversationId, "human_requested");

    expect(
      (
        await listAdminConversations(
          new Request(`${origin}/api/admin/ai-conversations`),
        )
      ).status,
    ).toBe(401);

    const cookie = adminCookie();
    const listed = await listAdminConversations(
      new Request(`${origin}/api/admin/ai-conversations`, {
        headers: { cookie },
      }),
    );
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as {
      conversations: Array<{ id: string }>;
      pagination: { page: number; pageSize: number; total: number };
    };
    expect(
      listBody.conversations.some((item) => item.id === conversationId),
    ).toBe(true);
    expect(listBody.pagination).toMatchObject({ page: 1, pageSize: 10 });

    const searched = await listAdminConversations(
      new Request(
        `${origin}/api/admin/ai-conversations?q=${encodeURIComponent("Quản trị viên có thể")}&page=1&limit=5`,
        { headers: { cookie } },
      ),
    );
    expect(searched.status).toBe(200);
    await expect(searched.json()).resolves.toMatchObject({
      conversations: [{ id: conversationId }],
      pagination: { page: 1, pageSize: 5, total: 1 },
    });

    const crossOrigin = await replyToAdminConversation(
      new Request(`${origin}/api/admin/ai-conversations`, {
        method: "PATCH",
        headers: {
          cookie,
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: conversationId,
          reply: "Nội dung phản hồi từ quản trị viên.",
        }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const replied = await replyToAdminConversation(
      new Request(`${origin}/api/admin/ai-conversations`, {
        method: "PATCH",
        headers: {
          cookie,
          origin,
          host: "127.0.0.1:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: conversationId,
          reply: "Nội dung phản hồi từ quản trị viên.",
        }),
      }),
    );
    expect(replied.status).toBe(200);
    await expect(replied.json()).resolves.toMatchObject({
      conversation: {
        id: conversationId,
        status: "answered",
        messages: [
          { role: "user" },
          { role: "admin", content: "Nội dung phản hồi từ quản trị viên." },
        ],
      },
    });
  });
});
