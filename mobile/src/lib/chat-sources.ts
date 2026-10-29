export type ChatSource = {
  citation: string;
  title: string;
  sourceUrl: string | null;
  verifiedAt: string;
};

export function parseChatSources(data: unknown): ChatSource[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is ChatSource => {
      if (!item || typeof item !== "object") return false;
      const source = item as Partial<ChatSource>;
      return (
        typeof source.citation === "string" &&
        /^[KPSU]\d{1,2}$/.test(source.citation) &&
        typeof source.title === "string" &&
        (source.sourceUrl === null ||
          (typeof source.sourceUrl === "string" &&
            /^https:\/\//i.test(source.sourceUrl))) &&
        typeof source.verifiedAt === "string"
      );
  });
}

export function readChatSources(header: string | null): ChatSource[] {
  if (!header) return [];
  try {
    return parseChatSources(JSON.parse(decodeURIComponent(header)) as unknown);
  } catch {
    return [];
  }
}

export function citedSources(answer: string, sources: ChatSource[]) {
  return sources.filter((source) => answer.includes(`[${source.citation}]`));
}
