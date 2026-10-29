import { z } from "zod";

/**
 * Small, deterministic memory for the advisor conversation.
 *
 * This deliberately stores only bounded business requirements. It never stores
 * the user's free-form message, prices, payment state or contact details.
 * Commercial facts are always read again from the current catalog at request
 * time.
 */
export const chatFactsSchema = z
  .object({
    websiteType: z.enum(["store", "company", "blog"]).nullable(),
    ecommerce: z.boolean().nullable(),
    monthlyVisits: z.number().int().min(1).max(100_000_000).nullable(),
    monthlyBudget: z.number().int().min(1).max(100_000_000).nullable(),
    upfrontBudget: z.number().int().min(0).max(2_000_000_000).nullable(),
    needsDomain: z.boolean().nullable(),
  })
  .strict();

export const chatMemorySchema = z
  .object({
    facts: chatFactsSchema,
    summary: z.string().max(1_200).optional(),
    unresolved: z.array(z.string().max(80)).max(8).optional(),
  })
  .strict();

export type ChatFacts = z.infer<typeof chatFactsSchema>;
export type ChatMemory = z.infer<typeof chatMemorySchema>;
export type ChatMemoryMessage = { role: "user" | "assistant"; content: string };

export const EMPTY_CHAT_FACTS: ChatFacts = {
  websiteType: null,
  ecommerce: null,
  monthlyVisits: null,
  monthlyBudget: null,
  upfrontBudget: null,
  needsDomain: null,
};

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+84|0)(?:[\s.-]?\d){9,10}(?!\d)/g;

