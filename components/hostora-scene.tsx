"use client";

import { useEffect, useRef } from "react";

/** Lightweight, original Three.js artwork for the HOSTORA landing hero. */
export function HostoraScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let renderer: import("three").WebGLRenderer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let cleanupScene: (() => void) | undefined;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    void import("three").then((THREE) => {
      if (disposed || !host || !canvas) return;
      try {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
        camera.position.set(0, 0, 7.4);
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        scene.add(new THREE.AmbientLight(0xa6e6ca, 1.6));
        const key = new THREE.PointLight(0x8deac2, 34, 16);
        key.position.set(-2, 2.8, 4);
        scene.add(key);
        const rim = new THREE.PointLight(0x288c91, 22, 15);
        rim.position.set(2.8, -1.2, -2);
        scene.add(rim);

        const system = new THREE.Group();
        scene.add(system);
        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.12, 2),
          new THREE.MeshPhysicalMaterial({ color: 0x123d3c, metalness: 0.42, roughness: 0.23, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
        );
        system.add(core);
        const shellGeometry = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.23, 2));
        const shell = new THREE.LineSegments(shellGeometry, new THREE.LineBasicMaterial({ color: 0xa9f0d1, transparent: true, opacity: 0.48 }));
        system.add(shell);

        const rings = new THREE.Group();
        system.add(rings);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x82dbb8, transparent: true, opacity: 0.6 });
        for (const [x, y, z, scale] of [[0.76, 0.28, 0.2, 1], [-0.35, 0.92, -0.28, 0.82], [0.17, -0.64, 0.72, 1.16]] as const) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62 * scale, 0.007, 6, 160), ringMaterial.clone());
          ring.rotation.set(x, y, z);
          rings.add(ring);
        }

        const nodeMaterial = new THREE.MeshStandardMaterial({ color: 0xc6ffe7, emissive: 0x4dbb91, emissiveIntensity: 1.7, metalness: 0.3, roughness: 0.25 });
        for (let index = 0; index < 8; index += 1) {
          const angle = (index / 8) * Math.PI * 2;
          const node = new THREE.Mesh(new THREE.OctahedronGeometry(index % 3 === 0 ? 0.085 : 0.052, 0), nodeMaterial);
          node.position.set(Math.cos(angle) * 1.72, Math.sin(angle) * 1.24, Math.sin(angle * 2) * 0.56);
          rings.add(node);
        }

        const pointPositions = new Float32Array(360 * 3);
        let seed = 71423;
        const random = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };
        for (let index = 0; index < 360; index += 1) {
          const radius = 2.2 + random() * 2.7;
          const angle = random() * Math.PI * 2;
          pointPositions[index * 3] = Math.cos(angle) * radius;
          pointPositions[index * 3 + 1] = (random() - 0.5) * 4.6;
          pointPositions[index * 3 + 2] = Math.sin(angle) * radius - 1.5;
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
        const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb3f3d7, size: 0.018, transparent: true, opacity: 0.72, sizeAttenuation: true }));
        scene.add(stars);

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let visible = true;
        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height || !renderer) return;
          camera.aspect = width / height;
          camera.position.z = width < 560 ? 8.6 : 7.4;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          renderer.render(scene, camera);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !reducedMotion && !document.hidden) animate();
        }, { threshold: 0.05 });
        intersectionObserver.observe(host);

        const animate = () => {
          if (disposed || reducedMotion || !visible || document.hidden) return;
          frame = window.requestAnimationFrame(animate);
          const time = performance.now() * 0.00012;
          system.rotation.y = time;
          core.rotation.x = Math.sin(time * 1.7) * 0.08;
          rings.rotation.y = -time * 0.76;
          rings.rotation.x = Math.sin(time) * 0.06;
          stars.rotation.y = time * 0.08;
          renderer?.render(scene, camera);
        };
        const onVisibility = () => {
          if (document.hidden) window.cancelAnimationFrame(frame);
          else if (visible && !reducedMotion) animate();
        };
        document.addEventListener("visibilitychange", onVisibility);
        resize();
        animate();

        cleanupScene = () => {
          document.removeEventListener("visibilitychange", onVisibility);
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          renderer?.dispose();
        };
      } catch {
        // The existing CSS radar and HOSTORA mark remain as the WebGL fallback.
      }
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      cleanupScene?.();
    };
  }, []);

  return <div ref={hostRef} className="hostora-scene" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}
