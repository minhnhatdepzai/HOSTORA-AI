import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.HOSTORA_E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.HOSTORA_E2E_BASE_URL ? undefined : {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: "/snap/bin/chromium" },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: { executablePath: "/snap/bin/chromium" },
      },
    },
  ],
});
