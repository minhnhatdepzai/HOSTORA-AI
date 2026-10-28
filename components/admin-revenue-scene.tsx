"use client";

import { useEffect, useRef } from "react";

export function AdminRevenueScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (disposed) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, .1, 30);
      camera.position.z = 6.4;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const group = new THREE.Group();
      scene.add(group, new THREE.AmbientLight(0x9ef0ce, 1.8));
      const light = new THREE.PointLight(0x83e5bd, 30, 14);
      light.position.set(-2, 3, 4);
      scene.add(light);

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.08, 1),
        new THREE.MeshPhysicalMaterial({ color: 0x0c3b3a, metalness: .48, roughness: .22, clearcoat: .9 }),
      );
      group.add(core);
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.22, 2)),
        new THREE.LineBasicMaterial({ color: 0xb5efd2, transparent: true, opacity: .58 }),
      );
      group.add(wire);
      for (let index = 0; index < 3; index += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.55 + index * .2, .012, 6, 120),
          new THREE.MeshBasicMaterial({ color: index === 1 ? 0x62bfa2 : 0xb5efd2, transparent: true, opacity: .45 }),
        );
        ring.rotation.set(.55 + index * .46, .2 + index * .62, index * .3);
        group.add(ring);
      }

      let targetX = 0;
      let targetY = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const down = (event: PointerEvent) => {
        dragging = true; lastX = event.clientX; lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      };
      const move = (event: PointerEvent) => {
        if (!dragging) return;
        targetY += (event.clientX - lastX) * .012;
        targetX += (event.clientY - lastY) * .009;
        lastX = event.clientX; lastY = event.clientY;
      };
      const up = () => { dragging = false; };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);

      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const draw = () => {
        frame = 0;
        if (disposed || document.hidden) return;
        if (!reduced) frame = requestAnimationFrame(draw);
        if (!dragging && !reduced) targetY += .0025;
        group.rotation.x += (targetX - group.rotation.x) * .09;
        group.rotation.y += (targetY - group.rotation.y) * .09;
        wire.rotation.z += reduced ? 0 : .0015;
        renderer.render(scene, camera);
      };
      const visibility = () => { if (!document.hidden && !frame) draw(); };
      document.addEventListener("visibilitychange", visibility);
      resize(); draw();
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
        renderer.dispose();
      };
    }).catch(() => undefined);

    return () => { disposed = true; cancelAnimationFrame(frame); cleanup(); };
  }, []);

  return (
    <div ref={hostRef} className="admin-revenue-scene">
      <canvas ref={canvasRef} aria-label="Mô hình doanh thu ba chiều, kéo để xoay" />
      <span>KÉO ĐỂ XOAY · DỮ LIỆU THẬT</span>
    </div>
  );
}
