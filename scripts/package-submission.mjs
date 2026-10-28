// Build a source handoff without local credentials, build output or model weights.
import { execFile } from "node:child_process";
import { readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs/submission/HOSTORA-source-2.0.9-2026-10-29.zip");
const roots = [
  "app",
  "components",
  "lib",
  "data",
  "public",
  "shared",
  "scripts",
  "tests",
  "docs",
  "docker",
  "mobile/src",
  "mobile/assets",
];
const explicit = [
  ".env.example",
  ".env.docker.example",
  ".dockerignore",
  ".gitignore",
  ".prettierignore",
  "AGENTS.md",
  "Dockerfile",
  "README.md",
  "compose.yaml",
  "compose.gpu.yaml",
  "eslint.config.mjs",
  "next.config.ts",
  "instrumentation.ts",
  "jsrepo.config.ts",
  "next-env.d.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "tsconfig.json",
  "vitest.config.ts",
  "mobile/.env.example",
  "mobile/.gitignore",
  "mobile/app.json",
  "mobile/package.json",
  "mobile/pnpm-lock.yaml",
  "mobile/pnpm-workspace.yaml",
  "mobile/README.md",
  "mobile/tsconfig.json",
  "mobile/eslint.config.js",
  "mobile/babel.config.js",
  "mobile/metro.config.js",
  "training/README.md",
  "training/pyproject.toml",
  "training/uv.lock",
  "training/build_chat_dataset.py",
  "training/evaluate_chatbot.mjs",
  "training/train_chatbot.py",
  "training/export_chatbot.py",
  "training/train_smoke.py",
  "training/Modelfile.chatbot",
  "training/Modelfile.chatbot-v2",
  "training/challenge_cases.jsonl",
  "training/dataset.sample.jsonl",
];
const forbidden =
  /(^|\/)(\.env(?:\.[^/]*)?|node_modules|\.next|\.git|android|\.venv|output[^/]*|test-results|playwright-report|releases|runtime)(\/|$)/;
const forbiddenExtensions =
  /\.(?:apk|gguf|safetensors|pem|key|p12|keystore|jks|webm|mp4|zip|sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?)$/i;
const files = new Set();

async function add(relative) {
  if (relative === "docs/submission/HOSTORA-2.0.9-SHA256SUMS.txt") return;
  if (
    forbidden.test(relative) &&
    relative !== ".env.example" &&
    relative !== ".env.docker.example" &&
    !relative.endsWith("/.env.example")
  )
    return;
  if (forbiddenExtensions.test(relative) && !relative.startsWith("mobile/assets/video/")) return;
  const full = path.join(root, relative);
  let info;
  try {
    info = await stat(full);
  } catch {
    return;
  }
  if (info.isDirectory()) {
    for (const name of await readdir(full))
      await add(path.posix.join(relative, name));
  } else if (info.isFile()) {
    files.add(relative);
  }
}

for (const relative of [...roots, ...explicit]) await add(relative);
const selected = [...files].sort();
if (selected.length < 100)
  throw new Error(`Only ${selected.length} source files found`);
const temporary = `${output}.tmp-${process.pid}.zip`;
await execFileAsync("zip", ["-X", "-q", temporary, ...selected], { cwd: root });
await rename(temporary, output);
console.log(JSON.stringify({ output, files: selected.length }));
