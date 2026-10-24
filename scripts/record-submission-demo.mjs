// Silent, reproducible <2 minute browser demo of the five Đề 01 features.
// Uses an isolated browser profile and fictional lead; no customer data.
import { execFile } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const output = new URL("../docs/submission/", import.meta.url);
await mkdir(fileURLToPath(output), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "/snap/bin/chromium",
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: fileURLToPath(output),
    size: { width: 1280, height: 720 },
  },
});
const page = await context.newPage();
const base = process.env.HOSTORA_DEMO_URL ?? "http://127.0.0.1:3000";
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(base);
await pause(2500);
await page.getByRole("button", { name: "Shop mới có cần VPS không?" }).click();
await pause(2000);
await page.goto(`${base}/consultation`);
await pause(1800);
await page.getByRole("button", { name: /Bán hàng/ }).click();
await pause(750);
for (let step = 0; step < 3; step += 1) {
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await pause(1000);
}
await page.getByRole("button", { name: "Xem đề xuất" }).click();
await page.locator("article").filter({ hasText: "/100" }).first().waitFor();
await pause(3500);
await page
  .getByRole("region", { name: "Bảng so sánh ba gói" })
  .scrollIntoViewIfNeeded();
await pause(3000);
const alternate = page.locator("article").filter({ hasText: "/100" }).nth(1);
await alternate.scrollIntoViewIfNeeded();
await alternate.getByRole("button", { name: /^Chọn / }).click();
await pause(1700);
await page.getByLabel("Họ tên").fill("Khách Demo");
await page.getByLabel("Số điện thoại").fill("0900000000");
await page.getByRole("button", { name: "Lưu yêu cầu tư vấn" }).click();
await pause(1800);
await page.goto(`${base}/dashboard`);
await page.getByText("Khách Demo").waitFor();
await pause(3000);
await page.goto(`${base}/ai-assistant`);
await page
  .getByLabel("Tin nhắn")
  .fill("Tên miền shop-demo-hostora.com còn trống hôm nay không?");
await page.getByRole("button", { name: "Gửi" }).click();
await page.getByText("Nguồn được trích dẫn").waitFor();
await pause(5000);

const rawVideo = await page.video().path();
await context.close();
await browser.close();
const webm = new URL("HOSTORA-demo-2026-10-24.webm", output);
const mp4 = new URL("HOSTORA-demo-2026-10-24.mp4", output);
await rename(rawVideo, fileURLToPath(webm));
await execFileAsync("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-n",
  "-i",
  fileURLToPath(webm),
  "-c:v",
  "libx264",
  "-crf",
  "24",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  fileURLToPath(mp4),
]);
console.log(fileURLToPath(mp4));
