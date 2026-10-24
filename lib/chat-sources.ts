export type ChatSource = {
  citation: string;
  title: string;
  sourceUrl: string;
  verifiedAt: string;
  kind?: string;
};

export function readChatSources(header: string | null): ChatSource[] {
  if (!header) return [];
  try {
    const data: unknown = JSON.parse(decodeURIComponent(header));
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is ChatSource => {
      if (!item || typeof item !== "object") return false;
      const source = item as Partial<ChatSource>;
      return (
        typeof source.citation === "string" &&
        /^[KPS]\d{1,2}$/.test(source.citation) &&
        typeof source.title === "string" &&
        typeof source.sourceUrl === "string" &&
        /^https:\/\//i.test(source.sourceUrl) &&
        typeof source.verifiedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export function citedSources(answer: string, sources: ChatSource[]) {
  return sources.filter((source) => answer.includes(`[${source.citation}]`));
}
