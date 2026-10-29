import { validatePublicUrl } from "@/lib/ssrf";
import { parseRequestJson, readLimitedText } from "@/lib/api-validation";
import { z } from "zod";

const get = (html: string, pattern: RegExp) =>
  html.match(pattern)?.[1]?.trim() ?? null;
const requestSchema = z.object({ url: z.string().min(4).max(2048) });

export async function POST(request: Request) {
  try {
    const parsed = await parseRequestJson(request, requestSchema, 16_384);
    if (parsed.response) return parsed.response;
    const { url: raw } = parsed.data;
    let url = await validatePublicUrl(raw);
    let response: Response | undefined;
    for (let redirect = 0; redirect < 3; redirect += 1) {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
        headers: { "user-agent": "HOSTORA-AI-Security-Audit/0.1" },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) break;
      url = await validatePublicUrl(new URL(location, url).toString());
    }
    if (!response?.ok)
      return Response.json(
        { error: `Website trả HTTP ${response?.status ?? "unknown"}` },
        { status: 422 },
      );
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html"))
      return Response.json(
        { error: "URL không trả nội dung HTML." },
        { status: 422 },
      );
    const html = await readLimitedText(response, 1_000_000, {
      truncate: true,
    });
    const title = get(html, /<title[^>]*>([^<]*)<\/title>/i);
    const description =
      get(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ) ??
      get(
        html,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      );
    const checks = {
      title: Boolean(title),
      description: Boolean(description),
      viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
      favicon: /<link[^>]+rel=["'][^"']*icon/i.test(html),
      language: /<html[^>]+lang=["'][^"']+/i.test(html),
      https: url.protocol === "https:",
      headings: (html.match(/<h1\b/gi) ?? []).length === 1,
    };
    const score = Math.round(
      (Object.values(checks).filter(Boolean).length /
        Object.keys(checks).length) *
        100,
    );
    return Response.json({
      url: url.toString(),
      title,
      description,
      score,
      checks,
      disclaimer:
        "Kết quả chỉ dựa trên những thông tin công khai nhìn thấy tại thời điểm kiểm tra; không khẳng định tốc độ hoặc khả năng phục vụ lượng khách thực tế.",
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "URL không hợp lệ hoặc không thể truy cập.",
      },
      { status: 400 },
    );
  }
}
