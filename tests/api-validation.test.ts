import { expect, test } from "vitest";
import { z } from "zod";
import { parseRequestJson } from "@/lib/api-validation";

test("invalid input returns a readable 400 without echoing private values", async () => {
  const request = new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "0912345678", monthlyBudget: -10 }),
  });
  const parsed = await parseRequestJson(
    request,
    z.object({ monthlyBudget: z.number().min(10000) }),
  );
  expect(parsed.response?.status).toBe(400);
  const body = await parsed.response!.text();
  expect(body).toContain("monthlyBudget");
  expect(body).not.toContain("0912345678");
});

test("malformed JSON returns 400 rather than a stack trace", async () => {
  const parsed = await parseRequestJson(
    new Request("http://localhost/api/recommend", {
      method: "POST",
      body: "{oops",
    }),
    z.object({ monthlyBudget: z.number() }),
  );
  expect(parsed.response?.status).toBe(400);
});

test("oversized JSON is rejected before schema parsing", async () => {
  const parsed = await parseRequestJson(
    new Request("http://localhost/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "x".repeat(1024) }),
    }),
    z.object({ note: z.string() }),
    128,
  );
  expect(parsed.response?.status).toBe(413);
  expect(await parsed.response!.json()).toEqual({
    error: "Yêu cầu vượt quá giới hạn cho phép.",
  });
});

test("streamed JSON without Content-Length is stopped at the byte limit", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('{"note":"'));
      controller.enqueue(encoder.encode("x".repeat(256)));
      controller.enqueue(encoder.encode('"}'));
      controller.close();
    },
  });
  const request = new Request("http://localhost/api/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const parsed = await parseRequestJson(
    request,
    z.object({ note: z.string() }),
    64,
  );

  expect(parsed.response?.status).toBe(413);
});
