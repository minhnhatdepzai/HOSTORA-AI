import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SiteBrief, SiteIdea } from "@/lib/site-studio";
import {
  buildPreviewHtml,
  siteBriefSchema,
  siteIdeaSchema,
} from "@/lib/site-studio";
import { pushStudioProjectToGitHub } from "@/lib/site-studio-github";

export type StoredStudioProject = {
  id: string;
  idea: SiteIdea;
  brief: SiteBrief;
  generationMode: "local-ai" | "template-fallback";
  createdAt: string;
  updatedAt: string;
  writingTone?: "friendly" | "premium" | "direct";
  revisionCount?: number;
  repositoryUrl?: string;
  publishMessage?: string;
};

export type StudioFeedback = {
  rating: "helpful" | "needs_work";
  reason: "visual" | "copy" | "navigation" | "business_fit" | "other";
};

const storageRoot = path.join(process.cwd(), "data", "runtime", "site-studio");
const projectIdSchema =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function projectPath(id: string) {
  if (!projectIdSchema.test(id)) throw new Error("Mã website không hợp lệ.");
  return path.join(storageRoot, `${id}.json`);
}

export async function saveStudioProject(project: StoredStudioProject) {
  const destination = projectPath(project.id);
  await mkdir(storageRoot, { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(project), { mode: 0o600 });
  await rename(temporary, destination);
  return project;
}

export async function saveStudioFeedback(
  project: StoredStudioProject,
  feedback: StudioFeedback,
) {
  const directory = path.join(storageRoot, "feedback");
  await mkdir(directory, { recursive: true });
  const event = {
    id: randomUUID(),
    projectId: project.id,
    createdAt: new Date().toISOString(),
    rating: feedback.rating,
    reason: feedback.reason,
    generationMode: project.generationMode,
    revisionCount: project.revisionCount ?? 0,
    style: project.idea.style,
  };
  await writeFile(
    path.join(directory, `${event.id}.json`),
    JSON.stringify(event),
    {
      flag: "wx",
      mode: 0o600,
    },
  );
  return event;
}

export async function getStudioProject(id: string) {
  try {
    const value = JSON.parse(
      await readFile(projectPath(id), "utf8"),
    ) as unknown;
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<StoredStudioProject>;
    const idea = siteIdeaSchema.safeParse(candidate.idea);
    const brief = siteBriefSchema.safeParse(candidate.brief);
    if (
      candidate.id !== id ||
      !idea.success ||
      !brief.success ||
      (candidate.generationMode !== "local-ai" &&
        candidate.generationMode !== "template-fallback") ||
      typeof candidate.createdAt !== "string" ||
      typeof candidate.updatedAt !== "string"
    )
      return null;
    if (
      candidate.writingTone !== undefined &&
      !["friendly", "premium", "direct"].includes(candidate.writingTone)
    )
      return null;
    if (
      candidate.revisionCount !== undefined &&
      (!Number.isInteger(candidate.revisionCount) ||
        candidate.revisionCount < 0)
    )
      return null;
    return candidate as StoredStudioProject;
  } catch {
    return null;
  }
}

export async function createStudioProject(
  idea: SiteIdea,
  result: {
    brief: SiteBrief;
    generationMode: StoredStudioProject["generationMode"];
  },
) {
  const now = new Date().toISOString();
  const project = await saveStudioProject({
    id: randomUUID(),
    idea,
    brief: result.brief,
    generationMode: result.generationMode,
    writingTone: "direct",
    revisionCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  let published = false;
  let repositoryUrl: string | undefined;
  let publishMessage =
    "Kho mã GitHub riêng sẽ xuất hiện tại đây sau khi quản trị viên kết nối GitHub.";
  if (process.env.HOSTORA_STUDIO_GITHUB_ENABLED === "true") {
    try {
      repositoryUrl = await pushStudioProjectToGitHub(project);
      published = true;
      publishMessage = "Website đã được đẩy lên repo GitHub riêng.";
    } catch {
      publishMessage =
        "Chưa đẩy được lên GitHub; link xem và file ZIP vẫn dùng được.";
    }
  }
  const saved = await saveStudioProject({
    ...project,
    repositoryUrl,
    publishMessage,
  });
  return {
    id: saved.id,
    url: `/website-studio/p/${saved.id}`,
    downloadUrl: `/api/ai/site-studio/${saved.id}/download`,
    published,
    repositoryUrl: repositoryUrl ?? null,
    publishMessage,
  };
}

export async function publishStudioProjectUpdate(project: StoredStudioProject) {
  if (process.env.HOSTORA_STUDIO_GITHUB_ENABLED !== "true") return project;
  try {
    const repositoryUrl = await pushStudioProjectToGitHub({
      ...project,
      repositoryUrl: project.repositoryUrl,
    });
    return saveStudioProject({
      ...project,
      repositoryUrl,
      publishMessage: "Đã đồng bộ nội dung mới lên repo GitHub.",
    });
  } catch {
    return saveStudioProject({
      ...project,
      publishMessage:
        "Đã lưu thay đổi trên HOSTORA, nhưng chưa đồng bộ được lên GitHub.",
    });
  }
}

export function renderStudioProject(project: StoredStudioProject) {
  return buildPreviewHtml(project.idea, project.brief, "./vendor");
}
