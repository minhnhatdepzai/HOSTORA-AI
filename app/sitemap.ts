import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site-url";
import { journalArticles } from "@/data/journal";

const publicRoutes = [
  ["/", "weekly", 1],
  ["/services", "daily", 0.95],
  ["/consultation", "weekly", 0.9],
  ["/ai-assistant", "weekly", 0.85],
  ["/website-studio", "weekly", 0.85],
  ["/recommendations", "weekly", 0.8],
  ["/domain-advisor", "monthly", 0.75],
  ["/website-analyzer", "monthly", 0.75],
  ["/readiness", "monthly", 0.7],
  ["/knowledge", "weekly", 0.65],
  ["/journal", "weekly", 0.75],
  ["/about", "monthly", 0.55],
  ["/intelligence", "monthly", 0.6],
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [...publicRoutes.map(([pathname, changeFrequency, priority]) => ({
    url: absoluteSiteUrl(pathname),
    lastModified: new Date(),
    changeFrequency,
    priority,
  })), ...journalArticles.map((article) => ({ url: absoluteSiteUrl(`/journal/${article.slug}`), lastModified: new Date(`${article.updatedAt}T00:00:00+07:00`), changeFrequency: "monthly" as const, priority: 0.65 }))];
}
