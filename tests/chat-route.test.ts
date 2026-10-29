import { expect, test } from "vitest";
import { POST } from "@/app/api/ai/chat/route";

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
