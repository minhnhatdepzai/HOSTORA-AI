// Held-out prompts through the endpoint used by web/mobile.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] ?? "baseline";
const limit = Number(process.argv[3] ?? 12);
const inputFile = process.argv[4] ?? "data/chatbot_test.jsonl";
const base = process.env.HOSTORA_EVAL_URL ?? "http://127.0.0.1:3000";
const rows = (await fs.readFile(path.join(root, inputFile), "utf8"))
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .slice(0, limit);
const results = [];
for (const row of rows) {
  const started = performance.now();
  try {
    const response = await fetch(base + "/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        messages: [{ role: "user", content: row.prompt.at(-1).content }],
      }),
    });
    const answer = await response.text();
    const item = {
      id: row.id,
      question: row.prompt.at(-1).content,
      expected: row.completion[0].content,
      status: response.status,
      answer,
      durationMs: Math.round(performance.now() - started),
    };
    results.push(item);
    console.log(
      JSON.stringify({
        id: item.id,
        status: item.status,
        durationMs: item.durationMs,
        chars: answer.length,
      }),
    );
  } catch (error) {
    results.push({ id: row.id, error: String(error) });
    console.log(JSON.stringify(results.at(-1)));
  }
}
const out = path.join(root, "output-chatbot");
await fs.mkdir(out, { recursive: true });
await fs.writeFile(
  path.join(out, "eval-" + label + ".json"),
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify({
    label,
    total: results.length,
    httpOk: results.filter((item) => item.status === 200).length,
  }),
);
