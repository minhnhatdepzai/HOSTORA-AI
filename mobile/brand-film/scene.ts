import * as THREE from "three";
import { createBrandWorld } from "../../lib/visual/brand-world";

const canvas = document.querySelector("canvas")!;
const world = createBrandWorld();
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "low-power",
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
const film = new URLSearchParams(location.search).has("film");
let active = true;
let frame = 0;
let pointer = 0;
let pointerTarget = 0;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function resize() {
  world.resize(innerWidth, innerHeight);
  renderer.setSize(innerWidth, innerHeight);
  draw(7, false);
}
function draw(t: number, isFilm = film) {
  world.update(t, isFilm, pointer);
  renderer.render(world.scene, world.camera);
  document.body.dataset.phase =
    t < 1.7 ? "arrival" : t < 3.8 ? "expand" : "welcome";
  document.querySelector<HTMLElement>(".film-copy")!.style.opacity = String(
    Math.min(1, Math.max(0, (t - 5.5) / 0.7)),
  );
}
Object.assign(window, {
  renderFrame: (t: number) => draw(t, true),
  brandReady: true,
});
function animate(t: number) {
  frame = 0;
  if (!active || document.hidden) return;
  pointer += (pointerTarget - pointer) * 0.06;
  draw(reduced ? 7 : t / 1000, false);
  if (!reduced) frame = requestAnimationFrame(animate);
}
canvas.addEventListener("pointermove", (e) => {
  pointerTarget = (e.clientX / innerWidth - 0.5) * 2;
});
canvas.addEventListener("pointerleave", () => {
  pointerTarget = 0;
});
function sync() {
  cancelAnimationFrame(frame);
  frame = 0;
  if (active && !document.hidden) frame = requestAnimationFrame(animate);
}
addEventListener("message", (e) => {
  try {
    const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    if (d?.type === "activity") {
      active = d.active === true;
      sync();
    }
  } catch {}
});
// Android WebView delivers postMessage on document; iOS delivers it on window.
document.addEventListener("message", ((e: MessageEvent) => {
  try {
    const d = JSON.parse(e.data);
    if (d.type === "activity") {
      active = d.active === true;
      sync();
    }
  } catch {}
}) as EventListener);
document.addEventListener("visibilitychange", sync);
addEventListener("resize", resize);
resize();
if (!film) sync();
const bridge = (
  window as unknown as {
    ReactNativeWebView?: { postMessage: (v: string) => void };
  }
).ReactNativeWebView;
bridge?.postMessage(JSON.stringify({ type: "ready", renderer: "WebGL2" }));
