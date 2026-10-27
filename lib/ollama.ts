import { z } from "zod";

export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
export const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:9b-q8_0";
// Only the in-app RAG chatbot uses this model; structured AI stays on CHAT_MODEL.
export const CHATBOT_MODEL = process.env.OLLAMA_CHATBOT_MODEL ?? CHAT_MODEL;
export const STUDIO_MODEL = process.env.OLLAMA_STUDIO_MODEL ?? CHAT_MODEL;
export const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? "qwen3-vl:8b";
export const EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "qwen3-embedding:4b";
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 90000);

export class LocalAiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LocalAiError";
  }
}

async function ollamaFetch(
  path: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new LocalAiError(`Ollama trả HTTP ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof LocalAiError) throw error;
    throw new LocalAiError(
      "Không kết nối được Local AI. Hãy kiểm tra Ollama đang chạy.",
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function structuredChat<T>(
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  jsonSchema: object,
  feature = "structured_chat",
  timeoutMs = TIMEOUT_MS,
  model = CHAT_MODEL,
): Promise<T> {
  const startedAt = performance.now();
  const response = await ollamaFetch(
    "/api/chat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        format: jsonSchema,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        options: {
          temperature: 0.15,
          num_ctx: Number(process.env.OLLAMA_CONTEXT_LENGTH ?? 16384),
          num_predict: 512,
        },
        keep_alive: "10m",
      }),
    },
    timeoutMs,
  );
  const result = (await response.json()) as {
    message?: { content?: string; thinking?: string };
    eval_count?: number;
    prompt_eval_count?: number;
  };
  console.info(
    JSON.stringify({
      event: "local_ai",
      feature,
      model,
      latencyMs: Math.round(performance.now() - startedAt),
      promptTokens: result.prompt_eval_count ?? null,
      completionTokens: result.eval_count ?? null,
    }),
  );
  try {
    return schema.parse(
      JSON.parse(
        result.message?.content?.trim() ||
          result.message?.thinking?.trim() ||
          "{}",
      ),
    );
  } catch (error) {
    throw new LocalAiError("Local AI trả dữ liệu không đúng schema.", error);
  }
}

export async function structuredVision<T>(
  system: string,
  prompt: string,
  imageBase64: string,
  schema: z.ZodType<T>,
  jsonSchema: object,
  feature = "structured_vision",
  timeoutMs = TIMEOUT_MS,
): Promise<T> {
  const startedAt = performance.now();
  const response = await ollamaFetch(
    "/api/chat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        stream: false,
        think: false,
        format: jsonSchema,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt, images: [imageBase64] },
        ],
        options: {
          temperature: 0,
          num_ctx: Math.min(Number(process.env.OLLAMA_CONTEXT_LENGTH ?? 16384), 16384),
          num_predict: 320,
        },
        keep_alive: "10m",
      }),
    },
    timeoutMs,
  );
  const result = (await response.json()) as {
    message?: { content?: string; thinking?: string };
    eval_count?: number;
    prompt_eval_count?: number;
  };
  console.info(JSON.stringify({
    event: "local_ai",
    feature,
    model: VISION_MODEL,
    latencyMs: Math.round(performance.now() - startedAt),
    promptTokens: result.prompt_eval_count ?? null,
    completionTokens: result.eval_count ?? null,
  }));
  try {
    return schema.parse(
      JSON.parse(
        result.message?.content?.trim() ||
          result.message?.thinking?.trim() ||
          "{}",
      ),
    );
  } catch (error) {
    throw new LocalAiError("Local AI không xác định được bước từ ảnh.", error);
  }
}

export async function embed(input: string | string[]): Promise<number[][]> {
  const startedAt = performance.now();
  const response = await ollamaFetch("/api/embed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input,
      truncate: true,
      keep_alive: "10m",
    }),
  });
  const result = (await response.json()) as {
    embeddings?: number[][];
    prompt_eval_count?: number;
  };
  console.info(
    JSON.stringify({
      event: "local_ai",
      feature: "embedding",
      model: EMBED_MODEL,
      latencyMs: Math.round(performance.now() - startedAt),
      inputs: Array.isArray(input) ? input.length : 1,
      promptTokens: result.prompt_eval_count ?? null,
    }),
  );
  if (!result.embeddings?.length)
    throw new LocalAiError("Embedding model không trả vector.");
  return result.embeddings;
}

export async function streamChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  return ollamaFetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: CHATBOT_MODEL,
      messages,
      stream: true,
      think: false,
      options: {
        temperature: 0.25,
        num_ctx: Number(process.env.OLLAMA_CONTEXT_LENGTH ?? 16384),
        num_predict: CHATBOT_MODEL === CHAT_MODEL ? 1200 : 650,
        ...(CHATBOT_MODEL === CHAT_MODEL
          ? {}
          : { repeat_penalty: 1.18, repeat_last_n: 256 }),
      },
      keep_alive: "10m",
    }),
  });
}

export async function health() {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    signal: AbortSignal.timeout(3000),
  });
  const data = (await response.json()) as { models?: Array<{ name: string }> };
  return {
    ok: response.ok,
    chatModel: CHAT_MODEL,
    chatbotModel: CHATBOT_MODEL,
    embedModel: EMBED_MODEL,
    available: data.models?.map((item) => item.name) ?? [],
  };
}
