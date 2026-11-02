export const AI_CRAWLERS = [
  { id: "GPTBot", vendor: "OpenAI" },
  { id: "OAI-SearchBot", vendor: "OpenAI" },
  { id: "ClaudeBot", vendor: "Anthropic" },
  { id: "anthropic-ai", vendor: "Anthropic" },
  { id: "PerplexityBot", vendor: "Perplexity" },
  { id: "Google-Extended", vendor: "Google" },
  { id: "GoogleOther", vendor: "Google" },
  { id: "CCBot", vendor: "Common Crawl" },
  { id: "meta-externalagent", vendor: "Meta" },
] as const;

export type AiCrawlerAccess = {
  id: (typeof AI_CRAWLERS)[number]["id"];
  vendor: string;
  status: "allowed" | "blocked";
  via: "specific" | "wildcard" | "default";
};

export type AiVisibilityCategory = {
  id: "crawlers" | "entities" | "llms" | "meta" | "sitemap";
  label: string;
  weight: number;
  earned: number;
};

export type AiVisibilityInput = {
  robotsTxt: string | null;
  llmsTxt: string | null;
  llmsFullTxt?: string | null;
  structuredData: { blocks: number; types: string[] };
  meta: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    openGraph: boolean;
    language: boolean;
  };
  sitemap: boolean;
};

export type AiVisibilityAudit = {
  score: number;
  categories: AiVisibilityCategory[];
  crawlers: AiCrawlerAccess[];
  documents: { llmsTxt: boolean; llmsFullTxt: boolean };
};

type RobotsGroup = {
  agents: string[];
  allow: string[];
  disallow: string[];
};

function parseRobots(text: string | null) {
  if (!text) return [];
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let acceptingAgents = false;

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    if (!line) {
      acceptingAgents = false;
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || !acceptingAgents) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      acceptingAgents = true;
      continue;
    }

    acceptingAgents = false;
    if (!current) continue;
    if (field === "allow") current.allow.push(value);
    if (field === "disallow") current.disallow.push(value);
  }

  return groups;
}

function ruleMatchesRoot(pattern: string) {
  if (!pattern) return false;
  const anchored = pattern.endsWith("$");
  const rawPattern = anchored ? pattern.slice(0, -1) : pattern;
  const expression = rawPattern
    .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("*", ".*");
  return new RegExp(`^${expression}${anchored ? "$" : ""}`, "u").test("/");
}

function ruleSpecificity(pattern: string) {
  return pattern.replaceAll("*", "").replace(/\$$/u, "").length;
}

function rootIsBlocked(group: RobotsGroup) {
  const matchingAllows = group.allow.filter(ruleMatchesRoot);
  const matchingDisallows = group.disallow.filter(ruleMatchesRoot);
  const longestAllow = Math.max(
    -1,
    ...matchingAllows.map(ruleSpecificity),
  );
  const longestDisallow = Math.max(
    -1,
    ...matchingDisallows.map(ruleSpecificity),
  );
  return longestDisallow > longestAllow;
}

function auditCrawlerAccess(robotsTxt: string | null): AiCrawlerAccess[] {
  const groups = parseRobots(robotsTxt);
  return AI_CRAWLERS.map(({ id, vendor }) => {
    const agent = id.toLowerCase();
    const specific = groups.find((group) => group.agents.includes(agent));
    const wildcard = groups.find((group) => group.agents.includes("*"));
    const matched = specific ?? wildcard;
    return {
      id,
      vendor,
      status: matched && rootIsBlocked(matched) ? "blocked" : "allowed",
      via: specific ? "specific" : wildcard ? "wildcard" : "default",
    };
  });
}

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

export function auditAiVisibility(
  input: AiVisibilityInput,
): AiVisibilityAudit {
  const crawlers = auditCrawlerAccess(input.robotsTxt);
  const allowedCrawlerRatio =
    crawlers.filter((crawler) => crawler.status === "allowed").length /
    crawlers.length;
  const schemaTypes = new Set(
    input.structuredData.types.map((type) => type.toLowerCase()),
  );
  const hasEntityBlock = input.structuredData.blocks > 0;
  const llms = input.llmsTxt?.trim() ?? "";
  const hasLlmsHeading = /^#{1,6}\s+\S/mu.test(llms);
  const hasLlmsLink = /https?:\/\/[^\s)]+/iu.test(llms);
  const hasLlmsFull = /^#{1,6}\s+\S/mu.test(
    input.llmsFullTxt?.trim() ?? "",
  );

  const categories: AiVisibilityCategory[] = [
    {
      id: "crawlers",
      label: "Quyền truy cập của AI",
      weight: 40,
      earned: rounded(40 * allowedCrawlerRatio),
    },
    {
      id: "entities",
      label: "Ngữ cảnh thương hiệu",
      weight: 25,
      earned: rounded(
        (hasEntityBlock ? 12.5 : 0) +
          (schemaTypes.has("organization") ? 6.25 : 0) +
          (schemaTypes.has("website") || schemaTypes.has("webapplication")
            ? 6.25
            : 0),
      ),
    },
    {
      id: "llms",
      label: "Tài liệu cho trợ lý AI",
      weight: 15,
      earned: (hasLlmsHeading ? 9 : 0) + (hasLlmsLink ? 6 : 0),
    },
    {
      id: "meta",
      label: "Thông tin trang cơ bản",
      weight: 15,
      earned: rounded(
        (input.meta.title ? 4.5 : 0) +
          (input.meta.description ? 4.5 : 0) +
          (input.meta.canonical ? 3 : 0) +
          (input.meta.openGraph ? 1.5 : 0) +
          (input.meta.language ? 1.5 : 0),
      ),
    },
    {
      id: "sitemap",
      label: "Danh sách trang",
      weight: 5,
      earned: input.sitemap ? 5 : 0,
    },
  ];

  return {
    score: Math.round(
      categories.reduce((total, category) => total + category.earned, 0),
    ),
    categories,
    crawlers,
    documents: { llmsTxt: hasLlmsHeading, llmsFullTxt: hasLlmsFull },
  };
}
