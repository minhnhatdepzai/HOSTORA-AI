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
    throw new Error(
      "Hãy cấu hình EXPO_PUBLIC_API_BASE_URL bằng địa chỉ LAN của máy chạy Ollama.",
    );
  }
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const output = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(output.error ?? "Local AI chưa phản hồi.");
  return output as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const apiBase = await getApiBase();
  if (!apiBase) {
    throw new Error(
      "Hãy cấu hình địa chỉ máy chạy HOSTORA AI trong phần Cài đặt.",
    );
  }
  const response = await fetch(`${apiBase}${path}`);
  const output = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(output.error ?? "Máy chủ HOSTORA AI chưa phản hồi.");
  return output as T;
}
