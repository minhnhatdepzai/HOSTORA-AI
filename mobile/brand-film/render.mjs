import { spawn } from "node:child_process";
import { mkdir, copyFile, rename } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const html = await readFile("public/brand/scene.html");
const server = createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(html);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: "/snap/bin/chromium",
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 720, height: 1560 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.error(e.message));
const fps = 24,
  duration = 7;
const out = "mobile/assets/video/hostora-intro.next.mp4";
let encoder;
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/?film`);
  await page.waitForFunction(() => window.brandReady === true);
  await mkdir("output/brand-film-v2", { recursive: true });
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
      out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const completion = new Promise((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("close", resolve);
  });
  for (let f = 0; f < fps * duration; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / fps);
    const png = await page.screenshot({ type: "png" });
    if (!encoder.stdin.write(png))
      await new Promise((r) => encoder.stdin.once("drain", r));
    if (f % fps === 0) {
      await page.screenshot({
        path: `output/brand-film-v2/second-${f / fps}.png`,
      });
      console.log(`Rendered ${f / fps}/${duration}s`);
    }
  }
  encoder.stdin.end();
  if ((await completion) !== 0) throw Error("Video encoder failed");
  await rename(out, "mobile/assets/video/hostora-intro.mp4");
  await copyFile(
    "mobile/assets/video/hostora-intro.mp4",
    "public/brand/hostora-intro.mp4",
  );
  await page.evaluate(() => window.renderFrame(6));
  await page.screenshot({ path: "public/brand/hostora-poster.png" });
  await copyFile(
    "public/brand/hostora-poster.png",
    "mobile/assets/images/hostora-stage.png",
  );
  console.log("Intro 7 seconds exported for web and Android.");
} finally {
  encoder?.stdin.destroy();
  await browser.close();
  server.close();
}
