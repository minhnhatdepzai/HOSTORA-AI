// Exercise the same retrieval endpoint used by the app, including fallback mode.
import { readFile } from "node:fs/promises";

const dataset = process.argv[2] ?? "../data/rag-eval-hard.json";
const cases = JSON.parse(
  await readFile(new URL(dataset, import.meta.url), "utf8"),
);
const base = process.env.HOSTORA_EVAL_URL ?? "http://127.0.0.1:3000";
const topK = 5;
const details = [];
for (const item of cases) {
  const response = await fetch(`${base}/api/ai/retrieval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: item.query, limit: topK }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Retrieval HTTP ${response.status}`);
  const result = await response.json();
  const top = result.documents.map((doc) => doc.id);
  const position = top.findIndex((id) => item.expectedIds.includes(id));
  details.push({
    query: item.query,
    expected: item.expectedIds,
    top,
    hitRank: position < 0 ? null : position + 1,
    mode: result.mode,
    durationMs: result.durationMs,
  });
}
const hits = details.filter((item) => item.hitRank !== null);
const report = {
  dataset,
  cases: details.length,
  recallAt5: hits.length / details.length,
  mrrAt5:
    hits.reduce((sum, item) => sum + 1 / item.hitRank, 0) / details.length,
  hybridCases: details.filter((item) => item.mode === "hybrid").length,
  lexicalFallbackCases: details.filter(
    (item) => item.mode === "lexical-fallback",
  ).length,
  details,
};
console.log(JSON.stringify(report, null, 2));
if (report.recallAt5 < 0.8 || report.lexicalFallbackCases > 0)
  process.exitCode = 1;
