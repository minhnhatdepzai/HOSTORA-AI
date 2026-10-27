const localFallback = "http://127.0.0.1:3000";

export function siteOrigin() {
  try {
    const value = new URL(process.env.HOSTORA_PUBLIC_BASE_URL ?? localFallback);
    return ["http:", "https:"].includes(value.protocol) ? value.origin : localFallback;
  } catch {
    return localFallback;
  }
}

export function absoluteSiteUrl(pathname = "/") {
  return new URL(pathname, `${siteOrigin()}/`).toString();
}
