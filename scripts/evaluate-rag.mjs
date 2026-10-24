import { readFile } from "node:fs/promises";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const index = JSON.parse(
  await readFile(new URL("../data/rag-index.json", import.meta.url), "utf8"),
);
const dataset = process.argv[2] ?? "../data/rag-eval.json";
const cases = JSON.parse(
  await readFile(new URL(dataset, import.meta.url), "utf8"),
);
const model =
  process.env.OLLAMA_EMBED_MODEL ?? index.model ?? "qwen3-embedding:4b";
const topK = Number(process.env.RAG_EVAL_TOP_K ?? 5);
const expansions = [
  [
    /structured data|\bschema\b|json.ld|dữ liệu có cấu trúc/u,
    ["structured data", "schema", "json-ld", "rich results", "product"],
  ],
  [
    /\bseo\b|tìm kiếm|google/u,
    [
      "title",
      "meta description",
      "canonical",
      "sitemap",
      "robots",
      "structured data",
    ],
  ],
  [
    /tốc độ|chậm|performance|core web vitals|lcp|inp|cls/u,
    ["cache", "cdn", "latency", "LCP", "INP", "CLS"],
  ],
  [
    /shop|cửa hàng|bán hàng|e-?commerce|woocommerce/u,
    ["thương mại điện tử", "product", "checkout", "flash sale"],
  ],
  [
    /giá|chi phí|ngân sách|gia hạn|khuyến mãi/u,
    ["VAT", "kỳ hạn", "tổng chi phí", "checkout"],
  ],
  [
    /bảo mật|hack|mất dữ liệu|ddos/u,
    ["SSL", "backup", "restore", "firewall", "CDN"],
  ],
  [
    /vps|server|api|ứng dụng riêng/u,
    ["tự quản trị", "CPU", "RAM", "monitoring", "backup"],
  ],
];
const tokenize = (value) =>
  value
    .toLocaleLowerCase("vi")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => word.length > 1) ?? [];
const expand = (query) =>
  [
    ...new Set([
      query,
      ...expansions
        .filter(([pattern]) => pattern.test(query.toLocaleLowerCase("vi")))
        .flatMap(([, terms]) => terms),
    ]),
  ].join(" ");
const cosine = (a, b) => {
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    aa += a[i] ** 2;
    bb += b[i] ** 2;
  }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
};
const lexical = (query, doc) => {
  const words = new Set(tokenize(query));
  const title = doc.title.toLocaleLowerCase("vi");
  const keywords = doc.keywords.join(" ").toLocaleLowerCase("vi");
  const content = doc.content.toLocaleLowerCase("vi");
  const points = [...words].reduce(
    (sum, word) =>
      sum +
      (title.includes(word) ? 3 : 0) +
      (keywords.includes(word) ? 2 : 0) +
      (content.includes(word) ? 1 : 0),
    0,
  );
  return Math.min(1, points / Math.max(words.size * 3, 1));
};

const queries = cases.map((item) => expand(item.query));
const response = await fetch(`${baseUrl}/api/embed`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model,
    input: queries,
    truncate: true,
    keep_alive: "10m",
  }),
  signal: AbortSignal.timeout(180_000),
});
if (!response.ok)
  throw new Error(
    `Ollama embed failed: HTTP ${response.status} ${await response.text()}`,
  );
const { embeddings } = await response.json();
let recalled = 0;
let reciprocalRanks = 0;
const details = cases.map((item, caseIndex) => {
  const ranked = index.documents
    .map((doc) => ({
      id: doc.id,
      score:
        cosine(embeddings[caseIndex], doc.embedding) * 0.68 +
        lexical(queries[caseIndex], doc) * 0.24 +
        doc.authority * 0.08,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  const firstRank = ranked.findIndex((doc) =>
    item.expectedIds.includes(doc.id),
  );
  if (firstRank >= 0) {
    recalled += 1;
    reciprocalRanks += 1 / (firstRank + 1);
  }
  return {
    query: item.query,
    expected: item.expectedIds,
    top: ranked.map((doc) => doc.id),
    hitRank: firstRank < 0 ? null : firstRank + 1,
  };
});
const metrics = {
  dataset,
  model,
  cases: cases.length,
  topK,
  recallAtK: recalled / cases.length,
  mrrAtK: reciprocalRanks / cases.length,
};
console.log(JSON.stringify({ metrics, details }, null, 2));
if (metrics.recallAtK < 0.8) process.exitCode = 1;
