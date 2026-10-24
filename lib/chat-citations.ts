// Model output may invent citation-like tokens. This checks identifier
// existence, not whether the cited claim is actually supported.
export function sanitizeCitations(answer: string, allowed: Set<string>) {
  return answer
    .replace(
      /\[(?:grounding_rules|K\d*|P\d*|S\d*|\d+)\](?:\[\d+\])?/gi,
      (token) => (allowed.has(token) ? token : ""),
    )
    .replace(/\[(?:Dữ kiện nguồn|Suy luận tư vấn|Cần xác minh):?\]/gi, "")
    .replace(/ +([.,;:])/g, "$1")
    .trim();
}
