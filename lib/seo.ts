export type SeoFinding = {
  id: string;
  group: "indexability" | "content" | "technical" | "social";
  label: string;
  status: "pass" | "warning" | "fail";
  impact: "high" | "medium" | "low";
  detail: string;
};

const capture = (html: string, pattern: RegExp) =>
  html.match(pattern)?.[1]?.trim() ?? null;
const decode = (value: string | null) =>
  value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">") ?? null;

function status(
  condition: boolean,
  detail: string,
  missing: string,
  impact: SeoFinding["impact"],
  id: string,
  group: SeoFinding["group"],
  label: string,
): SeoFinding {
  return {
    id,
    group,
    label,
    status: condition ? "pass" : "fail",
    impact,
    detail: condition ? detail : missing,
  };
}

export function auditSeoHtml(
  html: string,
  url: URL,
  discovery: { robots: boolean; sitemap: boolean },
) {
  const title = decode(capture(html, /<title[^>]*>([^<]*)<\/title>/i));
  const description = decode(
    capture(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    ) ??
      capture(
        html,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      ),
  );
  const canonical =
    capture(
      html,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    ) ??
    capture(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const robots =
    capture(
      html,
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i,
    )?.toLowerCase() ?? "";
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const h2Count = (html.match(/<h2\b/gi) ?? []).length;
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithAlt = images.filter((image) =>
    /\balt=["'][^"']*["']/i.test(image),
  ).length;
  const anchors = [...html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)].map(
    (match) => match[1],
  );
  const internalLinks = anchors.filter((href) => {
    try {
      return new URL(href, url).hostname === url.hostname;
    } catch {
      return false;
    }
  }).length;
  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const schemaTypes = new Set<string>();
  for (const [, raw] of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(raw);
      const visit = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(visit);
        const object = value as Record<string, unknown>;
        const type = object["@type"];
        if (typeof type === "string") schemaTypes.add(type);
        else if (Array.isArray(type))
          type
            .filter((item): item is string => typeof item === "string")
            .forEach((item) => schemaTypes.add(item));
        Object.values(object).forEach(visit);
      };
      visit(parsed);
    } catch {}
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = text ? text.split(/\s+/u).length : 0;
  const findings: SeoFinding[] = [
    status(
      Boolean(title),
      `Có title: “${title}”`,
      "Thiếu thẻ title mô tả trang.",
      "high",
      "title",
      "content",
      "Page title",
    ),
    status(
      Boolean(description),
      "Có meta description.",
      "Thiếu meta description riêng cho trang.",
      "medium",
      "description",
      "content",
      "Meta description",
    ),
    status(
      h1Count === 1,
      `Phát hiện đúng 1 H1 và ${h2Count} H2.`,
      `Phát hiện ${h1Count} H1; cần một heading chính rõ ràng.`,
      "medium",
      "headings",
      "content",
      "Cấu trúc heading",
    ),
    status(
      /<html[^>]+lang=["'][^"']+/i.test(html),
      "Đã khai báo ngôn ngữ tài liệu.",
      "Thiếu thuộc tính lang trên thẻ html.",
      "medium",
      "language",
      "technical",
      "Ngôn ngữ trang",
    ),
    status(
      /<meta[^>]+name=["']viewport["']/i.test(html),
      "Có mobile viewport.",
      "Thiếu mobile viewport.",
      "high",
      "viewport",
      "technical",
      "Mobile viewport",
    ),
    status(
      url.protocol === "https:",
      "Trang dùng HTTPS.",
      "Trang không dùng HTTPS.",
      "high",
      "https",
      "technical",
      "HTTPS",
    ),
    status(
      !robots.includes("noindex"),
      robots
        ? `Meta robots: ${robots}.`
        : "Không phát hiện noindex trên trang.",
      "Trang đang khai báo noindex.",
      "high",
      "indexable",
      "indexability",
      "Cho phép index",
    ),
    status(
      Boolean(canonical),
      `Canonical: ${canonical}`,
      "Không phát hiện rel=canonical.",
      "medium",
      "canonical",
      "indexability",
      "Canonical URL",
    ),
    status(
      discovery.robots,
      "Truy cập được /robots.txt.",
      "Không truy cập được /robots.txt tại origin.",
      "medium",
      "robots",
      "indexability",
      "robots.txt",
    ),
    status(
      discovery.sitemap,
      "Truy cập được /sitemap.xml.",
      "Không truy cập được /sitemap.xml mặc định; có thể sitemap ở URL khác.",
      "medium",
      "sitemap",
      "indexability",
      "XML sitemap",
    ),
    status(
      jsonLdBlocks.length > 0,
      `Có ${jsonLdBlocks.length} JSON-LD block${schemaTypes.size ? `: ${[...schemaTypes].join(", ")}` : ""}.`,
      "Chưa phát hiện JSON-LD structured data.",
      "low",
      "structured-data",
      "technical",
      "Structured data",
    ),
    status(
      /<meta[^>]+property=["']og:title["']/i.test(html),
      "Có Open Graph title.",
      "Thiếu og:title cho chia sẻ mạng xã hội.",
      "low",
      "open-graph",
      "social",
      "Open Graph",
    ),
    {
      id: "image-alt",
      group: "content",
      label: "Image alt",
      status:
        images.length === 0 || imagesWithAlt === images.length
          ? "pass"
          : imagesWithAlt / images.length >= 0.8
            ? "warning"
            : "fail",
      impact: "medium",
      detail: images.length
        ? `${imagesWithAlt}/${images.length} ảnh có thuộc tính alt.`
        : "Không có ảnh trong HTML đã tải.",
    },
    {
      id: "internal-links",
      group: "content",
      label: "Internal links",
      status: internalLinks > 0 ? "pass" : "warning",
      impact: "medium",
      detail: `Phát hiện ${internalLinks} liên kết nội bộ crawlable trong HTML.`,
    },
  ];
  const weights = { high: 3, medium: 2, low: 1 } as const;
  const earned = findings.reduce(
    (sum, finding) =>
      sum +
      weights[finding.impact] *
        (finding.status === "pass"
          ? 1
          : finding.status === "warning"
            ? 0.5
            : 0),
    0,
  );
  const total = findings.reduce(
    (sum, finding) => sum + weights[finding.impact],
    0,
  );
  return {
    title,
    description,
    canonical,
    robotsMeta: robots || null,
    h1Count,
    h2Count,
    wordCount,
    images: { total: images.length, withAlt: imagesWithAlt },
    links: { total: anchors.length, internal: internalLinks },
    structuredData: { blocks: jsonLdBlocks.length, types: [...schemaTypes] },
    score: Math.round((earned / total) * 100),
    findings,
  };
}
