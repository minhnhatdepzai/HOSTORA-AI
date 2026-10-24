import { z } from "zod";

export async function parseRequestJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<
  { data: T; response?: never } | { data?: never; response: Response }
> {
  const body = await request.json().catch(() => null);
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
