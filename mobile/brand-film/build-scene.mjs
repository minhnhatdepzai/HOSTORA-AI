import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
const result = await build({
  entryPoints: ["mobile/brand-film/scene.ts"],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  target: "es2020",
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><title>HOSTORA — sân khấu 3D</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080d10}canvas{display:block;width:100%;height:100%;touch-action:pan-y}.film-copy{position:absolute;left:6%;right:6%;bottom:21%;color:#dfffee;text-align:center;font:500 clamp(12px,2.4vw,24px)/1.6 Arial,sans-serif;letter-spacing:.2em;pointer-events:none;opacity:0}.film-copy strong{display:block;margin-top:18px;font-size:1.8em;letter-spacing:-.04em;font-weight:600}.live .film-copy{display:none}</style><canvas aria-label="Chữ HOSTORA và robot 3D"></canvas><div class="film-copy">TỪ MỘT Ý TƯỞNG<strong>Mở ra điều của riêng bạn.</strong></div><script>if(!location.search.includes('film'))document.body.classList.add('live');</script><script>${script}</script></html>`;
await mkdir("public/brand", { recursive: true });
await writeFile("public/brand/scene.html", html);
await writeFile("mobile/assets/brand-scene.json", JSON.stringify({ html }));
console.log("Offline 3D scene built:", Math.round(html.length / 1024), "KiB");
