import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SiteBrief, SiteIdea } from "@/lib/site-studio";
import { buildPreviewHtml } from "@/lib/site-studio";

const execFileAsync = promisify(execFile);
const run = (command: string, args: string[], cwd?: string) =>
  execFileAsync(command, args, {
    cwd,
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });

function slug(value: string) {
  return (
    value
      .toLocaleLowerCase("vi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 35) || "website"
  );
}

export async function pushStudioProjectToGitHub(input: {
  id: string;
  idea: SiteIdea;
  brief: SiteBrief;
  repositoryUrl?: string;
}) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "hostora-studio-"));
  try {
    const repoUrl = input.repositoryUrl;
    const folder = repoUrl ? path.join(temp, "repo") : temp;
    if (repoUrl) await run("gh", ["repo", "clone", repoUrl, folder]);
    await mkdir(folder, { recursive: true });
    await writeFile(
      path.join(folder, "index.html"),
      buildPreviewHtml(input.idea, input.brief),
      { mode: 0o600 },
    );
    await writeFile(
      path.join(folder, "README.md"),
      `# ${input.idea.brand}\n\nWebsite tĩnh được tạo bằng HOSTORA Studio. Kiểm tra nội dung, thông tin liên hệ và các điều khoản trước khi xuất bản.\n`,
    );

    if (!repoUrl) {
      const owner =
        process.env.HOSTORA_STUDIO_GITHUB_OWNER?.trim() ||
        (await run("gh", ["api", "user", "--jq", ".login"])).stdout.trim();
      if (!/^[A-Za-z0-9-]{1,39}$/.test(owner))
        throw new Error("GitHub owner chưa hợp lệ.");
      const name = `hostora-${slug(input.idea.brand)}-${input.id.slice(0, 8)}`;
      await run("git", ["init", "-b", "main"], folder);
      await run("git", ["config", "user.name", "HOSTORA Studio"], folder);
      await run(
        "git",
        ["config", "user.email", "studio@hostora.local"],
        folder,
      );
      await run("git", ["add", "index.html", "README.md"], folder);
      await run(
        "git",
        ["commit", "-m", "Create customer website with HOSTORA Studio"],
        folder,
      );
      const created = await run("gh", [
        "repo",
        "create",
        `${owner}/${name}`,
        "--private",
        "--source",
        folder,
        "--remote",
        "origin",
        "--push",
      ]);
      const url = created.stdout.match(
        /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/,
      )?.[0];
      if (!url) throw new Error("GitHub chưa trả link repository.");
      return url;
    }

    await run("git", ["config", "user.name", "HOSTORA Studio"], folder);
    await run("git", ["config", "user.email", "studio@hostora.local"], folder);
    await run("git", ["add", "index.html", "README.md"], folder);
    const status = (
      await run("git", ["status", "--porcelain"], folder)
    ).stdout.trim();
    if (status) {
      await run(
        "git",
        ["commit", "-m", "Update customer website from HOSTORA Studio"],
        folder,
      );
      await run("git", ["push"], folder);
    }
    return repoUrl;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
