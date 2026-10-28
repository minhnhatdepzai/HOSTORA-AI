// Complete Next's standalone output and strip local customer/runtime data.
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const mobileConfig = JSON.parse(await readFile(path.join(root, "mobile", "app.json"), "utf8"));
const releases = [
  `HOSTORA-AI-${mobileConfig.expo.version}-arm64.apk`,
  "HOSTORA-AI-2.0.3-universal.apk",
];

await stat(path.join(standalone, "server.js"));
for (const [source, target] of [
  [path.join(root, "public"), path.join(standalone, "public")],
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
]) {
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}

// Next's file tracing may copy whole directories when a route builds paths
// dynamically. Never ship the developer's SQLite data or Studio projects.
const runtime = path.join(standalone, "data", "runtime");
await rm(runtime, { recursive: true, force: true });
await mkdir(runtime, { recursive: true });

const releaseTarget = path.join(standalone, "mobile", "releases");
await rm(releaseTarget, { recursive: true, force: true });
await mkdir(releaseTarget, { recursive: true });
let copied = 0;
for (const filename of releases) {
  const source = path.join(root, "mobile", "releases", filename);
  try {
    await stat(source);
  } catch {
    continue;
  }
  await cp(source, path.join(releaseTarget, filename));
  copied += 1;
}
console.log(`Standalone ready: static assets, ${copied} APKs, empty runtime data.`);
