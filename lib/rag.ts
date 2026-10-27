import knowledge from "@/data/knowledge.json";
import { EMBED_MODEL, embed } from "@/lib/ollama";
import { readFile } from "node:fs/promises";

type Doc = (typeof knowledge)[number];
type RagIndex = {
  model: string;
  documents: Array<Doc & { embedding: number[] }>;
};

export type RetrievedDoc = Doc & {
  score: number;
  semanticScore: number | null;
  lexicalScore: number;
};

const expansions: Array<[RegExp, string[]]> = [
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
  [
    /email|hộp thư|spam|mail/u,
    ["email doanh nghiệp", "deliverability", "DNS", "SPF", "DKIM"],
  ],
];

function tokenize(value: string) {
  return (
    value
      .toLocaleLowerCase("vi")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => word.length > 1) ?? []
  );
}

export function expandQuery(query: string) {
  const additions = expansions
    .filter(([pattern]) => pattern.test(query.toLocaleLowerCase("vi")))
    .flatMap(([, terms]) => terms);
  return [...new Set([query, ...additions])].join(" ");
}

function cosine(a: number[], b: number[]) {
  let dot = 0,
    aa = 0,
    bb = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] ** 2;
    bb += b[i] ** 2;
  }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
}

type SearchableDoc = {
  id: string;
  title: string;
  keywords: readonly string[];
  content: string;
};

function weightedTokens(doc: SearchableDoc) {
  return [
    ...tokenize(doc.title),
    ...tokenize(doc.title),
    ...tokenize(doc.title),
    ...tokenize(doc.keywords.join(" ")),
    ...tokenize(doc.keywords.join(" ")),
    ...tokenize(doc.content),
  ];
}

export function bm25LexicalScores<T extends SearchableDoc>(
  query: string,
  docs: readonly T[],
) {
  const terms = [...new Set(tokenize(query))];
  const tokenized = docs.map((doc) => ({ doc, tokens: weightedTokens(doc) }));
  const averageLength =
    tokenized.reduce((sum, item) => sum + item.tokens.length, 0) /
      Math.max(tokenized.length, 1) || 1;
  const documentFrequency = new Map<string, number>();
  for (const term of terms) {
    documentFrequency.set(
      term,
      tokenized.filter((item) => new Set(item.tokens).has(term)).length,
    );
  }
  const scores = new Map<string, number>();
  const k1 = 1.35;
  const b = 0.72;
  for (const { doc, tokens } of tokenized) {
    const frequencies = new Map<string, number>();
    for (const token of tokens)
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    let score = 0;
    for (const term of terms) {
      const tf = frequencies.get(term) ?? 0;
      if (!tf) continue;
      const df = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      score +=
        idf *
        ((tf * (k1 + 1)) /
          (tf + k1 * (1 - b + b * (tokens.length / averageLength))));
    }
    scores.set(doc.id, score);
  }
  return scores;
}

export function reciprocalRankFusion(
  semanticIds: readonly string[],
  lexicalIds: readonly string[],
  k = 60,
) {
  const scores = new Map<string, number>();
  const add = (ids: readonly string[], weight: number) => {
    ids.forEach((id, index) =>
      scores.set(id, (scores.get(id) ?? 0) + weight / (k + index + 1)),
    );
  };
  add(semanticIds, 0.65);
  add(lexicalIds, 0.35);
  return scores;
}

function diversify(items: RetrievedDoc[], limit: number) {
  const selected: RetrievedDoc[] = [];
  const remaining = [...items];
  while (selected.length < limit && remaining.length) {
    remaining.sort((a, b) => {
      const adjusted = (item: RetrievedDoc) => {
        const sameUrl = selected.filter(
          (x) => x.sourceUrl === item.sourceUrl,
        ).length;
        const sameCategory = selected.filter(
          (x) => x.category === item.category,
        ).length;
        return item.score * 0.82 ** sameUrl * 0.94 ** sameCategory;
      };
      return adjusted(b) - adjusted(a);
    });
    selected.push(remaining.shift()!);
  }
  return selected;
}

export async function retrieveDetailed(
  query: string,
  limit = 6,
): Promise<{
  documents: RetrievedDoc[];
  mode: "hybrid" | "lexical-fallback";
  reason?: "index-incompatible" | "embedding-unavailable";
}> {
  const expanded = expandQuery(query);
  let reason: "index-incompatible" | "embedding-unavailable" =
    "index-incompatible";
  try {
    const index = process.env.RAG_INDEX_PATH
      ? (JSON.parse(
          await readFile(process.env.RAG_INDEX_PATH, "utf8"),
        ) as RagIndex)
      : ((await import("@/data/rag-index.json"))
          .default as unknown as RagIndex);
    if (
      index.model !== EMBED_MODEL ||
      index.documents.length !== knowledge.length ||
      index.documents.some(
        (doc) =>
          !knowledge.some(
            (source) =>
              source.id === doc.id &&
              source.title === doc.title &&
              source.content === doc.content &&
              source.sourceUrl === doc.sourceUrl &&
              source.keywords.join("\u0000") === doc.keywords.join("\u0000"),
          ),
      )
    ) {
      reason = "index-incompatible";
      throw new Error("RAG index does not match current knowledge/model");
    }
    reason = "embedding-unavailable";
    const [queryVector] = await embed(expanded);
    if (
      !queryVector?.length ||
      index.documents.some((doc) => doc.embedding.length !== queryVector.length)
    ) {
      reason = "index-incompatible";
      throw new Error("RAG vector dimensions do not match");
    }
    const candidates = index.documents.map((doc) => ({
      doc,
      semanticScore: cosine(queryVector, doc.embedding),
    }));
    const lexicalScores = bm25LexicalScores(expanded, index.documents);
    const semanticRank = [...candidates]
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .map((item) => item.doc.id);
    const lexicalRank = [...index.documents]
      .sort(
        (a, b) =>
          (lexicalScores.get(b.id) ?? 0) - (lexicalScores.get(a.id) ?? 0),
      )
      .map((doc) => doc.id);
    const fusedScores = reciprocalRankFusion(semanticRank, lexicalRank);
    const ranked = candidates
      .map(({ doc, semanticScore }) => {
        const lexical = lexicalScores.get(doc.id) ?? 0;
        return {
          ...doc,
          semanticScore,
          lexicalScore: lexical,
          score: (fusedScores.get(doc.id) ?? 0) + doc.authority * 0.0005,
        };
      })
      .sort((a, b) => b.score - a.score);
    return { documents: diversify(ranked, limit), mode: "hybrid" };
  } catch {
    const lexicalScores = bm25LexicalScores(expanded, knowledge);
    const maximum = Math.max(...lexicalScores.values(), 1);
    const ranked = knowledge
      .map((doc): RetrievedDoc => ({
        ...doc,
        semanticScore: null,
        lexicalScore: lexicalScores.get(doc.id) ?? 0,
        score:
          ((lexicalScores.get(doc.id) ?? 0) / maximum) * 0.95 +
          doc.authority * 0.05,
      }))
      .sort((a, b) => b.score - a.score);
    return {
      documents: diversify(ranked, limit),
      mode: "lexical-fallback",
      reason,
    };
  }
}

export async function retrieve(query: string, limit = 6) {
  return (await retrieveDetailed(query, limit)).documents;
}
