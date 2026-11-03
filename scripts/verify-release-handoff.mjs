import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getReleaseInfo, sha256File } from "./release-assets.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function zipEntries(archive) {
  const { stdout } = await execFileAsync("unzip", ["-Z1", archive], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeArchiveEntry(entry) {
  if (entry.includes("\0")) throw new Error("Archive entry contains NUL");
  const normalized = entry.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Archive entry escapes its root: ${entry}`);
  }
  return normalized;
}

const fineTuningFiles = new Set([
  "README.md",
  "SHA256SUMS.txt",
  "training/README.md",
  "training/CHATBOT_FINETUNING.md",
]);
const candidateFiles = new Set([
  "adapter/README.md",
  "adapter/adapter_config.json",
  "adapter/adapter_model.safetensors",
  "adapter/chat_template.jinja",
  "adapter/processor_config.json",
  "adapter/tokenizer.json",
  "adapter/tokenizer_config.json",
  "dataset-manifest.json",
  "evaluation.json",
  "manifest.json",
  "promotion.json",
  "status.json",
  "summary.json",
  "training-config.json",
]);

function isAllowedFineTuningEntry(entry) {
  if (entry.endsWith("/")) return true;
  const segments = entry.split("/");
  const relative = segments.slice(1).join("/");
  if (fineTuningFiles.has(relative)) return true;
  const [candidate, ...candidatePath] = relative.split("/");
  return (
    ["chatbot-v8", "studio-v3"].includes(candidate) &&
    candidateFiles.has(candidatePath.join("/"))
  );
}

export function assertSafeEntries(entries, kind) {
  const bad = [];
  for (const original of entries) {
    let entry;
    try {
      entry = normalizeArchiveEntry(original);
    } catch {
      bad.push(original);
      continue;
    }
    const basename = path.posix.basename(entry);
    const environmentFile = basename.startsWith(".env");
    const allowedEnvironmentExample = [
      ".env.example",
      ".env.docker.example",
    ].includes(basename);
    if (
      (environmentFile && (kind !== "source" || !allowedEnvironmentExample)) ||
      /(^|\/)(node_modules|\.next|\.git|\.venv|runtime|releases)(\/|$)/i.test(
        entry,
      ) ||
      /\.(?:sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?|pem|key|p12|jks|keystore)$/i.test(
        entry,
      )
    ) {
      bad.push(original);
      continue;
    }
    if (kind === "source") {
      if (
        /^docs\/submission\/HOSTORA-(?:release-[^/]+\.json|[^/]+\.zip\.sha256)$/i.test(
          entry,
        ) ||
        /(^|\/)(checkpoint-\d+|gguf(?:_gguf)?|output-[^/]+)(\/|$)/i.test(
          entry,
        ) ||
        /\.(?:gguf|safetensors|apk)$/i.test(entry)
      ) {
        bad.push(original);
      }
    } else if (!isAllowedFineTuningEntry(entry)) {
      bad.push(original);
    }
  }
  if (bad.length) {
    throw new Error(
      `${kind} archive has forbidden entries: ${[...new Set(bad)].join(", ")}`,
    );
  }
}

function requireEntries(entries, required, kind) {
  const missing = required.filter(
    (requiredEntry) =>
      !entries.some(
        (entry) =>
          entry === requiredEntry || entry.endsWith(`/${requiredEntry}`),
      ),
  );
  if (missing.length) {
    throw new Error(`${kind} archive misses: ${missing.join(", ")}`);
  }
}

async function verifyExternalChecksum(archive) {
  const checksumFile = `${archive}.sha256`;
  const line = (await readFile(checksumFile, "utf8")).trim();
  const match = line.match(/^([a-f0-9]{64})\s{2}([^/]+)$/i);
  if (!match || match[2] !== path.basename(archive)) {
    throw new Error(`Invalid checksum file: ${checksumFile}`);
  }
  const actual = await sha256File(archive);
  if (actual !== match[1].toLowerCase()) {
    throw new Error(`Checksum mismatch: ${path.basename(archive)}`);
  }
  return actual;
}

async function walk(directory, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(directory, child)));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Unsupported archive entry type: ${child}`);
  }
  return files;
}

