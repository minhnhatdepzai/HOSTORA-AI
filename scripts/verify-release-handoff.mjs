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

function assertSafeEntries(entries, kind) {
  const bad = entries.filter(
    (entry) =>
      entry.startsWith("/") ||
      entry.split("/").includes("..") ||
      /(^|\/)(node_modules|\.next|\.git|\.venv|runtime|releases)(\/|$)/i.test(
        entry,
      ) ||
      /\.(?:sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?|pem|p12|jks|keystore)$/i.test(
        entry,
      ),
  );
  if (kind === "source") {
    bad.push(
      ...entries.filter(
        (entry) =>
          /^docs\/submission\/HOSTORA-(?:release-[^/]+\.json|[^/]+\.zip\.sha256)$/i.test(
            entry,
          ) ||
          /(^|\/)(checkpoint-\d+|gguf(?:_gguf)?|output-[^/]+)(\/|$)/i.test(
            entry,
          ) || /\.(?:gguf|safetensors|apk)$/i.test(entry),
      ),
    );
  } else {
    bad.push(
      ...entries.filter(
        (entry) =>
          /(^|\/)(checkpoint-\d+|gguf(?:_gguf)?)(\/|$)/i.test(entry) ||
          /\.(?:gguf|apk)$/i.test(entry),
      ),
    );
  }
  if (bad.length) {
    throw new Error(`${kind} archive has forbidden entries: ${[...new Set(bad)].join(", ")}`);
  }
}

function requireEntries(entries, required, kind) {
  const missing = required.filter(
    (requiredEntry) =>
      !entries.some(
        (entry) => entry === requiredEntry || entry.endsWith(`/${requiredEntry}`),
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
  }
  return files;
}

async function verifyFineTuningContents(archive) {
  const temporary = await mkdtemp(path.join(tmpdir(), "hostora-release-check-"));
  try {
    await execFileAsync("unzip", ["-q", archive, "-d", temporary]);
    const roots = await readdir(temporary, { withFileTypes: true });
    const directories = roots.filter((entry) => entry.isDirectory());
    if (directories.length !== 1) throw new Error("Fine-tuning ZIP must have one root");
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
      if (!expected || (await sha256File(path.join(packageRoot, file))) !== expected) {
        throw new Error(`Internal checksum mismatch: ${file}`);
      }
    }
    for (const candidate of ["chatbot-v8", "studio-v3"]) {
      const archived = JSON.parse(
        await readFile(path.join(packageRoot, candidate, "promotion.json"), "utf8"),
      );
      const local = JSON.parse(
        await readFile(
          path.join(root, `training/output-${candidate}/promotion.json`),
          "utf8",
        ),
      );
      if (JSON.stringify(archived) !== JSON.stringify(local)) {
        throw new Error(`${candidate} promotion evidence changed while packaging`);
      }
      if (archived.status !== "candidate" || archived.automatic_promotion !== false) {
        throw new Error(`${candidate} must remain an explicitly unpromoted candidate`);
      }
    }
    return files.length;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const release = await getReleaseInfo(root);
const source = path.resolve(
  argument("--source") ??
    path.join(root, "docs/submission", release.assets.source),
);
const fineTuning = path.resolve(
  argument("--finetuning") ??
    path.join(root, "docs/submission", release.assets.fineTuning),
);

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

const result = {
  version: release.version,
  source: {
    file: path.basename(source),
    entries: sourceEntries.length,
    sha256: await verifyExternalChecksum(source),
  },
  fineTuning: {
    file: path.basename(fineTuning),
    entries: fineTuningEntries.length,
    internalFiles: await verifyFineTuningContents(fineTuning),
    sha256: await verifyExternalChecksum(fineTuning),
  },
};
console.log(JSON.stringify(result, null, 2));
