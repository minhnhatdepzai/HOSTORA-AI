import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_EMBED_MODEL ?? "qwen3-embedding:4b";
const defaultOutput = fileURLToPath(
  new URL("../data/rag-index.json", import.meta.url),
);
const outputPath = path.resolve(process.env.RAG_INDEX_PATH ?? defaultOutput);
const documents = JSON.parse(
  await readFile(new URL("../data/knowledge.json", import.meta.url), "utf8"),
);
try {
  const existing = JSON.parse(await readFile(outputPath, "utf8"));
  const matches =
    existing.model === model &&
    existing.documents?.length === documents.length &&
    documents.every((document) => {
      const indexed = existing.documents.find(
        (item) => item.id === document.id,
      );
      return (
        indexed?.title === document.title &&
        indexed?.content === document.content &&
        Array.isArray(indexed.embedding) &&
        indexed.embedding.length > 0
      );
    });
  if (matches) {
    console.log(`Reusing ${outputPath} (${model}).`);
    process.exit(0);
  }
} catch {}
const response = await fetch(`${baseUrl}/api/embed`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    model,
    input: documents.map((doc) => `${doc.title}\n${doc.content}`),
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
if (!Array.isArray(embeddings) || embeddings.length !== documents.length)
  throw new Error("Embedding count mismatch");
const index = {
  version: 1,
  model,
  createdAt: new Date().toISOString(),
  documents: documents.map((doc, index) => ({
    ...doc,
    embedding: embeddings[index],
  })),
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(index)}\n`);
console.log(
  `Indexed ${documents.length} documents with ${model} (${embeddings[0]?.length ?? 0} dimensions).`,
);
