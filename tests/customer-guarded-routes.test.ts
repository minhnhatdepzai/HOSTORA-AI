import { beforeAll, describe, expect, it } from "vitest";
import { POST as createStudioWebsite } from "@/app/api/ai/site-studio/route";
import { POST as requestRefund } from "@/app/api/payments/orders/[id]/refund-request/route";
import { GET as getChatHistory } from "@/app/api/account/chat-history/route";
import {
  GET as getAiSources,
  POST as addAiSource,
} from "@/app/api/account/ai-sources/route";
import { POST as chat } from "@/app/api/ai/chat/route";
import { getCustomerStore } from "@/lib/customer/store";
import { getPaymentStore } from "@/lib/payments/store";

const origin = "http://127.0.0.1:3000";
const mobileRequest = (path: string, body: unknown, token = "") =>
  new Request(`${origin}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hostora-client": "mobile",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

beforeAll(() => {
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
});

describe("guarded customer flows", () => {
  it("blocks anonymous website generation before parsing or running AI", async () => {
    const response = await createStudioWebsite(
      mobileRequest("/api/ai/site-studio", { intentionally: "invalid" }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Bạn cần đăng nhập để tạo website với AI.",
    });
  });

  it("requires both login and matching invoice ownership for refunds", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ownerEmail = `owner-${suffix}@example.com`;
    const other = getCustomerStore().createCustomer({
      name: "Tài khoản khác",
      email: `other-${suffix}@example.com`,
      passwordHash: "hash",
    });
    const otherSession = getCustomerStore().createSession(other.id);
    const invoice = getPaymentStore().createInvoice({
      title: "Gói cần bảo vệ",
      amountVnd: 1_000_000,
      customerEmail: ownerEmail,
    });
    getPaymentStore().markPaid(invoice.id, "stripe", `pi_${suffix}`, 1_000_000, "vnd");
    const context = { params: Promise.resolve({ id: invoice.id }) };
    const body = { accessCode: invoice.accessCode, reason: "Dịch vụ không còn phù hợp" };

    expect(
      (await requestRefund(mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body), context)).status,
    ).toBe(401);
    expect(
      (await requestRefund(mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body, otherSession.token), context)).status,
    ).toBe(403);

    const owner = getCustomerStore().createCustomer({ name: "Chủ hóa đơn", email: ownerEmail, passwordHash: "hash" });
    const ownerSession = getCustomerStore().createSession(owner.id);
    const accepted = await requestRefund(
      mobileRequest(`/api/payments/orders/${invoice.id}/refund-request`, body, ownerSession.token),
      context,
    );
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).invoice.status).toBe("refund_requested");
  });

  it("keeps account chat history and uploaded knowledge isolated", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = getCustomerStore();
    const owner = store.createCustomer({
      name: "Chủ nguồn AI",
      email: `ai-owner-${suffix}@example.com`,
      passwordHash: "hash",
    });
    const other = store.createCustomer({
      name: "Tài khoản khác",
      email: `ai-other-${suffix}@example.com`,
      passwordHash: "hash",
    });
    const ownerToken = store.createSession(owner.id).token;
    const otherToken = store.createSession(other.id).token;
    const conversationId = crypto.randomUUID();
    store.appendChatMessage({
      customerId: owner.id,
      conversationId,
      role: "user",
      content: "Nội dung chỉ thuộc tài khoản chủ.",
    });

    const ownerHistory = await getChatHistory(
      new Request(`${origin}/api/account/chat-history`, {
        headers: {
          "x-hostora-client": "mobile",
          authorization: `Bearer ${ownerToken}`,
        },
      }),
    );
    expect(ownerHistory.status).toBe(200);
    expect((await ownerHistory.json()).messages).toEqual([
      expect.objectContaining({ content: "Nội dung chỉ thuộc tài khoản chủ." }),
    ]);

    const otherHistory = await getChatHistory(
      new Request(`${origin}/api/account/chat-history`, {
        headers: {
          "x-hostora-client": "mobile",
          authorization: `Bearer ${otherToken}`,
        },
      }),
    );
    expect((await otherHistory.json()).messages).toEqual([]);

    const added = await addAiSource(
      mobileRequest(
        "/api/account/ai-sources",
        {
          kind: "file",
          filename: "brief.txt",
          mimeType: "text/plain",
          base64: Buffer.from(
            "Doanh nghiệp giới thiệu sản phẩm gốm và phục vụ quán cà phê.",
          ).toString("base64"),
        },
        ownerToken,
      ),
    );
    expect(added.status).toBe(201);
    const otherSources = await getAiSources(
      new Request(`${origin}/api/account/ai-sources`, {
        headers: {
          "x-hostora-client": "mobile",
          authorization: `Bearer ${otherToken}`,
        },
      }),
    );
    expect((await otherSources.json()).sources).toEqual([]);
  });

  it("rate-limits expensive AI chat and source extraction per account", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const store = getCustomerStore();
    const customer = store.createCustomer({
      name: "Tài khoản quota AI",
      email: `ai-quota-${suffix}@example.com`,
      passwordHash: "hash",
    });
    const token = store.createSession(customer.id).token;
    const sourceBody = {
      kind: "file",
      filename: "brief.txt",
      mimeType: "text/plain",
      base64: Buffer.from(
        "Doanh nghiệp bán gốm thủ công và cần website giới thiệu sản phẩm.",
      ).toString("base64"),
    };

    for (let index = 0; index < 11; index += 1)
      store.consumeRateLimitDetailed(
        `ai-source:create:${customer.id}`,
        12,
        60 * 60 * 1000,
      );
    const lastAllowedSource = await addAiSource(
      mobileRequest("/api/account/ai-sources", sourceBody, token),
    );
    expect(lastAllowedSource.status).toBe(201);
    const sourceLimited = await addAiSource(
      mobileRequest("/api/account/ai-sources", sourceBody, token),
    );
    expect(sourceLimited.status).toBe(429);
    expect(sourceLimited.headers.get("retry-after")).toBeTruthy();

    for (let index = 0; index < 119; index += 1)
      store.consumeRateLimitDetailed(
        `ai-chat:customer:${customer.id}`,
        120,
        10 * 60 * 1000,
      );
    const lastAllowedChat = await chat(
      mobileRequest(
        "/api/ai/chat",
        {
          messages: [
            { role: "user", content: "example.com còn trống không?" },
          ],
          messageId: crypto.randomUUID(),
        },
        token,
      ),
    );
    expect(lastAllowedChat.status).toBe(200);
    const chatLimited = await chat(
      mobileRequest(
        "/api/ai/chat",
        {
          messages: [
            { role: "user", content: "example.com còn trống không?" },
          ],
          messageId: crypto.randomUUID(),
        },
        token,
      ),
    );
    expect(chatLimited.status).toBe(429);
    expect(chatLimited.headers.get("retry-after")).toBeTruthy();
  });
});
