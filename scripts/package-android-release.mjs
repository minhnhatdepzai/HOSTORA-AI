import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getReleaseInfo,
  writeExternalChecksum,
  writeReleaseAssetManifest,
} from "./release-assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(
  process.argv[2] ??
    path.join(root, "mobile/android/app/build/outputs/apk/release/app-release.apk"),
);
const sourceInfo = await stat(source);
if (!sourceInfo.isFile() || sourceInfo.size < 10 * 1024 * 1024) {
  throw new Error(`APK input is missing or unexpectedly small: ${source}`);
}

const release = await getReleaseInfo(root);
const outputDirectory = path.join(root, "mobile/releases");
await mkdir(outputDirectory, { recursive: true });
const universal = path.join(outputDirectory, release.assets.apkUniversal);
const arm64Alias = path.join(outputDirectory, release.assets.apkArm64);

await copyFile(source, universal);
await copyFile(source, arm64Alias);
const universalChecksum = await writeExternalChecksum(universal);
const aliasChecksum = await writeExternalChecksum(arm64Alias);
if (universalChecksum.checksum !== aliasChecksum.checksum) {
  throw new Error("The compatibility APK alias differs from the universal APK");
}

const manifest = await writeReleaseAssetManifest(root, release, {
  apkUniversal: universal,
  apkArm64Alias: arm64Alias,
  source: path.join(root, "docs/submission", release.assets.source),
  fineTuning: path.join(
    root,
    "docs/submission",
    release.assets.fineTuning,
  ),
});

console.log(
  JSON.stringify(
    {
      version: release.version,
      universal,
      arm64Alias,
      sha256: universalChecksum.checksum,
      bytes: sourceInfo.size,
      manifest,
    },
    null,
    2,
  ),
);
