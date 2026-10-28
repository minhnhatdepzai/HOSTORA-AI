import { beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";

const store = vi.hoisted(() => ({
  getStudioProject: vi.fn(),
  renderStudioProject: vi.fn(),
  isStudioProjectOwner: vi.fn(() => true),
}));

vi.mock("@/lib/site-studio-store", () => store);
vi.mock("@/lib/customer/auth", () => ({
  customerFromRequest: () => ({ id: "customer-1", email: "moc@example.com" }),
}));

import { GET } from "@/app/api/ai/site-studio/[id]/download/route";

describe("website studio ZIP download", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a ZIP containing the generated page and setup notes", async () => {
    store.getStudioProject.mockResolvedValue({
      id: "123e4567-e89b-42d3-a456-426614174000",
      idea: { brand: "Mộc Cafe" },
      ownerCustomerId: "customer-1",
    });
    store.renderStudioProject.mockReturnValue(
      "<!doctype html><title>Mộc Cafe</title>",
    );

    const response = await GET(new Request("http://localhost/download"), {
      params: Promise.resolve({ id: "123e4567-e89b-42d3-a456-426614174000" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    expect(strFromU8(files["index.html"])).toContain("Mộc Cafe");
    expect(strFromU8(files["README.md"])).toContain("HOSTORA Studio");
    expect(files["vendor/three.module.js"]).toBeTruthy();
    expect(files["vendor/three.core.js"]).toBeTruthy();
    expect(files["vendor/gsap.min.js"]).toBeTruthy();
    expect(files["vendor/ScrollTrigger.min.js"]).toBeTruthy();
    expect(files["vendor/anime.esm.min.js"]).toBeTruthy();
    expect(files["vendor/ANIME-LICENSE.txt"]).toBeTruthy();
  });

  it("returns a clear 404 when the project link is invalid", async () => {
    store.getStudioProject.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/download"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
  });
});
