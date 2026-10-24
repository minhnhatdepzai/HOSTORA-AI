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
