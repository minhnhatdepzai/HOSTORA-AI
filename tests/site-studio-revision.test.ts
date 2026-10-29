import { beforeEach, expect, test, vi } from "vitest";
import { buildFallbackBrief, type SiteIdea } from "@/lib/site-studio";

const deps = vi.hoisted(() => ({
  structuredChat: vi.fn(),
  auditSiteBrief: vi.fn(),
  getStudioProject: vi.fn(),
  saveStudioProject: vi.fn(),
  publishStudioProjectUpdate: vi.fn(),
  isStudioProjectOwner: vi.fn(() => true),
  saveStudioPreferences: vi.fn(),
}));

vi.mock("@/lib/ollama", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ollama")>();
  return { ...original, structuredChat: deps.structuredChat };
});
vi.mock("@/lib/site-studio-workflow", () => ({
  auditSiteBrief: deps.auditSiteBrief,
}));
vi.mock("@/lib/site-studio-store", () => deps);
vi.mock("@/lib/customer/store", () => ({
  getCustomerStore: () => ({
    saveStudioPreferences: deps.saveStudioPreferences,
  }),
}));
vi.mock("@/lib/customer/auth", () => ({
  customerFromRequest: () => ({ id: "customer-1", email: "moc@example.com" }),
  requestUsesBearer: () => true,
}));

import { POST } from "@/app/api/ai/site-studio/[id]/route";

const idea: SiteIdea = {
  brand: "Mộc An",
  idea: "Xưởng giới thiệu bộ sưu tập gốm thủ công.",
  business: "retail",
  goal: "showcase",
  audience: "người yêu đồ gốm",
  style: "warm",
  monthlyVisits: 5000,
  monthlyBudget: 150000,
  needsDomain: false,
  color: "#965f40",
};
const project = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  idea,
  brief: buildFallbackBrief(idea),
  generationMode: "template-fallback" as const,
  writingTone: "direct" as const,
  revisionCount: 0,
  createdAt: "2026-10-26T00:00:00.000Z",
  updatedAt: "2026-10-26T00:00:00.000Z",
  ownerCustomerId: "customer-1",
};

function request(message: string) {
  return new Request(`http://localhost/api/ai/site-studio/${project.id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.getStudioProject.mockResolvedValue(project);
  deps.saveStudioProject.mockImplementation(async (value) => value);
  deps.publishStudioProjectUpdate.mockImplementation(async (value) => value);
});

test("customer revision is saved only after the content audit", async () => {
  const revised = {
    ...project.brief,
    headline: "Mộc An giới thiệu gốm thủ công",
  };
  deps.structuredChat.mockResolvedValueOnce(revised);
  deps.auditSiteBrief.mockResolvedValueOnce(true);

  const response = await POST(request("Đổi tiêu đề ngắn hơn"), {
    params: Promise.resolve({ id: project.id }),
  });

  expect(response.status).toBe(200);
  expect((await response.json()).brief.headline).toBe(revised.headline);
  expect(deps.auditSiteBrief).toHaveBeenCalledWith(
    idea,
    revised,
    "Đổi tiêu đề ngắn hơn",
  );
  expect(deps.saveStudioProject).toHaveBeenCalledWith(
    expect.objectContaining({ revisionCount: 1, brief: revised }),
  );
  expect(deps.saveStudioPreferences).toHaveBeenCalledWith("customer-1", {
    revisionHint: "Đổi tiêu đề ngắn hơn",
  });
});

test("unsupported revision does not replace the saved website", async () => {
  deps.structuredChat.mockResolvedValueOnce({
    ...project.brief,
    aboutCopy: "Mộc An bán nhiều mẫu gốm thủ công với dịch vụ phục vụ chu đáo.",
  });
  deps.auditSiteBrief.mockResolvedValueOnce(false);

  const response = await POST(request("Đổi tiêu đề ngắn hơn"), {
    params: Promise.resolve({ id: project.id }),
  });

  expect(response.status).toBe(422);
  expect(deps.saveStudioProject).not.toHaveBeenCalled();
});
