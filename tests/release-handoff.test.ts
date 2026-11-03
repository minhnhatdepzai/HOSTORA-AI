import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
});
