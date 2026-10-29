import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  runSiteStudioWorkflow: vi.fn(),
  createStudioProject: vi.fn(),
  captureSiteStudioRun: vi.fn(),
  getStudioPreferences: vi.fn(() => ({
    style: null,
    color: null,
    writingTone: "direct",
    revisionHints: [],
    needsWorkReasons: [],
    updatedAt: null,
  })),
  saveStudioPreferences: vi.fn(),
}));

vi.mock("@/lib/site-studio-workflow", () => deps);
vi.mock("@/lib/site-studio-store", () => deps);
vi.mock("@/lib/ai-observability", () => deps);
vi.mock("@/lib/customer/store", () => ({
  getCustomerStore: () => ({
    getStudioPreferences: deps.getStudioPreferences,
    saveStudioPreferences: deps.saveStudioPreferences,
  }),
}));
vi.mock("@/lib/customer/auth", () => ({
  customerFromRequest: () => ({ id: "customer-1", email: "moc@example.com" }),
  requestUsesBearer: () => true,
}));

import { POST } from "@/app/api/ai/site-studio/route";

describe("website studio generation API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a stable customer link and ZIP link with the generated preview", async () => {
    deps.runSiteStudioWorkflow.mockResolvedValue({
      brief: { headline: "Mộc Cafe: cà phê rang tại chỗ" },
      recommendations: [],
      generationMode: "template-fallback",
      notice: "Nội dung mẫu.",
    });
    deps.createStudioProject.mockResolvedValue({
      id: "123e4567-e89b-42d3-a456-426614174000",
      url: "/website-studio/p/123e4567-e89b-42d3-a456-426614174000",
      downloadUrl:
        "/api/ai/site-studio/123e4567-e89b-42d3-a456-426614174000/download",
      published: false,
      repositoryUrl: null,
      publishMessage: "GitHub chưa bật.",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/site-studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brand: "Mộc Cafe",
          idea: "Quán cà phê rang tại chỗ, yên tĩnh cho dân văn phòng.",
          business: "food",
          goal: "book",
          audience: "Dân văn phòng Quận 1",
          style: "warm",
          monthlyVisits: 5000,
          monthlyBudget: 100000,
          needsDomain: true,
          color: "#11695e",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.project.url).toBe(
      "/website-studio/p/123e4567-e89b-42d3-a456-426614174000",
    );
    expect(payload.project.downloadUrl).toContain("/download");
    expect(payload.brief.headline).toContain("Mộc Cafe");
    expect(deps.createStudioProject).toHaveBeenCalledWith(
      expect.objectContaining({ brand: "Mộc Cafe" }),
      expect.any(Object),
      "customer-1",
    );
    expect(deps.runSiteStudioWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ brand: "Mộc Cafe" }),
      expect.objectContaining({ writingTone: "direct" }),
    );
    expect(deps.saveStudioPreferences).toHaveBeenCalledWith("customer-1", {
      style: "warm",
      color: "#11695e",
    });
  });
});
