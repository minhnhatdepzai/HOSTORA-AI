import { isIP } from "node:net";

function validIp(value: string | null) {
  const candidate = value?.trim() ?? "";
  return isIP(candidate) ? candidate : null;
}

/**
 * Proxy headers are attacker-controlled unless the origin only accepts traffic
 * from that proxy. HOSTORA therefore ignores them until deployment opts in.
 */
export function trustedClientIp(request: Request) {
  if (process.env.HOSTORA_TRUST_CLOUDFLARE_PROXY === "true")
    return validIp(request.headers.get("cf-connecting-ip"));

  if (process.env.HOSTORA_TRUST_PROXY === "true") {
    const firstForwarded = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0];
    return validIp(firstForwarded ?? null);
  }

  return null;
}
