import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import fontData from "./helvetiker-bold.json";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
/** Original HOSTORA sculpture: reusable by the web, offline mobile scene and film. */
export function createBrandWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080d10");
  scene.fog = new THREE.Fog("#080d10", 16, 36);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  camera.position.set(0, 3.3, 13);
  camera.lookAt(0, 0.6, 0);
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xe9fff8, 0x10161c, 2.4));
  const light = new THREE.DirectionalLight(0xf5fffc, 5);
  light.position.set(-4, 7, 5);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0x77ffce, 4);
  rim.position.set(5, 3, -3);
  scene.add(rim);
  const warm = new THREE.DirectionalLight(0xe8b588, 1.5);
  warm.position.set(-6, 1, -2);
  scene.add(warm);
  const silver = new THREE.MeshPhysicalMaterial({
    color: 0xc8dad6,
    metalness: 0.65,
    roughness: 0.24,
    clearcoat: 1,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x17272c,
    metalness: 0.5,
    roughness: 0.3,
  });
  const mint = new THREE.MeshStandardMaterial({
    color: 0x99ffcb,
    emissive: 0x32ae7e,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.15,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x030d12,
    roughness: 0.25,
    metalness: 0.25,
  });
  const box = (
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    r = 0.1,
  ) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
      color: 0x0b1518,
      roughness: 0.55,
      metalness: 0.35,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.8;
  scene.add(floor);
  // A soft procedural contact shadow, with no external image or network asset.
  const shadowMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { strength: { value: 0.65 } },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 vUv;uniform float strength;void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(0.,0.,0.,pow(max(0.,1.-d),2.)*strength);}",
  });
  // ShaderMaterial is replaced by a simple translucent disk in WebGPU mode by the caller.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.79;
  root.add(shadow);
  const plinth = box(8.8, 0.18, 3.2, dark, 0.08);
  plinth.position.set(0, -1.65, 0);
  root.add(plinth);
  const strip = box(8.2, 0.025, 0.025, mint, 0.008);
  strip.position.set(0, -1.53, 1.55);
  root.add(strip);
  const font = new FontLoader().parse(fontData);
  const word = new THREE.Group();
  root.add(word);
  const letters: THREE.Mesh[] = [];
  const widths: number[] = [];
  let portrait = false;
  for (const letter of "HOSTORA") {
    const geometry = new TextGeometry(letter, {
      font,
      size: 1.4,
      depth: 0.28,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    geometry.computeBoundingBox();
    widths.push(geometry.boundingBox!.max.x + 0.18);
    geometry.translate(-geometry.boundingBox!.max.x / 2, -0.7, 0);
    const mesh = new THREE.Mesh(geometry, letter === "H" ? mint : silver);
    word.add(mesh);
    letters.push(mesh);
  }
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.065, 12, 100),
    dark,
  );
  arch.position.set(0, 0.55, -2.2);
  root.add(arch);
  const rimArch = new THREE.Mesh(
    new THREE.TorusGeometry(4.38, 0.018, 8, 100),
    mint,
  );
  rimArch.position.copy(arch.position);
  root.add(rimArch);
  const mascot = new THREE.Group();
  root.add(mascot);
  const body = box(0.82, 0.77, 0.65, silver, 0.18);
  body.position.y = 0.8;
  mascot.add(body);
  const head = box(1.2, 0.91, 0.78, silver, 0.22);
  head.position.y = 1.6;
  mascot.add(head);
  const visor = box(0.97, 0.55, 0.08, black, 0.16);
  visor.position.set(0, 1.6, 0.415);
  mascot.add(visor);
  for (const x of [-0.25, 0.25]) {
    const eye = box(0.12, 0.18, 0.06, mint, 0.04);
    eye.position.set(x, 1.64, 0.47);
    mascot.add(eye);
  }
  const mouth = box(0.17, 0.025, 0.03, mint, 0.01);
  mouth.position.set(0, 1.44, 0.47);
  mascot.add(mouth);
  const antenna = box(0.045, 0.32, 0.045, silver, 0.01);
  antenna.position.y = 2.18;
  mascot.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), mint);
  tip.position.y = 2.36;
  mascot.add(tip);
  const badge = box(0.34, 0.3, 0.03, dark, 0.04);
  badge.position.set(0, 0.82, 0.345);
  mascot.add(badge);
  for (const x of [-0.09, 0.09]) {
    const bar = box(0.045, 0.19, 0.025, mint, 0.008);
    bar.position.set(x, 0.82, 0.37);
    mascot.add(bar);
  }
  const cross = box(0.18, 0.04, 0.025, mint, 0.008);
  cross.position.set(0, 0.82, 0.37);
  mascot.add(cross);
  const limbs: THREE.Group[] = [];
  for (const x of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(x * 0.56, 1.02, 0);
    const limb = box(0.22, 0.54, 0.23, silver, 0.09);
    limb.position.y = -0.2;
    arm.add(limb);
    mascot.add(arm);
    limbs.push(arm);
    const leg = new THREE.Group();
    leg.position.set(x * 0.25, 0.45, 0);
    const foot = box(0.3, 0.31, 0.46, dark, 0.09);
    foot.position.set(0, -0.22, 0.08);
    leg.add(foot);
    mascot.add(leg);
    limbs.push(leg);
  }
  const satellites = new THREE.Group();
  root.add(satellites);
  for (let i = 0; i < 7; i++) {
    const cube = box(0.15, 0.15, 0.15, i % 2 ? mint : silver, 0.035);
    satellites.add(cube);
  }
  function update(time: number, film = false, pointerX = 0, pointerY = 0) {
    const spread = film ? ease((time - 1.7) / 1.7) : 1;
    word.position.set(0, 0.45, 0);
    word.scale.setScalar(portrait ? 0.68 : 0.87);
    let cursor = -widths.reduce((a, b) => a + b, 0) / 2;
    word.rotation.set(
      0,
      film ? -0.09 : Math.sin(time * 0.18) * 0.08 + pointerX * 0.18,
      0,
    );
    letters.forEach((mesh, i) => {
      mesh.visible = i === 0 || spread > i * 0.06;
      mesh.position.set(
        (cursor + widths[i] / 2) * spread,
        film && i > 0 ? (1 - ease((time - 1.9 - i * 0.12) / 0.8)) * -1.2 : 0,
        0,
      );
      cursor += widths[i];
      mesh.scale.setScalar(
        i === 0 ? 1.8 - 0.8 * spread : ease((spread - i * 0.06) * 1.5),
      );
      mesh.rotation.y = i === 0 ? (1 - spread) * 0.2 : 0;
    });
    if (film && time < 1.7) {
      const t = clamp(time / 1.35);
      letters[0].position.y =
        t < 0.67
          ? 6 * (1 - Math.pow(t / 0.67, 2))
          : Math.sin(((t - 0.67) / 0.33) * Math.PI) * 0.72;
      letters[0].rotation.z = Math.sin(t * Math.PI) * -0.1;
    }
    const run = film ? clamp((time - 4.1) / 1.8) : 1;
    mascot.visible = !film || time > 3.25;
    mascot.position.set(
      3.1 - run * 1.2,
      -1.46 +
        (film && time < 4.1
          ? Math.pow((4.1 - time) / 0.85, 2) * 5
          : Math.abs(Math.sin(time * 10)) * (run < 1 ? 0.15 : 0.025)),
      0.2 + run * 2,
    );
    mascot.scale.setScalar(0.85);
    mascot.rotation.y = film
      ? -0.15
      : Math.sin(time * 0.4) * 0.15 + pointerX * 0.25;
    limbs.forEach((limb, i) => {
      limb.rotation.x =
        Math.sin(time * (run < 1 ? 16 : 2) + i * Math.PI) *
        (run < 1 ? 0.65 : 0.07);
    });
    satellites.children.forEach((cube, i) => {
      cube.position.set(
        Math.cos(time * 0.15 + i * 1.7) * 5,
        1.8 + Math.sin(time * 0.3 + i) * 0.9,
        Math.sin(i * 1.7) * 2 - 2,
      );
      cube.rotation.set(time * 0.2 + i, time * 0.3, 0);
    });
    root.rotation.x = pointerY * 0.025;
    root.rotation.y = pointerX * 0.06;
    camera.position.z = film ? 15 - ease(time / 5) * 1.3 : 13.7;
    camera.lookAt(0, 0.35, 0);
  }
  function resize(width: number, height: number) {
    camera.aspect = width / height;
    portrait = camera.aspect < 0.8;
    camera.fov = camera.aspect < 0.8 ? 65 : 36;
    camera.updateProjectionMatrix();
  }
  function dispose() {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
  return { scene, camera, root, mascot, update, resize, dispose, shadow };
}
