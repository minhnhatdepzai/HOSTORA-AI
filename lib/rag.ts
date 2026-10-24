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

function lexicalScore(query: string, doc: Doc) {
  const words = new Set(tokenize(query));
  const title = doc.title.toLocaleLowerCase("vi");
  const keywords = doc.keywords.join(" ").toLocaleLowerCase("vi");
  const content = doc.content.toLocaleLowerCase("vi");
  const score = [...words].reduce((total, word) => {
    const titleHit = title.includes(word) ? 3 : 0;
    const keywordHit = keywords.includes(word) ? 2 : 0;
    const contentHit = content.includes(word) ? 1 : 0;
    return total + titleHit + keywordHit + contentHit;
  }, 0);
  return Math.min(1, score / Math.max(words.size * 3, 1));
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
        (doc) => !knowledge.some((source) => source.id === doc.id),
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
    const ranked = index.documents
      .map((doc) => {
        const semanticScore = cosine(queryVector, doc.embedding);
        const lexical = lexicalScore(expanded, doc);
        return {
          ...doc,
          semanticScore,
          lexicalScore: lexical,
          score: semanticScore * 0.68 + lexical * 0.24 + doc.authority * 0.08,
        };
      })
      .sort((a, b) => b.score - a.score);
    return { documents: diversify(ranked, limit), mode: "hybrid" };
  } catch {
    const ranked = knowledge
      .map((doc): RetrievedDoc => ({
        ...doc,
        semanticScore: null,
        lexicalScore: lexicalScore(expanded, doc),
        score: lexicalScore(expanded, doc) * 0.9 + doc.authority * 0.1,
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
