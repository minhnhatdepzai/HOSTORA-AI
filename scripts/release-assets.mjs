import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function vietnamDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getReleaseInfo(root, releaseDate = vietnamDate()) {
  const config = JSON.parse(
    await readFile(path.join(root, "mobile/app.json"), "utf8"),
  );
  const version = config.expo.version;
  return {
    version,
    releaseDate,
    assets: {
      apkUniversal: `HOSTORA-AI-${version}-universal.apk`,
      apkArm64: `HOSTORA-AI-${version}-arm64.apk`,
      source: `HOSTORA-source-${version}-${releaseDate}.zip`,
      fineTuning: `HOSTORA-finetuning-${version}-${releaseDate}.zip`,
      manifest: `HOSTORA-release-${version}-${releaseDate}.json`,
    },
  };
}

export async function sha256File(file) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

export async function writeExternalChecksum(file) {
  const checksum = await sha256File(file);
  const checksumFile = `${file}.sha256`;
  await writeFile(checksumFile, `${checksum}  ${path.basename(file)}\n`);
  return { checksum, checksumFile };
}

async function walkFiles(directory, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const child = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(directory, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function writeInternalChecksumManifest(packageRoot) {
  const manifestName = "SHA256SUMS.txt";
  const files = (await walkFiles(packageRoot))
    .filter((file) => file !== manifestName)
    .sort();
  const lines = [];
  for (const file of files) {
    lines.push(`${await sha256File(path.join(packageRoot, file))}  ${file}`);
  }
  const manifest = path.join(packageRoot, manifestName);
  await writeFile(manifest, `${lines.join("\n")}\n`);
  return { files: files.length, manifest };
}

export async function writeReleaseAssetManifest(root, info, artifactFiles) {
  const assets = {};
  for (const [kind, file] of Object.entries(artifactFiles)) {
    try {
      const details = await stat(file);
      if (!details.isFile()) continue;
      assets[kind] = {
        file: path.basename(file),
        bytes: details.size,
        sha256: await sha256File(file),
      };
    } catch {
      // A packager may run before the other artifacts exist.
    }
  }
  const output = path.join(root, "docs/submission", info.assets.manifest);
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(
    temporary,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        product: "HOSTORA AI",
        version: info.version,
        releaseDate: info.releaseDate,
        assets,
      },
      null,
      2,
    )}\n`,
  );
  await rename(temporary, output);
  return output;
}
