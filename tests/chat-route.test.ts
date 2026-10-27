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
