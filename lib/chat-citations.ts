// Model output may invent citation-like tokens. This checks identifier
// existence, not whether the cited claim is actually supported.
export function sanitizeCitations(answer: string, allowed: Set<string>) {
  return answer
    .replace(/\(([KPSU]\d{1,2})\)/gi, (token, citation: string) => {
      const normalized = `[${citation.toLocaleUpperCase("vi")}]`;
      return allowed.has(normalized) ? normalized : token;
    })
    .replace(
      /\[(?:grounding_rules|K\d*|P\d*|S\d*|U\d*|\d+)\](?:\[\d+\])?/gi,
      (token) => (allowed.has(token) ? token : ""),
    )
    .replace(/\[(?:grounding rule|quy tắc nguồn)\s*\d+\]/gi, "")
    .replace(/\[(?:Dữ kiện nguồn|Suy luận tư vấn|Cần xác minh):?\]/gi, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:])/g, "$1")
    .trim();
}
