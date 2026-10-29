import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { readCustomerSessionToken } from "@/lib/auth-session";

export const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === "web" ? "http://127.0.0.1:3000" : "");
const SERVER_KEY = "hostora:mobile:api-base";

export async function getApiBase() {
  return (await AsyncStorage.getItem(SERVER_KEY)) || DEFAULT_API_BASE;
}

export async function saveApiBase(value: string) {
  const normalized = value.trim().replace(/\/$/, "");
  await AsyncStorage.setItem(SERVER_KEY, normalized);
  return normalized;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const apiBase = await getApiBase();
  if (!apiBase)
    throw new Error("Vui lòng mở phần Kết nối và hoàn tất thiết lập.");
  const token = await readCustomerSessionToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 12000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "x-hostora-client": "mobile",
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const output = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiError(
        typeof output.error === "string"
          ? output.error
          : "HOSTORA chưa thể hoàn tất yêu cầu này.",
        response.status,
      );
    return output as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    body,
    timeoutMs:
      path.startsWith("/api/ai/") || path === "/api/account/ai-sources"
        ? 130000
        : 12000,
  });
}

export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

export async function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, { method: "DELETE" });
}
