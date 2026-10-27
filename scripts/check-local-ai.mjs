const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const chatModel = process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:9b-q8_0";
const chatbotModel = process.env.OLLAMA_CHATBOT_MODEL ?? chatModel;
const studioModel = process.env.OLLAMA_STUDIO_MODEL ?? chatModel;
const embedModel = process.env.OLLAMA_EMBED_MODEL ?? "qwen3-embedding:4b";
const tags = await fetch(`${baseUrl}/api/tags`, {
  signal: AbortSignal.timeout(5000),
}).then((res) => res.json());
const names = new Set(tags.models?.map((model) => model.name));
if (!names.has(chatbotModel))
  throw new Error("Missing in-app chatbot model: " + chatbotModel);
if (!names.has(studioModel))
  throw new Error("Missing Website Studio draft model: " + studioModel);
if (!names.has(chatModel) || !names.has(embedModel))
  throw new Error(`Missing models. Required: ${chatModel}, ${embedModel}`);
const started = performance.now();
const response = await fetch(`${baseUrl}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  signal: AbortSignal.timeout(120000),
  body: JSON.stringify({
    model: chatModel,
    messages: [{ role: "user", content: "Trả JSON có trường ok=true." }],
    stream: false,
    think: false,
    format: {
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    },
    options: { temperature: 0, num_ctx: 4096 },
    keep_alive: "10m",
  }),
});
if (!response.ok) throw new Error(`Chat failed: HTTP ${response.status}`);
const result = await response.json();
const parsed = JSON.parse(result.message.content);
if (parsed.ok !== true) throw new Error("Structured output smoke test failed");
console.log(
  JSON.stringify(
    {
      ok: true,
      chatModel,
      chatbotModel,
      studioModel,
      embedModel,
      elapsedMs: Math.round(performance.now() - started),
      evalCount: result.eval_count,
    },
    null,
    2,
  ),
);
