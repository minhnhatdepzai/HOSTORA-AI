import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

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

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBase = await getApiBase();
  if (!apiBase) {
    throw new Error("Vui lòng mở phần Kết nối và hoàn tất thiết lập.");
  }
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const output = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof output.error === "string" ? output.error : "HOSTORA chưa thể hoàn tất yêu cầu này.");
  return output as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const apiBase = await getApiBase();
  if (!apiBase) {
    throw new Error("Vui lòng mở phần Kết nối và hoàn tất thiết lập.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${apiBase}${path}`, { signal: controller.signal });
    const output = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("HOSTORA chưa thể tải thông tin lúc này.");
    return output as T;
  } finally {
    clearTimeout(timeout);
  }
}
