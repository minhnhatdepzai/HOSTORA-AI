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
      `Đã có tên trang: “${title}”`,
      "Chưa có tên trang rõ ràng để hiển thị trên Google.",
      "high",
      "title",
      "content",
      "Tên trang trên Google",
    ),
    status(
      Boolean(description),
      "Đã có đoạn mô tả cho trang.",
      "Chưa có đoạn mô tả riêng để khách hiểu nội dung trang.",
      "medium",
      "description",
      "content",
      "Mô tả trên Google",
    ),
    status(
      h1Count === 1,
      `Có một tiêu đề chính và ${h2Count} tiêu đề phụ.`,
      `Đang có ${h1Count} tiêu đề chính; mỗi trang nên có một tiêu đề chính rõ ràng.`,
      "medium",
      "headings",
      "content",
      "Cấu trúc tiêu đề",
    ),
    status(
      /<html[^>]+lang=["'][^"']+/i.test(html),
      "Website đã cho trình duyệt biết ngôn ngữ chính.",
      "Website chưa cho trình duyệt biết ngôn ngữ chính.",
      "medium",
      "language",
      "technical",
      "Ngôn ngữ trang",
    ),
    status(
      /<meta[^>]+name=["']viewport["']/i.test(html),
      "Website đã chuẩn bị cách hiển thị trên điện thoại.",
      "Website chưa khai báo cách hiển thị phù hợp trên điện thoại.",
      "high",
      "viewport",
      "technical",
      "Hiển thị trên điện thoại",
    ),
    status(
      url.protocol === "https:",
      "Website đang dùng kết nối an toàn.",
      "Website chưa dùng kết nối an toàn.",
      "high",
      "https",
      "technical",
      "Kết nối an toàn",
    ),
    status(
      !robots.includes("noindex"),
      "Không thấy dấu hiệu yêu cầu Google bỏ qua trang này.",
      "Trang đang yêu cầu Google không đưa vào kết quả tìm kiếm.",
      "high",
      "indexable",
      "indexability",
      "Cho phép xuất hiện trên Google",
    ),
    status(
      Boolean(canonical),
      "Đã khai báo địa chỉ chính của trang.",
      "Chưa khai báo địa chỉ chính để tránh nội dung trùng lặp.",
      "medium",
      "canonical",
      "indexability",
      "Địa chỉ chính của trang",
    ),
    status(
      discovery.robots,
      "Có hướng dẫn dành cho công cụ tìm kiếm.",
      "Chưa tìm thấy hướng dẫn dành cho công cụ tìm kiếm.",
      "medium",
      "robots",
      "indexability",
      "Hướng dẫn cho công cụ tìm kiếm",
    ),
    status(
      discovery.sitemap,
      "Có danh sách trang để công cụ tìm kiếm khám phá.",
      "Chưa tìm thấy danh sách các trang của website ở vị trí thông dụng.",
      "medium",
      "sitemap",
      "indexability",
      "Danh sách trang cho Google",
    ),
    status(
      jsonLdBlocks.length > 0,
      "Đã có thông tin giúp Google hiểu loại nội dung của trang.",
      "Chưa có phần thông tin bổ sung giúp Google hiểu rõ loại nội dung.",
      "low",
      "structured-data",
      "technical",
      "Thông tin nổi bật trên Google",
    ),
    status(
      /<meta[^>]+property=["']og:title["']/i.test(html),
      "Đã có tiêu đề khi chia sẻ lên mạng xã hội.",
      "Chưa có tiêu đề riêng khi chia sẻ lên mạng xã hội.",
      "low",
      "open-graph",
      "social",
      "Nội dung khi chia sẻ",
    ),
    {
      id: "image-alt",
      group: "content",
      label: "Mô tả hình ảnh",
      status:
        images.length === 0 || imagesWithAlt === images.length
          ? "pass"
          : imagesWithAlt / images.length >= 0.8
            ? "warning"
            : "fail",
      impact: "medium",
      detail: images.length
        ? `${imagesWithAlt}/${images.length} ảnh đã có mô tả hỗ trợ người đọc và Google.`
        : "Không thấy ảnh trên trang đã kiểm tra.",
    },
    {
      id: "internal-links",
      group: "content",
      label: "Liên kết giữa các trang",
      status: internalLinks > 0 ? "pass" : "warning",
      impact: "medium",
      detail: `Tìm thấy ${internalLinks} liên kết giúp khách đi tới nội dung khác trong cùng website.`,
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
