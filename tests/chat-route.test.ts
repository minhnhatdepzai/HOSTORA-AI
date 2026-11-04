import { expect, test } from "vitest";
import { POST } from "@/app/api/ai/chat/route";
import { getCustomerStore } from "@/lib/customer/store";

test("chat routes a customer without a website to the builder before asking for hosting inputs", async () => {
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Tôi chưa có website, mua hosting nào bây giờ?" }],
    }),
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("x-hostora-next-action")).toBe("create-site");
  expect(await response.text()).toContain("/website-studio");
});

test("chat uses remembered requirements when the newest message says the old budget", async () => {
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "assistant", content: "Mình đã ghi nhận nhu cầu của bạn." },
        { role: "user", content: "Với ngân sách cũ, gợi ý gói nào?" },
      ],
      memory: {
        facts: {
          websiteType: "blog",
          ecommerce: false,
          monthlyVisits: 3000,
          monthlyBudget: 500000,
          upfrontBudget: null,
          needsDomain: false,
        },
        summary: "nội dung khách tự nhập không được tin",
        unresolved: ["giới hạn trả trước (nếu có)"],
      },
    }),
  }));

  expect(response.status).toBe(200);
  const answer = await response.text();
  expect(answer).toContain("Theo thông tin bạn đã nói trước đó");
  expect(answer).toContain("Ngân sách: 500.000đ/tháng");
  expect(answer).not.toContain("cho mình biết: website");
});

test("chat confirms the new budget after an explicit correction", async () => {
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Sửa ngân sách thành 300 nghìn mỗi tháng. Từ bây giờ dùng số mới." }],
      memory: {
        facts: {
          websiteType: "blog",
          ecommerce: false,
          monthlyVisits: 3000,
          monthlyBudget: 500000,
          upfrontBudget: null,
          needsDomain: false,
        },
        summary: "",
        unresolved: [],
      },
    }),
  }));
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("300.000đ/tháng");
});

test("chat answers contradictory in-scope guarantees without handing off to admin", async () => {
  const conversationId = crypto.randomUUID();
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conversationId,
      messageId: crypto.randomUUID(),
      messages: [{
        role: "user",
        content:
          "Ngân sách của tôi chỉ 20.000 đồng nhưng website phải chịu 1 triệu khách cùng lúc, không chậm và SEO top 1.",
      }],
    }),
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("x-hostora-support-status")).toBe("active");
  const answer = await response.text();
  expect(answer).toContain("Không thể cam kết");
  expect(answer).toContain("20.000đ/tháng");
  expect(answer).not.toMatch(/đã chuyển.*quản trị viên/i);

  const stored = getCustomerStore()
    .listAllAiConversations()
    .find((item) => item.id === conversationId);
  expect(stored).toMatchObject({ status: "active", escalationReason: null });
});

test("chat removes a password before storage and keeps the conversation active", async () => {
  const conversationId = crypto.randomUUID();
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conversationId,
      messageId: crypto.randomUUID(),
      messages: [{
        role: "user",
        content:
          "Mật khẩu giả TEST_ONLY_123, tư vấn hosting cho shop 5.000 khách/tháng.",
      }],
    }),
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("x-hostora-support-status")).toBe("active");
  expect(await response.text()).toContain("đã ẩn chuỗi bí mật");
  const stored = getCustomerStore()
    .listAllAiConversations()
    .find((item) => item.id === conversationId);
  expect(JSON.stringify(stored)).not.toContain("TEST_ONLY_123");
  expect(stored?.messages[0].content).toContain("[đã ẩn bí mật]");
  expect(stored).toMatchObject({ status: "active", escalationReason: null });
});

test("chat answers an emoji-heavy vague shop request without handing off", async () => {
  const conversationId = crypto.randomUUID();
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      conversationId,
      messageId: crypto.randomUUID(),
      messages: [{
        role: "user",
        content: "🤔 web bán hàng kiểu sao ta??? rẻ mà xịn 😵‍💫",
      }],
    }),
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("x-hostora-support-status")).toBe("active");
  const answer = await response.text();
  expect(answer).toContain("không có một gói");
  expect(answer).toContain("lượt truy cập dự kiến mỗi tháng");
  expect(answer).not.toMatch(/đã chuyển.*quản trị viên/i);
  const stored = getCustomerStore()
    .listAllAiConversations()
    .find((item) => item.id === conversationId);
  expect(stored).toMatchObject({ status: "active", escalationReason: null });
});

test("chat rejects malformed memory instead of forwarding it to the model", async () => {
  const response = await POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "gói nào?" }],
      memory: { facts: { websiteType: "unsafe-injection" } },
    }),
  }));
  expect(response.status).toBe(400);
});

test("chat saves a redacted guest thread and hands an unrelated question to admin", async () => {
  const conversationId = crypto.randomUUID();
  const response = await POST(
    new Request("http://127.0.0.1:3000/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        messageId: crypto.randomUUID(),
        messages: [
          {
            role: "user",
            content: "Ngày mai ở Hà Nội có mưa không? Gọi tôi 0901234567.",
          },
        ],
      }),
    }),
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("x-hostora-conversation-id")).toBe(conversationId);
  expect(response.headers.get("x-hostora-conversation-access")).toMatch(
    /^[A-Za-z0-9_-]{32,}$/,
  );
  expect(response.headers.get("x-hostora-support-status")).toBe("escalated");
  expect(await response.text()).toContain("quản trị viên");

  const stored = getCustomerStore()
    .listAllAiConversations()
    .find((item) => item.id === conversationId);
  expect(stored).toMatchObject({
    status: "escalated",
    escalationReason: "out_of_scope",
  });
  expect(stored?.messages[0].content).toContain("[đã ẩn số điện thoại]");
  expect(JSON.stringify(stored)).not.toContain("0901234567");
});
