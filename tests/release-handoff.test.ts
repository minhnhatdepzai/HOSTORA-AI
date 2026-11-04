import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ComposePort = {
  host_ip?: string;
  published?: string;
  target: number;
};

type ComposeVolume = {
  source: string;
  target: string;
  type: string;
};

type ComposeService = {
  environment?: Record<string, string>;
  gpus?: unknown;
  ports?: ComposePort[];
  volumes?: ComposeVolume[];
};

type ComposeConfig = {
  services: Record<string, ComposeService>;
  volumes: Record<string, unknown>;
};

const root = path.resolve(import.meta.dirname, "..");
const verifierModulePath = "../scripts/verify-release-handoff.mjs";

function composeConfig(files = ["compose.yaml"]): ComposeConfig {
  const args = ["compose"];
  for (const file of files) args.push("-f", file);
  args.push("config", "--format", "json");
  const output = execFileSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HOSTORA_ADMIN_SESSION_SECRET:
        "test-only-session-secret-with-at-least-32-characters",
    },
  });
  return JSON.parse(output) as ComposeConfig;
}

describe("portable release handoff", () => {
  it("excludes local worktrees and generated output from Docker builds", () => {
    const dockerignore = readFileSync(path.join(root, ".dockerignore"), "utf8");

    expect(dockerignore).toMatch(/^\.worktrees\/?$/m);
    expect(dockerignore).toMatch(/^output\/?$/m);
  });

  it("keeps shell entrypoints LF-safe on Windows checkouts", () => {
    const attributesPath = path.join(root, ".gitattributes");
    const sourcePackager = readFileSync(
      path.join(root, "scripts/package-submission.mjs"),
      "utf8",
    );
    const dockerfile = readFileSync(path.join(root, "Dockerfile"), "utf8");

    expect(existsSync(attributesPath)).toBe(true);
    expect(readFileSync(attributesPath, "utf8")).toMatch(
      /^\*\.sh text eol=lf$/m,
    );
    expect(sourcePackager).toContain('".gitattributes"');
    expect(dockerfile).toContain("sed -i 's/\\r$//' docker/entrypoint.sh");
  });

  it("excludes local worktrees from the release lint gate", () => {
    const eslintConfig = readFileSync(
      path.join(root, "eslint.config.mjs"),
      "utf8",
    );
    expect(eslintConfig).toContain('".worktrees/**"');
  });

  it("keeps the CPU stack GPU-optional and Ollama loopback-only", () => {
    const config = composeConfig();
    const ollama = config.services.ollama;

    expect(ollama.gpus).toBeUndefined();
    expect(ollama.ports).toContainEqual(
      expect.objectContaining({
        host_ip: "127.0.0.1",
        published: "11434",
        target: 11434,
      }),
    );
    expect(ollama.ports).toContainEqual(
      expect.objectContaining({ published: "3000", target: 3000 }),
    );
  });

  it("persists every server-side runtime store in one named volume", () => {
    const config = composeConfig();
    const web = config.services.web;

    expect(web.volumes).toContainEqual(
      expect.objectContaining({
        source: "runtime_data",
        target: "/app/data/runtime",
        type: "volume",
      }),
    );
    expect(web.environment).toMatchObject({
      HOSTORA_CATALOG_DB_PATH: "/app/data/runtime/catalog.sqlite",
      HOSTORA_PAYMENTS_DB_PATH: "/app/data/runtime/payments.sqlite",
      RAG_INDEX_PATH: "/app/data/runtime/rag-index.json",
    });
    expect(config.volumes).toHaveProperty("runtime_data");
  });

  it("provides a local admin mailbox without a stale release URL", () => {
    const config = composeConfig();
    const web = config.services.web;

    expect(config.services).toHaveProperty("mailpit");
    expect(web.environment).toMatchObject({
      HOSTORA_ADMIN_SESSION_SECRET:
        "test-only-session-secret-with-at-least-32-characters",
      HOSTORA_ORDER_NOTIFICATION_EMAIL: "admin@hostora.local",
      HOSTORA_SMTP_HOST: "mailpit",
      HOSTORA_SMTP_PORT: "1025",
    });
    expect(web.environment?.HOSTORA_RELEASE_BASE_URL).toBe(
      "https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download",
    );
  });

  it("adds NVIDIA only through the explicit GPU override", () => {
    const config = composeConfig(["compose.yaml", "compose.gpu.yaml"]);
    expect(config.services.ollama.gpus).toEqual([{ count: -1 }]);
  });

  it("derives every release asset name from the mobile version", async () => {
    // @ts-expect-error Node release helpers are plain ESM scripts, not TS modules.
    const { getReleaseInfo } = await import("../scripts/release-assets.mjs");
    const info = await getReleaseInfo(root, "2026-11-03");
    const app = JSON.parse(
      readFileSync(path.join(root, "mobile/app.json"), "utf8"),
    ) as { expo: { version: string } };

    expect(info.version).toBe(app.expo.version);
    expect(info.assets).toMatchObject({
      apkUniversal: `HOSTORA-AI-${info.version}-universal.apk`,
      fineTuning: `HOSTORA-finetuning-${info.version}-2026-11-03.zip`,
      source: `HOSTORA-source-${info.version}-2026-11-03.zip`,
    });
  });

  it("requires external and internal checksums plus an archive verifier", () => {
    const sourcePackager = readFileSync(
      path.join(root, "scripts/package-submission.mjs"),
      "utf8",
    );
    const fineTuningPackager = readFileSync(
      path.join(root, "scripts/package-finetuning.mjs"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(sourcePackager).toContain("writeExternalChecksum");
    expect(sourcePackager).toContain("zip\\.sha256");
    expect(fineTuningPackager).toContain("writeInternalChecksumManifest");
    expect(packageJson.scripts["release:verify"]).toBe(
      "node scripts/verify-release-handoff.mjs",
    );
    expect(packageJson.scripts["package:android"]).toBe(
      "node scripts/package-android-release.mjs",
    );
    expect(
      existsSync(path.join(root, "scripts/verify-release-handoff.mjs")),
    ).toBe(true);
    expect(
      existsSync(path.join(root, "scripts/package-android-release.mjs")),
    ).toBe(true);
  });

  it("rejects secret and cross-platform traversal entries", async () => {
    const { assertSafeEntries } = await import(verifierModulePath);
    expect(typeof assertSafeEntries).toBe("function");
    const unsafe = [
      ".env.local",
      "private.key",
      "..\\outside\\model.json",
      "C:\\outside\\model.json",
      "\\\\server\\share\\model.json",
    ];
    for (const entry of unsafe) {
      expect(() => assertSafeEntries([entry], "source")).toThrow();
    }
    expect(() =>
      assertSafeEntries(
        ["HOSTORA-finetuning-2.2.2/chatbot-v8/adapter/base.safetensors"],
        "fine-tuning",
      ),
    ).toThrow();
  });

  it("verifies candidate promotions without ignored publisher files", async () => {
    const temporary = mkdtempSync(path.join(tmpdir(), "hostora-clean-verify-"));
    try {
      const packageName = "HOSTORA-finetuning-2.2.2";
      const packageRoot = path.join(temporary, packageName);
      const promotion = JSON.stringify({
        status: "candidate",
        automatic_promotion: false,
        gate_passed: false,
      });
      for (const candidate of ["chatbot-v8", "studio-v3"]) {
        const directory = path.join(packageRoot, candidate);
        mkdirSync(directory, { recursive: true });
        writeFileSync(path.join(directory, "promotion.json"), promotion);
      }
      const files = ["chatbot-v8/promotion.json", "studio-v3/promotion.json"];
      const manifest = files
        .map((file) => {
          const digest = createHash("sha256")
            .update(readFileSync(path.join(packageRoot, file)))
            .digest("hex");
          return `${digest}  ${file}`;
        })
        .join("\n");
      writeFileSync(path.join(packageRoot, "SHA256SUMS.txt"), `${manifest}\n`);
      const archive = path.join(temporary, "candidate.zip");
      execFileSync("zip", ["-q", "-r", archive, packageName], {
        cwd: temporary,
      });

      const { verifyFineTuningContents } = await import(verifierModulePath);
      await expect(verifyFineTuningContents(archive)).resolves.toBe(2);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("warns that deleting Docker volumes removes application data", () => {
    const documentation = readFileSync(
      path.join(root, "docs/DOCKER_DEPLOYMENT.md"),
      "utf8",
    );
    expect(documentation).toMatch(
      /tài khoản, hội thoại,\s+đơn hàng, Website Studio/,
    );
  });

  it("keeps the mobile release metadata aligned across config and native Android", () => {
    const app = JSON.parse(
      readFileSync(path.join(root, "mobile/app.json"), "utf8"),
    ) as { expo: { version: string; android: { versionCode: number } } };
    const mobilePackage = JSON.parse(
      readFileSync(path.join(root, "mobile/package.json"), "utf8"),
    ) as { version: string };
    const nativeGradle = path.join(root, "mobile/android/app/build.gradle");
    expect(mobilePackage.version).toBe(app.expo.version);
    expect(app.expo.android.versionCode).toBeGreaterThan(0);
    if (existsSync(nativeGradle)) {
      const gradle = readFileSync(nativeGradle, "utf8");
      expect(gradle).toContain(`versionCode ${app.expo.android.versionCode}`);
      expect(gradle).toContain(`versionName "${app.expo.version}"`);
    }
  });
});
