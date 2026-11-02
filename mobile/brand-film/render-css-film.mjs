import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const output = path.join(root, "mobile/assets/video/hostora-brand-prelude.mp4");
const frames = path.join(root, "output/brand-film-prelude");
const fps = 24;
const duration = 5.8;

await mkdir(frames, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/snap/bin/chromium",
  headless: true,
  args: ["--allow-file-access-from-files"],
});
const page = await browser.newPage({
  viewport: { width: 720, height: 1560 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (error) => console.error(error.message));

let encoder;
try {
  await page.goto(`file://${path.join(here, "intro.html")}`);
  await page.evaluate(() => {
    window.playIntro();
    for (const animation of document.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 0;
    }
  });

  encoder = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-framerate",
      String(fps),
      "-i",
      "-",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "19",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const completion = new Promise((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("close", resolve);
  });

  for (let frame = 0; frame < Math.round(fps * duration); frame += 1) {
    const time = (frame / fps) * 1_000;
    await page.evaluate((currentTime) => {
      for (const animation of document.getAnimations({ subtree: true })) {
        animation.currentTime = currentTime;
      }
    }, time);
    const png = await page.screenshot({ type: "png" });
    if (!encoder.stdin.write(png)) {
      await new Promise((resolve) => encoder.stdin.once("drain", resolve));
    }
    if (frame % fps === 0) {
      await page.screenshot({
        path: path.join(frames, `second-${frame / fps}.png`),
      });
    }
  }

  encoder.stdin.end();
  if ((await completion) !== 0) throw new Error("Video encoder failed");
  console.log(`Rendered ${output}`);
} finally {
  encoder?.stdin.destroy();
  await browser.close();
}
