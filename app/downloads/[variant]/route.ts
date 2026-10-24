import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const releases = {
  android: "HOSTORA-AI-1.4.0.apk",
  "android-universal": "HOSTORA-AI-1.4.0-universal.apk",
} as const;
const defaultReleaseBaseUrl =
  "https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v1.4.0";

function remoteReleaseUrl(filename: string) {
  const base = process.env.HOSTORA_RELEASE_BASE_URL ?? defaultReleaseBaseUrl;
  try {
    const url = new URL(`${base.replace(/\/$/, "")}/${filename}`);
    if (url.protocol !== "https:")
      throw new Error("Release URL must use HTTPS");
    return url;
  } catch {
    return new URL(`${defaultReleaseBaseUrl}/${filename}`);
  }
}

async function releaseResponse(variant: string, body: boolean) {
  if (!(variant in releases))
    return new Response("Không có bản APK này.", { status: 404 });
  const filename = releases[variant as keyof typeof releases];
  const filePath = path.join(process.cwd(), "mobile", "releases", filename);
  try {
    const file = await stat(filePath);
    if (!file.isFile()) throw new Error("APK không phải tệp hợp lệ.");
    return new Response(
      body
        ? (Readable.toWeb(createReadStream(filePath)) as ReadableStream)
        : null,
      {
        headers: {
          "content-type": "application/vnd.android.package-archive",
          "content-disposition": `attachment; filename="${filename}"`,
          "content-length": String(file.size),
          "cache-control": "private, max-age=0",
        },
      },
    );
  } catch {
    return Response.redirect(remoteReleaseUrl(filename), 307);
  }
}

type Context = { params: Promise<{ variant: string }> };

export async function GET(_request: Request, context: Context) {
  return releaseResponse((await context.params).variant, true);
}

export async function HEAD(_request: Request, context: Context) {
  return releaseResponse((await context.params).variant, false);
}
