import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const videoPath = resolve(here, "../assets/video/hostora-intro.mp4");
const frameRate = 24;
const duration = 6;
const browser = await chromium.launch({ executablePath: "/snap/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-gpu-sandbox"] });
const page = await browser.newPage({ viewport: { width: 720, height: 1560 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
await page.goto(pathToFileURL(resolve(here, "intro.html")).href, { waitUntil: "load" });
await page.evaluate(async () => { await document.fonts.ready; window.playIntro(); document.getAnimations().forEach((animation) => animation.pause()); });
const ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "png", "-framerate", String(frameRate), "-i", "-", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", videoPath], { stdio: ["pipe", "inherit", "inherit"] });
for (let frame = 0; frame < frameRate * duration; frame++) {
  await page.evaluate((ms) => document.getAnimations().forEach((animation) => { animation.currentTime = ms; }), frame * 1000 / frameRate);
  const png = await page.screenshot({ type: "png", animations: "allow" });
  if (!ffmpeg.stdin.write(png)) await new Promise((done) => ffmpeg.stdin.once("drain", done));
  if (frame % 24 === 0) process.stdout.write(`Rendered second ${frame / frameRate}/${duration}\n`);
}
ffmpeg.stdin.end();
const code = await new Promise((done) => ffmpeg.once("close", done));
await browser.close();
if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
console.log(videoPath);
