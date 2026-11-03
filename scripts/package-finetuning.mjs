// Package only the two latest LoRA adapters and their evidence, never duplicated base weights.
import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  getReleaseInfo,
  writeExternalChecksum,
  writeInternalChecksumManifest,
  writeReleaseAssetManifest,
} from "./release-assets.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = process.env.HOSTORA_FINETUNING_ARTIFACT_ROOT
  ? path.resolve(process.env.HOSTORA_FINETUNING_ARTIFACT_ROOT)
  : root;
const release = await getReleaseInfo(root);
const { version } = release;
const archiveName = release.assets.fineTuning;
const output = path.join(root, "docs/submission", archiveName);
const temporary = await mkdtemp(path.join(tmpdir(), "hostora-finetuning-"));
const packageRoot = path.join(temporary, `HOSTORA-finetuning-${version}`);

const copies = [
  ["training/output-chatbot-v8/adapter", "chatbot-v8/adapter"],
  ["training/output-chatbot-v8/evaluation.json", "chatbot-v8/evaluation.json"],
  ["training/output-chatbot-v8/manifest.json", "chatbot-v8/manifest.json"],
  ["training/output-chatbot-v8/promotion.json", "chatbot-v8/promotion.json"],
  ["training/runs/chatbot-v8/status.json", "chatbot-v8/status.json"],
  ["training/runs/chatbot-v8/summary.json", "chatbot-v8/summary.json"],
  ["training/configs/chatbot-v8.json", "chatbot-v8/training-config.json"],
  [
    "training/data/chatbot_v8_manifest.json",
    "chatbot-v8/dataset-manifest.json",
  ],
  ["training/output-studio-v3/adapter", "studio-v3/adapter"],
  ["training/output-studio-v3/evaluation.json", "studio-v3/evaluation.json"],
  ["training/output-studio-v3/manifest.json", "studio-v3/manifest.json"],
  ["training/output-studio-v3/promotion.json", "studio-v3/promotion.json"],
  ["training/runs/studio-v3/status.json", "studio-v3/status.json"],
  ["training/runs/studio-v3/summary.json", "studio-v3/summary.json"],
  ["training/configs/studio-v3.json", "studio-v3/training-config.json"],
  ["training/data/studio_v3_manifest.json", "studio-v3/dataset-manifest.json"],
  ["training/README.md", "training/README.md"],
  ["docs/CHATBOT_FINETUNING.md", "training/CHATBOT_FINETUNING.md"],
];

try {
  await mkdir(packageRoot, { recursive: true });
  for (const [source, target] of copies) {
    const destination = path.join(packageRoot, target);
    const sourceRoot = /training\/(?:output-|runs\/)/.test(source)
      ? artifactRoot
      : root;
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(sourceRoot, source), destination, { recursive: true });
  }
  await writeFile(
    path.join(packageRoot, "README.md"),
    `# HOSTORA fine-tuning adapters ${version}\n\n` +
      `Gói này chứa hai LoRA adapter mới nhất: chatbot-v8 và studio-v3, kèm config, manifest, đánh giá, trạng thái huấn luyện và tokenizer. Base model không được nhân bản vào ZIP; cả hai adapter khai báo base \`unsloth/Qwen3.5-4B\` trong \`adapter_config.json\`.\n\n` +
      `Đây là artifact tái lập/đánh giá, không phải bằng chứng rằng candidate đã được đưa vào production. Đọc \`promotion.json\` và tài liệu trong thư mục \`training/\` trước khi merge/export. Source ZIP của cùng release chứa toàn bộ script, dataset train/holdout, test và Modelfile.\n`,
  );
  await writeInternalChecksumManifest(packageRoot);
  await rm(output, { force: true });
  await execFileAsync(
    "zip",
    ["-q", "-r", "-9", output, path.basename(packageRoot)],
    {
      cwd: temporary,
    },
  );
  const { checksumFile } = await writeExternalChecksum(output);
  const manifest = await writeReleaseAssetManifest(root, release, {
    source: path.join(root, "docs/submission", release.assets.source),
    fineTuning: output,
  });
  console.log(output);
  console.log(checksumFile);
  console.log(manifest);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
