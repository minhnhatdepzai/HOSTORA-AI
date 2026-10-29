"use client";
import { useEffect, useRef } from "react";

/** One original stage; WebGPU on capable browsers, WebGL2 on older devices. */
export function HostoraScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const host = hostRef.current,
      canvas = canvasRef.current;
    if (!host || !canvas) return;
    let disposed = false,
      frame = 0,
      visible = true,
      last = 0;
    let cleanup = () => {};
    void (async () => {
      const THREE = await import("three");
      const { createBrandWorld } = await import("@/lib/visual/brand-world");
      if (disposed) return;
      const world = createBrandWorld();
      let renderer:
        import("three").WebGLRenderer | import("three/webgpu").WebGPURenderer;
      let gpu: import("three/webgpu").WebGPURenderer | undefined;
      try {
        if ("gpu" in navigator && window.isSecureContext) {
          const { WebGPURenderer } = await import("three/webgpu");
          gpu = new WebGPURenderer({ canvas, antialias: true, alpha: false });
          await gpu.init();
          renderer = gpu;
          world.shadow.visible = false;
          host.dataset.renderer = "webgpu-or-webgl2";
        } else {
          renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: "low-power",
          });
          host.dataset.renderer = "webgl2";
        }
      } catch {
        gpu?.dispose();
        world.dispose();
        host.dataset.renderer = "poster";
        return;
      }
      if (disposed) {
        renderer.dispose();
        world.dispose();
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      let px = 0,
        py = 0,
        tx = 0,
        ty = 0;
      const started = performance.now();
      const preference = matchMedia("(prefers-reduced-motion: reduce)");
      const draw = (time: number) => {
        frame = 0;
        if (disposed || !visible || document.hidden) return;
        if (time - last > 32) {
          px += (tx - px) * 0.1;
          py += (ty - py) * 0.1;
          const elapsed = (time - started) / 1000;
          world.update(
            preference.matches ? 7 : elapsed,
            !preference.matches && elapsed < 7,
            px,
            py,
          );
          renderer.render(world.scene, world.camera);
          last = time;
        }
        if (!preference.matches) frame = requestAnimationFrame(draw);
      };
      const sync = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (visible && !document.hidden) draw(performance.now());
      };
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        world.resize(width, height);
        renderer.setSize(width, height, false);
        last = 0;
        sync();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      const intersection = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          sync();
        },
        { threshold: 0.05 },
      );
      intersection.observe(host);
      const move = (e: PointerEvent) => {
        if (preference.matches) return;
        const r = host.getBoundingClientRect();
        tx = Math.max(
          -1,
          Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1),
        );
        ty = Math.max(
          -1,
          Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1),
        );
      };
      const leave = () => {
        tx = 0;
        ty = 0;
      };
      host.addEventListener("pointermove", move, { passive: true });
      host.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", sync);
      preference.addEventListener("change", sync);
      host.dataset.ready = "true";
      resize();
      cleanup = () => {
        observer.disconnect();
        intersection.disconnect();
        host.removeEventListener("pointermove", move);
        host.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", sync);
        preference.removeEventListener("change", sync);
        renderer.dispose();
        world.dispose();
      };
    })().catch(() => {
      host.dataset.renderer = "poster";
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, []);
  return (
    <div
      ref={hostRef}
      className="hostora-scene hostora-sculpture"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
