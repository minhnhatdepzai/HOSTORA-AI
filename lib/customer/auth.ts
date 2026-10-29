import type { CustomerAccount } from "@/lib/customer/types";
import { getCustomerStore } from "@/lib/customer/store";

export const CUSTOMER_COOKIE = "hostora_customer_session";
const COOKIE_SECONDS = 14 * 24 * 60 * 60;

export function customerSessionCookie(token: string, secure: boolean) {
  return `${CUSTOMER_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearedCustomerSessionCookie(secure: boolean) {
  return `${CUSTOMER_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function safeCustomerNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  const allowed = ["/account", "/orders", "/website-studio"];
  return allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}/`))
    ? value
    : "/account";
}

export function sessionTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CUSTOMER_COOKIE}=`));
  return cookie?.slice(CUSTOMER_COOKIE.length + 1) ?? "";
}

export function customerFromRequest(request: Request): CustomerAccount | null {
  return getCustomerStore().findSession(sessionTokenFromRequest(request));
}

export function isMobileAuthRequest(request: Request) {
  return request.headers.get("x-hostora-client") === "mobile";
}

export function requestUsesBearer(request: Request) {
  return request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
}
