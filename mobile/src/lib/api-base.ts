export function resolveDefaultApiBase(input: {
  platform: string;
  isPhysicalDevice: boolean;
  envBase?: string;
}) {
  if (input.platform === "android" && !input.isPhysicalDevice) {
    return "http://10.0.2.2:3200";
  }

  const configured = input.envBase?.trim().replace(/\/$/, "");
  if (configured) return configured;

  return input.platform === "web" ? "http://127.0.0.1:3000" : "";
}
