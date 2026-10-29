import { z } from "zod";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Yêu cầu vượt quá giới hạn cho phép.");
    this.name = "RequestBodyTooLargeError";
  }
}

type ReadableBody = Pick<Request, "body" | "headers">;

export async function readLimitedText(
  source: ReadableBody,
  maxBytes: number,
  options: { truncate?: boolean } = {},
) {
  const declaredLength = Number(source.headers.get("content-length") ?? "0");
  if (
    !options.truncate &&
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  )
    throw new RequestBodyTooLargeError();
  if (!source.body) return "";

  const reader = source.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (options.truncate && total + value.byteLength > maxBytes) {
      const remaining = maxBytes - total;
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      total = maxBytes;
      await reader.cancel().catch(() => undefined);
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function parseRequestJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 16_384,
): Promise<
  { data: T; response?: never } | { data?: never; response: Response }
> {
  let rawBody = "";
  try {
    rawBody = await readLimitedText(request, maxBytes);
  } catch (error) {
    if (!(error instanceof RequestBodyTooLargeError)) throw error;
    return {
      response: Response.json(
        { error: "Yêu cầu vượt quá giới hạn cho phép." },
        { status: 413 },
      ),
    };
  }
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const parsed = schema.safeParse(body);
  if (parsed.success) return { data: parsed.data };
  const fields = [
    ...new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((field): field is string => typeof field === "string"),
    ),
  ].slice(0, 8);
  return {
    response: Response.json(
      {
        error:
          "Dữ liệu nhập không hợp lệ. Hãy kiểm tra các trường được đánh dấu.",
        fields,
      },
      { status: 400 },
    ),
  };
}