/** Redact contact details before any deterministic extraction or model call. */
export function redactMemoryPii(content: string) {
  return content
    .replace(EMAIL, "[đã ẩn email]")
    .replace(PHONE, "[đã ẩn số điện thoại]")
    .replace(/\b(?:mã đơn|order)\s*[:#-]?\s*[a-z0-9-]{5,}\b/gi, "[đã ẩn mã đơn]");
}

function folded(value: string) {
  return redactMemoryPii(value)
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function parseAmount(raw: string, unit = "") {
  const normalizedUnit = unit.toLocaleLowerCase("vi");
  const normalized = raw.replace(/\s/g, "");
  const value =
    normalizedUnit === "trieu" && /^[\d]+[.,][\d]+$/.test(normalized)
      ? Number(normalized.replace(",", "."))
      : Number(normalized.replace(/[.,]/g, ""));
  if (!Number.isFinite(value)) return null;
  const multiplier = ["k", "nghin", "ngan"].includes(normalizedUnit)
    ? 1_000
    : normalizedUnit === "trieu"
      ? 1_000_000
      : 1;
  const amount = Math.round(value * multiplier);
  return amount > 0 ? amount : null;
}

function amountMatch(text: string, expression: RegExp) {
  const match = text.match(expression);
  if (!match) return null;
  return parseAmount(match[1], match[2]);
}

function extractOne(text: string): Partial<ChatFacts> {
  const value = folded(text);
  const facts: Partial<ChatFacts> = {};
  const noSales =
    /(?:khong|chua)\s+(?:kinh doanh|ban hang|ban san pham|nhan don|thanh toan)(?:\s+tren\s+(?:web|website|trang))?/i.test(value) ||
    /chi\s+(?:dang|viet)\s+bai(?:\s+viet)?(?:,|\s|$)/i.test(value);
  const hasBlog = /\bblog\b|bai viet|noi dung|tap chi/i.test(value);
  const hasSales =
    /ban hang|cua hang|shop|woocommerce|gio hang|dat hang|nhan don|thanh toan|thuong mai dien tu/i.test(value);
  const hasCompany = /gioi thieu cong ty|doanh nghiep|cong ty|dich vu/i.test(value);

  // A blog topic mentioning sales is not an online shop. Explicit online
  // transactions still win when the user says they sell through the site.
  if (hasBlog && noSales) {
    facts.websiteType = "blog";
    facts.ecommerce = false;
  } else if (hasSales) {
    facts.websiteType = "store";
    facts.ecommerce = noSales ? false : true;
  } else if (hasCompany) {
    facts.websiteType = "company";
  } else if (hasBlog) {
    facts.websiteType = "blog";
  }

  const domainNo =
    /(?:khong|chua)\s+(?:can|muon|phai)(?:\s+(?:mua\s+kem|mua\s+them|dang ky|mua))?\s+(?:ten mien|domain)/i.test(value) ||
    /da\s+co\s+(?:ten mien|domain)/i.test(value);
  const domainYes = !domainNo && /(?:can|muon|phai)(?:\s+(?:mua\s+kem|mua\s+them|dang ky|mua))?\s+(?:ten mien|domain)/i.test(value);
  const domainUnknown = /(?:chua biet|chua quyet dinh|khong biet).{0,24}(?:ten mien|domain)/i.test(value);
  if (domainUnknown || (domainNo && domainYes)) facts.needsDomain = null;
  else if (domainNo) facts.needsDomain = false;
  else if (domainYes) facts.needsDomain = true;

  const visits = amountMatch(
    value,
    /(\d[\d.,]*)\s*(k|trieu)?\s*(?:luot|khach|visits?)\s*(?:\/\s*thang|moi\s*thang)?/i,
  );
  if (visits !== null) facts.monthlyVisits = visits;

  const budget = amountMatch(
    value,
    /ngan sach(?:\s+(?:hang\s+thang|moi\s*thang|thang))?.{0,24}?(\d[\d.,]*)\s*(k|nghin|ngan|trieu|d|vnd)?/i,
  );
  if (budget !== null) facts.monthlyBudget = budget;

  const upfront = amountMatch(
    value,
    /(?:tra truoc|ban dau|ky dau|chi phi dau).{0,24}?(\d[\d.,]*)\s*(k|nghin|ngan|trieu|d|vnd)?/i,
  );
  if (upfront !== null) facts.upfrontBudget = upfront;

  if (/(?:chua biet|khong biet|chua quyet dinh).{0,24}(?:ngan sach|luot truy cap|domain|ten mien)/i.test(value)) {
    if (/ngan sach/i.test(value)) facts.monthlyBudget = null;
    if (/luot truy cap/i.test(value)) facts.monthlyVisits = null;
    if (/domain|ten mien/i.test(value)) facts.needsDomain = null;
  }
  return facts;
}

export function extractConversationFacts(messages: ChatMemoryMessage[]): Partial<ChatFacts> {
  const result: Partial<ChatFacts> = {};
  for (const message of messages) {
    if (message.role !== "user") continue;
    Object.assign(result, extractOne(message.content));
  }
  return result;
}

function unresolvedFacts(facts: ChatFacts) {
  return [
    facts.websiteType === null ? "loại website" : null,
    facts.ecommerce === null ? "có bán hàng trên web không" : null,
    facts.monthlyVisits === null ? "lượt truy cập mỗi tháng" : null,
    facts.monthlyBudget === null ? "ngân sách mỗi tháng" : null,
    facts.needsDomain === null ? "nhu cầu tên miền" : null,
    facts.upfrontBudget === null ? "giới hạn trả trước (nếu có)" : null,
  ].filter((item): item is string => item !== null);
}

export function summarizeChatFacts(facts: ChatFacts) {
  const parts = [
    facts.websiteType ? `Loại website: ${facts.websiteType}.` : null,
    facts.ecommerce === null ? null : `Bán hàng trên website: ${facts.ecommerce ? "có" : "không"}.`,
    facts.monthlyVisits === null ? null : `Lượt truy cập dự kiến: ${facts.monthlyVisits.toLocaleString("vi-VN")}/tháng.`,
    facts.monthlyBudget === null ? null : `Ngân sách mỗi tháng: ${facts.monthlyBudget.toLocaleString("vi-VN")}đ.`,
    facts.upfrontBudget === null ? null : `Giới hạn trả trước: ${facts.upfrontBudget.toLocaleString("vi-VN")}đ.`,
    facts.needsDomain === null ? null : `Tên miền: ${facts.needsDomain ? "cần mua" : "không cần mua thêm"}.`,
  ].filter((item): item is string => item !== null);
  return parts.join(" ").slice(0, 1_200);
}

export function normalizeChatMemory(input: unknown): ChatMemory | null {
  const parsed = chatMemorySchema.safeParse(input);
  if (!parsed.success) return null;
  const facts = chatFactsSchema.parse(parsed.data.facts);
  return {
    facts,
    summary: summarizeChatFacts(facts),
    unresolved: unresolvedFacts(facts),
  };
}

export function mergeConversationMemory(
  previous: unknown,
  messages: ChatMemoryMessage[],
): ChatMemory {
  const previousMemory = normalizeChatMemory(previous);
  const facts: ChatFacts = {
    ...(previousMemory?.facts ?? EMPTY_CHAT_FACTS),
    ...extractConversationFacts(messages),
  };
  return {
    facts,
    summary: summarizeChatFacts(facts),
    unresolved: unresolvedFacts(facts),
  };
}

export function buildConversationMemory(messages: ChatMemoryMessage[]) {
  return mergeConversationMemory(undefined, messages);
}

export function recentChatMessages(messages: ChatMemoryMessage[], limit = 14) {
  return messages
    .slice(-limit)
    .map((message) => ({ role: message.role, content: redactMemoryPii(message.content).slice(0, 4_000) }));
}

export function recommendationContextQuestion(latest: string, facts: ChatFacts) {
  if (!/(chọn gói|tư vấn gói|phương án|gợi ý gói|so sánh gói|gói nào)/i.test(latest)) return latest;
  if (facts.websiteType === null || facts.monthlyVisits === null || facts.monthlyBudget === null || facts.needsDomain === null) return latest;
  const website = facts.websiteType === "store" ? "cửa hàng bán hàng" : facts.websiteType === "blog" ? "blog" : "trang giới thiệu công ty";
  // Keep the synthesized phrase compatible with the existing deterministic
  // recommendation parser while preserving the user's meaning.
  const domain = facts.needsDomain ? "cần mua tên miền" : "không cần tên miền";
  return `${latest} ${website}, ${facts.monthlyVisits} lượt/tháng, ngân sách ${facts.monthlyBudget}đ, ${domain}.`;
}
