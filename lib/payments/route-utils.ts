import { ZodError, type ZodType } from "zod";
import { readLimitedText } from "@/lib/api-validation";

export async function parseSmallJson<T>(request: Request, schema: ZodType<T>, maxBytes = 4096): Promise<T> {
  const body = await readLimitedText(request, maxBytes);
  try {
    return schema.parse(JSON.parse(body));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) throw new Error("Thông tin gửi lên không hợp lệ.");
    throw error;
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

export function noStoreJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "no-store" } });
}
