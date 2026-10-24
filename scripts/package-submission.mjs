// Build a source handoff without local credentials, build output or model weights.
import { execFile } from "node:child_process";
import { readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs/submission/HOSTORA-source-2026-10-24.zip");
const roots = [
  "app",
  "components",
  "lib",
  "data",
  "scripts",
  "tests",
  "docs",
  "mobile/src",
  "mobile/assets",
  "training/data",
];
const explicit = [
  ".env.example",
  ".gitignore",
  ".prettierignore",
  "AGENTS.md",
  "README.md",
  "eslint.config.mjs",
  "next.config.ts",
  "next-env.d.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "postcss.config.mjs",
  "tsconfig.json",
  "vitest.config.ts",
  "mobile/.env.example",
  "mobile/.gitignore",
  "mobile/app.json",
  "mobile/package.json",
  "mobile/pnpm-lock.yaml",
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
  /(^|\/)(\.env(?:\.|$)|node_modules|\.next|\.git|android|\.venv|output[^/]*|test-results|playwright-report|releases|rag-index\.json)(\/|$)/;
const forbiddenExtensions =
  /\.(?:apk|gguf|safetensors|pem|key|p12|keystore|jks|webm|zip)$/i;
const files = new Set();

async function add(relative) {
  if (
    forbidden.test(relative) &&
    relative !== ".env.example" &&
    !relative.endsWith("/.env.example")
  )
    return;
  if (forbiddenExtensions.test(relative)) return;
  if (relative === "docs/submission/HOSTORA-source-2026-10-24.zip") return;
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
