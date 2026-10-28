import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "hostora.customer.session.v1";
let webMemorySession = "";

export async function readCustomerSessionToken() {
  if (Platform.OS === "web") return webMemorySession;
  return (await SecureStore.getItemAsync(SESSION_KEY)) ?? "";
}

export async function saveCustomerSessionToken(token: string) {
  if (Platform.OS === "web") {
    webMemorySession = token;
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function clearCustomerSessionToken() {
  if (Platform.OS === "web") {
    webMemorySession = "";
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
