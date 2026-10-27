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
  [
    /dễ tiếp cận|accessibility|a11y|bàn phím|keyboard|focus/u,
    ["WCAG", "focus visible", "accessible name", "form label", "target size"],
  ],
  [
    /cinematic|chuyển động|animation|motion|three(?:\.js)?|gsap/u,
    ["GSAP", "Three.js", "prefers-reduced-motion", "WebGL", "dispose"],
  ],
  [
    /responsive|mobile|điện thoại|màn hình nhỏ/u,
    ["responsive design", "viewport", "touch target", "responsive images"],
  ],
  [
    /chuyển đổi|conversion|cta|kéo khách|lead/u,
    ["call to action", "bằng chứng", "ma sát", "form", "giá trị"],
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
const weightedTokens = (doc) => [
  ...tokenize(doc.title),
  ...tokenize(doc.title),
  ...tokenize(doc.title),
  ...tokenize(doc.keywords.join(" ")),
  ...tokenize(doc.keywords.join(" ")),
  ...tokenize(doc.content),
];
const bm25 = (query, docs) => {
  const terms = [...new Set(tokenize(query))];
  const tokenized = docs.map((doc) => ({ doc, tokens: weightedTokens(doc) }));
  const averageLength =
    tokenized.reduce((sum, item) => sum + item.tokens.length, 0) /
      Math.max(tokenized.length, 1) || 1;
  const scores = new Map();
  for (const { doc, tokens } of tokenized) {
    const frequencies = new Map();
    for (const token of tokens)
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    let score = 0;
    for (const term of terms) {
      const tf = frequencies.get(term) ?? 0;
      if (!tf) continue;
      const df = tokenized.filter((item) => item.tokens.includes(term)).length;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const k1 = 1.35;
      const b = 0.72;
      score +=
        idf *
        ((tf * (k1 + 1)) /
          (tf + k1 * (1 - b + b * (tokens.length / averageLength))));
    }
    scores.set(doc.id, score);
  }
  return scores;
};
const rrf = (semanticIds, lexicalIds, k = 60) => {
  const scores = new Map();
  for (const [ids, weight] of [
    [semanticIds, 0.65],
    [lexicalIds, 0.35],
  ]) {
    ids.forEach((id, index) =>
      scores.set(id, (scores.get(id) ?? 0) + weight / (k + index + 1)),
    );
  }
  return scores;
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
  const semanticScores = new Map(
    index.documents.map((doc) => [
      doc.id,
      cosine(embeddings[caseIndex], doc.embedding),
    ]),
  );
  const lexicalScores = bm25(queries[caseIndex], index.documents);
  const semanticRank = [...index.documents]
    .sort(
      (a, b) =>
        (semanticScores.get(b.id) ?? 0) - (semanticScores.get(a.id) ?? 0),
    )
    .map((doc) => doc.id);
  const lexicalRank = [...index.documents]
    .sort(
      (a, b) =>
        (lexicalScores.get(b.id) ?? 0) - (lexicalScores.get(a.id) ?? 0),
    )
    .map((doc) => doc.id);
  const fusedScores = rrf(semanticRank, lexicalRank);
  const ranked = index.documents
    .map((doc) => ({
      id: doc.id,
      score: (fusedScores.get(doc.id) ?? 0) + doc.authority * 0.0005,
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
  hitAt1:
    details.filter((item) => item.hitRank === 1).length / cases.length,
};
console.log(JSON.stringify({ metrics, details }, null, 2));
if (metrics.recallAtK < 0.8) process.exitCode = 1;
