import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import mobileConfig from "@/mobile/app.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const releases = {
  android: {
    local: `HOSTORA-AI-${mobileConfig.expo.version}-arm64.apk`,
    published: `HOSTORA-AI-${mobileConfig.expo.version}-arm64.apk`,
    version: mobileConfig.expo.version,
  },
  "android-universal": {
    local: "HOSTORA-AI-2.0.3-universal.apk",
    published: null,
    version: "2.0.3",
  },
} as const;
const defaultReleaseBaseUrl =
  "https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v2.0.9-review-20261029-r2";

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
  const release = releases[variant as keyof typeof releases];
  const filePath = path.join(
    process.cwd(),
    "mobile",
    "releases",
    release.local,
  );
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
          "content-disposition": `attachment; filename="${release.local}"`,
          "content-length": String(file.size),
          "cache-control": "private, max-age=0",
          "x-hostora-release-version": release.version,
        },
      },
    );
  } catch {
    if (release.published)
      return Response.redirect(remoteReleaseUrl(release.published), 307);
    return new Response("Bản Android này chưa có trên máy chủ.", { status: 503 });
  }
}

type Context = { params: Promise<{ variant: string }> };

export async function GET(_request: Request, context: Context) {
  return releaseResponse((await context.params).variant, true);
}

export async function HEAD(_request: Request, context: Context) {
  return releaseResponse((await context.params).variant, false);
}
