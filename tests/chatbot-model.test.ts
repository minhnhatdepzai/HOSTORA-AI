import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("in-app chat model is isolated from structured AI model", async () => {
  vi.stubEnv("OLLAMA_CHAT_MODEL", "general-test:9b");
  vi.stubEnv("OLLAMA_CHATBOT_MODEL", "hostora-test:4b");
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 200 }))
    .mockResolvedValueOnce(
      Response.json({ message: { content: '{"ok":true}' } }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { streamChat, structuredChat } = await import("@/lib/ollama");
  await streamChat([{ role: "user", content: "Xin chào" }]);
  await structuredChat("system", "prompt", z.object({ ok: z.boolean() }), {
    type: "object",
  });
  const chatRequest = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  const structuredRequest = JSON.parse(
    fetchMock.mock.calls[1][1].body as string,
  );
  expect(chatRequest.model).toBe("hostora-test:4b");
  expect(chatRequest.options.num_predict).toBe(650);
  expect(chatRequest.options.repeat_penalty).toBe(1.18);
  expect(structuredRequest.model).toBe("general-test:9b");
});
