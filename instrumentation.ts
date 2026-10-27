import type { LangfuseSpanProcessor as LangfuseSpanProcessorType } from "@langfuse/otel";

const langfuseEnabled = () =>
  Boolean(
    process.env.LANGFUSE_PUBLIC_KEY &&
      process.env.LANGFUSE_SECRET_KEY &&
      process.env.LANGFUSE_BASE_URL,
  );

export let langfuseSpanProcessor: LangfuseSpanProcessorType | null = null;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !langfuseEnabled()) return;

  const [{ LangfuseSpanProcessor }, { NodeSDK }] = await Promise.all([
    import("@langfuse/otel"),
    import("@opentelemetry/sdk-node"),
  ]);
  langfuseSpanProcessor = new LangfuseSpanProcessor({ exportMode: "immediate" });
  const sdk = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor],
  });
  sdk.start();
}
