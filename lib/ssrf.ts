import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function forbiddenIp(ip: string) {
  const normalized = ip.toLowerCase();
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  )
    return true;
  const value = normalized.replace(/^::ffff:/, "");
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function validatePublicUrl(raw: string) {
  const input = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error(
      "Chỉ chấp nhận URL HTTP/HTTPS công khai, không có thông tin đăng nhập hoặc port tùy chỉnh.",
    );
  if (
    ["localhost", "localhost.localdomain"].includes(
      url.hostname.toLowerCase(),
    ) ||
    url.hostname.endsWith(".local")
  )
    throw new Error("Không được phân tích địa chỉ local.");
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => forbiddenIp(address))
  )
    throw new Error("URL trỏ tới mạng private hoặc địa chỉ bị chặn.");
  return url;
}