export async function verifyFineTuningContents(
  archive,
  { promotionRoot } = {},
) {
  const temporary = await mkdtemp(
    path.join(tmpdir(), "hostora-release-check-"),
  );
  try {
    await execFileAsync("unzip", ["-q", archive, "-d", temporary]);
    const roots = await readdir(temporary, { withFileTypes: true });
    const directories = roots.filter((entry) => entry.isDirectory());
    if (directories.length !== 1)
      throw new Error("Fine-tuning ZIP must have one root");
    const packageRoot = path.join(temporary, directories[0].name);
    const manifestFile = path.join(packageRoot, "SHA256SUMS.txt");
    const manifest = (await readFile(manifestFile, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean);
    const declared = new Map();
    for (const line of manifest) {
      const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/i);
      if (!match || match[2].startsWith("/") || match[2].includes("..")) {
        throw new Error(`Invalid internal checksum line: ${line}`);
      }
      declared.set(match[2], match[1].toLowerCase());
    }
    const files = (await walk(packageRoot))
      .filter((file) => file !== "SHA256SUMS.txt")
      .sort();
    if (files.length !== declared.size) {
      throw new Error("Internal checksum manifest does not cover every file");
    }
    for (const file of files) {
      const expected = declared.get(file);
      if (
        !expected ||
        (await sha256File(path.join(packageRoot, file))) !== expected
      ) {
        throw new Error(`Internal checksum mismatch: ${file}`);
      }
    }
    for (const candidate of ["chatbot-v8", "studio-v3"]) {
      const archived = JSON.parse(
        await readFile(
          path.join(packageRoot, candidate, "promotion.json"),
          "utf8",
        ),
      );
      if (
        archived.status !== "candidate" ||
        archived.automatic_promotion !== false
      ) {
        throw new Error(
          `${candidate} must remain an explicitly unpromoted candidate`,
        );
      }
      if (promotionRoot) {
        const local = JSON.parse(
          await readFile(
            path.join(
              promotionRoot,
              `training/output-${candidate}/promotion.json`,
            ),
            "utf8",
          ),
        );
        if (JSON.stringify(archived) !== JSON.stringify(local)) {
          throw new Error(
            `${candidate} promotion evidence changed while packaging`,
          );
        }
      }
    }
    return files.length;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function main() {
  const release = await getReleaseInfo(root);
  const source = path.resolve(
    argument("--source") ??
      path.join(root, "docs/submission", release.assets.source),
  );
  const fineTuning = path.resolve(
    argument("--finetuning") ??
      path.join(root, "docs/submission", release.assets.fineTuning),
  );
  const promotionRootArgument = argument("--promotion-root");
  const promotionRoot = promotionRootArgument
    ? path.resolve(promotionRootArgument)
    : undefined;

  const sourceEntries = await zipEntries(source);
  assertSafeEntries(sourceEntries, "source");
  requireEntries(
    sourceEntries,
    [
      "README.md",
      "Dockerfile",
      "compose.yaml",
      "mobile/app.json",
      "training/train_chatbot.py",
      "training/configs/chatbot-v8.json",
      "training/configs/studio-v3.json",
      "training/data/chatbot_v8_train.jsonl",
      "training/data/studio_v3_train.jsonl",
    ],
    "source",
  );

  const fineTuningEntries = await zipEntries(fineTuning);
  assertSafeEntries(fineTuningEntries, "fine-tuning");
  requireEntries(
    fineTuningEntries,
    [
      "SHA256SUMS.txt",
      "chatbot-v8/adapter/adapter_model.safetensors",
      "chatbot-v8/evaluation.json",
      "chatbot-v8/promotion.json",
      "chatbot-v8/status.json",
      "chatbot-v8/training-config.json",
      "studio-v3/adapter/adapter_model.safetensors",
      "studio-v3/evaluation.json",
      "studio-v3/promotion.json",
      "studio-v3/status.json",
      "studio-v3/training-config.json",
    ],
    "fine-tuning",
  );

  // Verify the downloaded bytes before extracting any archive content.
  const sourceChecksum = await verifyExternalChecksum(source);
  const fineTuningChecksum = await verifyExternalChecksum(fineTuning);
  const result = {
    version: release.version,
    source: {
      file: path.basename(source),
      entries: sourceEntries.length,
      sha256: sourceChecksum,
    },
    fineTuning: {
      file: path.basename(fineTuning),
      entries: fineTuningEntries.length,
      internalFiles: await verifyFineTuningContents(fineTuning, {
        promotionRoot,
      }),
      sha256: fineTuningChecksum,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
