import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { buildFallbackBrief, type SiteIdea } from "@/lib/site-studio";
import { saveStudioProject } from "@/lib/site-studio-store";

test("website created by HOSTORA exposes and shares its stable viewing link", async ({
  page,
  baseURL,
}) => {
  const idea: SiteIdea = {
    brand: "Mộc An E2E",
    idea: "Trang giới thiệu sản phẩm gốm thủ công.",
    business: "retail",
    goal: "showcase",
    audience: "Người yêu sản phẩm thủ công",
    style: "warm",
    monthlyVisits: 2_000,
    monthlyBudget: 300_000,
    needsDomain: true,
    color: "#8A5C42",
  };
  const id = randomUUID();
  const now = new Date().toISOString();
  await saveStudioProject({
    id,
    ownerCustomerId: "e2e-customer",
    idea,
    brief: buildFallbackBrief(idea),
    generationMode: "template-fallback",
    createdAt: now,
    updatedAt: now,
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload: ShareData) => {
        (window as Window & { __hostoraSharedUrl?: string }).__hostoraSharedUrl =
          payload.url?.toString();
      },
    });
  });

  const path = `/website-studio/p/${id}`;
  const expectedUrl = new URL(path, baseURL).toString();
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Mộc An E2E" }),
  ).toBeVisible();
  await expect(page.getByLabel("Link xem website")).toHaveValue(expectedUrl);
  await page.getByRole("button", { name: "Chia sẻ link website" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __hostoraSharedUrl?: string })
            .__hostoraSharedUrl,
      ),
    )
    .toBe(expectedUrl);
});
