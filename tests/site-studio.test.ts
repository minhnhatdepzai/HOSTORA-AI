import { expect, test } from "vitest";
import {
  buildFallbackBrief,
  buildCompactPreviewHtml,
  buildPreviewHtml,
  recommendedPlansForIdea,
  requirementsFromIdea,
  siteBriefSchema,
  siteIdeaSchema,
  unsupportedStudioClaims,
  type SiteIdea,
} from "@/lib/site-studio";

const idea: SiteIdea = {
  brand: "Mộc Cafe",
  idea: "Quán cà phê yên tĩnh có menu và chỗ đặt bàn cho khách.",
  business: "food",
  goal: "book",
  audience: "dân văn phòng ở trung tâm",
  style: "warm",
  monthlyVisits: 5000,
  monthlyBudget: 100000,
  needsDomain: true,
  color: "#b85c38",
};

test("site idea input accepts custom hex colors and rejects unsafe values", () => {
  expect(siteIdeaSchema.safeParse(idea).success).toBe(true);
  expect(
    siteIdeaSchema.safeParse({ ...idea, color: "red;}</style><script>" })
      .success,
  ).toBe(false);
  expect(siteIdeaSchema.safeParse({ ...idea, color: "#12abEF" }).success).toBe(
    true,
  );
  expect(
    siteIdeaSchema.safeParse({ ...idea, idea: "x".repeat(1001) }).success,
  ).toBe(false);
});

test("fallback copy stays within the schema for maximum length customer input", () => {
  const longIdea = { ...idea, brand: "A".repeat(60), idea: "B".repeat(500) };
  const brief = buildFallbackBrief(longIdea);
  const parsed = siteBriefSchema.safeParse(brief);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues));
  expect(brief.aboutCopy).toContain(longIdea.brand);
});

test("fallback uses separate customer facts across the story, offer and next step", () => {
  const described = {
    ...idea,
    idea: "Quán cà phê yên tĩnh cho người làm việc gần văn phòng. Menu có cà phê pha máy và đồ uống không cà phê. Khách xem ảnh không gian rồi gửi yêu cầu đặt bàn.",
  };
  const brief = buildFallbackBrief(described);
  expect(brief.subheadline).toContain("Quán cà phê yên tĩnh");
  expect(brief.offerCopy).toContain("Menu có cà phê pha máy");
  expect(brief.audienceCopy).toContain("Khách xem ảnh không gian");
  expect(brief.offerCopy).not.toContain("Nội dung chi tiết");
});

test("structured customer details shape different chapters without invented claims", () => {
  const described = {
    ...idea,
    story: "Tôi bắt đầu quán khi cần một chỗ yên tĩnh để đọc sách sau giờ làm.",
    offerings: "Menu có cà phê pha máy và trà nóng.",
    customerAction: "Khách xem menu rồi gửi yêu cầu đặt bàn.",
  };
  expect(siteIdeaSchema.safeParse(described).success).toBe(true);
  const brief = buildFallbackBrief(described);
  expect(brief.aboutCopy).toContain("đọc sách sau giờ làm");
  expect(brief.offerCopy).toContain("trà nóng");
  expect(brief.audienceCopy).toContain("gửi yêu cầu đặt bàn");
  expect(unsupportedStudioClaims(described, brief)).toEqual([]);
  const html = buildPreviewHtml(described, brief);
  expect(html).toContain('data-reveal-words');
  expect(html).toContain("window.__siteMotion.chapter = chapter");
  expect(html).toContain("satellite.position.x");
});

test("short optional details still produce a valid fallback brief", () => {
  const brief = buildFallbackBrief({
    ...idea,
    story: "A",
    offerings: "Ly",
    customerAction: "Xem",
    audience: "mọi",
    idea: "Tôi bán cà phê.",
  });
  expect(siteBriefSchema.safeParse(brief).success).toBe(true);
});

test("compact preview is a seamless local cinematic website", () => {
  const html = buildCompactPreviewHtml(idea, buildFallbackBrief(idea));
  expect(html).toContain('href="#gioi-thieu"');
  expect(html).toContain('href="#lien-he"');
  expect(html).toContain('id="studio-webgl"');
  expect(html).toContain("/vendor/three.module.js");
  expect(html).toContain("/vendor/gsap.min.js");
  expect(html).toContain("ScrollTrigger");
  expect(html).toContain("/vendor/anime.esm.min.js");
  expect(html).toContain('id="cho-ban"');
  expect(html).toContain('class="ambient-stage"');
  expect(html).toContain('class="interlude"');
});

test("light custom colors keep preview buttons legible", () => {
  const lightIdea = { ...idea, color: "#ffffff" };
  const html = buildPreviewHtml(lightIdea, buildFallbackBrief(lightIdea));
  expect(html).toContain("--accent-ink:#102831");
  expect(html).not.toContain("được tạo để khác biệt");
});

test("studio flags product promises absent from the customer's brief", () => {
  const brief = buildFallbackBrief(idea);
  const embellished = {
    ...brief,
    features: [
      {
        title: "Độ bền vượt thời gian",
        copy: "Đảm bảo giữ màu qua nhiều năm sử dụng.",
      },
      ...brief.features.slice(1),
    ],
  };
  expect(unsupportedStudioClaims(idea, embellished)).toEqual(
    expect.arrayContaining(["đảm bảo", "bền", "nhiều năm"]),
  );
  expect(
    unsupportedStudioClaims(idea, {
      ...brief,
      aboutCopy:
        "Chúng tôi chuyên thu gom sản phẩm và là điểm đến tin cậy cho mọi người.",
    }),
  ).toEqual(expect.arrayContaining(["thu gom", "tin cậy"]));
  expect(
    unsupportedStudioClaims(idea, {
      ...brief,
      subheadline: "Không gian ấm cúng giúp bạn tập trung và giữ nhịp sống cân bằng.",
    }),
  ).toEqual(expect.arrayContaining(["ấm cúng", "giữ nhịp sống cân bằng"]));
});

test("hosting requirements stay deterministic and separate from generated copy", () => {
  expect(requirementsFromIdea(idea)).toMatchObject({
    websiteType: "company",
    monthlyVisits: 5000,
    monthlyBudget: 100000,
    needsDomain: true,
    ecommerce: false,
  });
  expect(
    requirementsFromIdea({
      ...idea,
      monthlyVisits: 23750,
      monthlyBudget: 475000,
    }),
  ).toMatchObject({ monthlyVisits: 23750, monthlyBudget: 475000 });
  const recommendations = recommendedPlansForIdea(idea);
  expect(recommendations).toHaveLength(3);
  expect(recommendations[0].total).toBeGreaterThanOrEqual(
    recommendations[1].total,
  );
});

test("downloadable preview escapes customer content before trusted animation scripts", () => {
  const unsafe = { ...idea, brand: '<img src=x onerror="alert(1)">' };
  const brief = buildFallbackBrief(unsafe);
  const html = buildPreviewHtml(unsafe, brief);
  expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  expect(html).toContain('src="/vendor/gsap.min.js"');
  expect(html).toContain("import * as THREE");
  expect(html).not.toContain('<img src=x onerror="alert(1)">');
  expect(html).not.toContain('onerror="alert(1)"');
});
