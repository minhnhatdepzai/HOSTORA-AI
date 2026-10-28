import { beforeEach, expect, test, vi } from "vitest";
import { buildFallbackBrief, type SiteIdea } from "@/lib/site-studio";

const mocked = vi.hoisted(() => ({ structuredChat: vi.fn() }));
vi.mock("@/lib/ollama", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ollama")>();
  return { ...original, structuredChat: mocked.structuredChat };
});

import { runSiteStudioWorkflow } from "@/lib/site-studio-workflow";

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

beforeEach(() => mocked.structuredChat.mockReset());

test("accepts a grounded draft only after the local content audit", async () => {
  const draft = buildFallbackBrief(idea);
  mocked.structuredChat
    .mockResolvedValueOnce(draft)
    .mockResolvedValueOnce({ supported: true, issues: [] });

  const result = await runSiteStudioWorkflow(idea);
  expect(result.generationMode).toBe("local-ai");
  expect(result.brief).toEqual(draft);
  expect(mocked.structuredChat).toHaveBeenCalledTimes(2);
  expect(mocked.structuredChat.mock.calls[1][4]).toBe("site_studio_copy_audit");
});

test("rejects a draft when audit detects unsupported business claims", async () => {
  const draft = {
    ...buildFallbackBrief(idea),
    aboutCopy:
      "Xưởng giới thiệu bộ sưu tập gốm thủ công cho người yêu đồ gốm. Chúng tôi phục vụ tận tâm.",
  };
  mocked.structuredChat.mockResolvedValueOnce(draft).mockResolvedValueOnce({
    supported: false,
    issues: ["Chưa có căn cứ cho cách phục vụ"],
  });

  const result = await runSiteStudioWorkflow(idea);
  expect(result.generationMode).toBe("template-fallback");
  expect(result.brief).toEqual(buildFallbackBrief(idea));
});

test("rejects obvious unsupported promises before asking the audit model", async () => {
  const draft = {
    ...buildFallbackBrief(idea),
    headline: "Mộc An cam kết gốm bền nhiều năm",
  };
  mocked.structuredChat.mockResolvedValueOnce(draft);

  const result = await runSiteStudioWorkflow(idea);
  expect(result.generationMode).toBe("template-fallback");
  expect(mocked.structuredChat).toHaveBeenCalledTimes(2);
  expect(mocked.structuredChat.mock.calls[1][4]).toBe("site_studio_copy_repair");
});

test("repairs unsupported copy before accepting a grounded result", async () => {
  const draft = {
    ...buildFallbackBrief(idea),
    subheadline: "Không gian ấm cúng giúp khách không bị gián đoạn khi xem gốm.",
  };
  const repaired = buildFallbackBrief(idea);
  mocked.structuredChat
    .mockResolvedValueOnce(draft)
    .mockResolvedValueOnce(repaired)
    .mockResolvedValueOnce({ supported: true, issues: [] });
  const result = await runSiteStudioWorkflow(idea);
  expect(result.generationMode).toBe("local-ai");
  expect(result.brief).toEqual(repaired);
  expect(mocked.structuredChat.mock.calls[1][4]).toBe("site_studio_copy_repair");
});
