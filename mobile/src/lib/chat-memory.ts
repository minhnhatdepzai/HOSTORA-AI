export type MobileChatMemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MobileChatFacts = {
  websiteType: "store" | "company" | "blog" | null;
  ecommerce: boolean | null;
  monthlyVisits: number | null;
  monthlyBudget: number | null;
  upfrontBudget: number | null;
  needsDomain: boolean | null;
};

export type MobileChatMemory = {
  facts: MobileChatFacts;
  summary: string;
  unresolved: string[];
};

const EMPTY: MobileChatFacts = {
  websiteType: null,
  ecommerce: null,
  monthlyVisits: null,
  monthlyBudget: null,
  upfrontBudget: null,
  needsDomain: null,
};

function fold(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[đã ẩn email]")
    .replace(/(?<!\d)(?:\+84|0)(?:[\s.-]?\d){9,10}(?!\d)/g, "[đã ẩn số điện thoại]")
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function amount(raw: string, unit = "") {
  const value = Number(raw.replace(/[.,]/g, ""));
  if (!Number.isFinite(value)) return null;
  const result = Math.round(value * (["k", "nghin", "ngan"].includes(unit) ? 1_000 : unit === "trieu" ? 1_000_000 : 1));
  return result > 0 ? result : null;
}

function extract(content: string): Partial<MobileChatFacts> {
  const text = fold(content);
  const facts: Partial<MobileChatFacts> = {};
  const noSales = /(?:khong|chua)\s+(?:kinh doanh|ban hang|ban san pham|nhan don|thanh toan)/i.test(text) || /chi\s+(?:dang|viet)\s+bai/i.test(text);
  const blog = /\bblog\b|bai viet|noi dung|tap chi/i.test(text);
  const sales = /ban hang|cua hang|shop|woocommerce|gio hang|dat hang|nhan don|thanh toan|thuong mai dien tu/i.test(text);
  if (blog && noSales) Object.assign(facts, { websiteType: "blog", ecommerce: false });
  else if (sales) Object.assign(facts, { websiteType: "store", ecommerce: !noSales });
  else if (/gioi thieu cong ty|doanh nghiep|cong ty|dich vu/i.test(text)) facts.websiteType = "company";
  else if (blog) facts.websiteType = "blog";

  const domainNo = /(?:khong|chua)\s+(?:can|muon|phai)(?:\s+(?:mua\s+kem|mua\s+them|dang ky|mua))?\s+(?:ten mien|domain)/i.test(text) || /da\s+co\s+(?:ten mien|domain)/i.test(text);
  const domainYes = !domainNo && /(?:can|muon|phai)(?:\s+(?:mua\s+kem|mua\s+them|dang ky|mua))?\s+(?:ten mien|domain)/i.test(text);
  if (domainNo && domainYes) facts.needsDomain = null;
  else if (domainNo) facts.needsDomain = false;
  else if (domainYes) facts.needsDomain = true;

  const visits = text.match(/(\d[\d.,]*)\s*(k|trieu)?\s*(?:luot|khach|visits?)/i);
  if (visits) facts.monthlyVisits = amount(visits[1], visits[2]);
  const budget = text.match(/ngan sach(?:.{0,24})?(\d[\d.,]*)\s*(k|nghin|ngan|trieu|d|vnd)?/i);
  if (budget) facts.monthlyBudget = amount(budget[1], budget[2]);
  const upfront = text.match(/(?:tra truoc|ban dau|ky dau).{0,24}?(\d[\d.,]*)\s*(k|nghin|ngan|trieu|d|vnd)?/i);
  if (upfront) facts.upfrontBudget = amount(upfront[1], upfront[2]);
  if (/(?:chua biet|khong biet|chua quyet dinh).{0,24}ngan sach/i.test(text)) facts.monthlyBudget = null;
  if (/(?:chua biet|khong biet|chua quyet dinh).{0,24}(?:luot truy cap|luot khach)/i.test(text)) facts.monthlyVisits = null;
  return facts;
}

function summarize(facts: MobileChatFacts) {
  return [
    facts.websiteType ? `Loại website: ${facts.websiteType}.` : null,
    facts.ecommerce === null ? null : `Bán hàng trên website: ${facts.ecommerce ? "có" : "không"}.`,
    facts.monthlyVisits === null ? null : `Lượt truy cập: ${facts.monthlyVisits.toLocaleString("vi-VN")}/tháng.`,
    facts.monthlyBudget === null ? null : `Ngân sách: ${facts.monthlyBudget.toLocaleString("vi-VN")}đ/tháng.`,
    facts.upfrontBudget === null ? null : `Giới hạn trả trước: ${facts.upfrontBudget.toLocaleString("vi-VN")}đ.`,
    facts.needsDomain === null ? null : `Tên miền: ${facts.needsDomain ? "cần mua" : "không mua thêm"}.`,
  ].filter(Boolean).join(" ").slice(0, 1_200);
}

function unresolved(facts: MobileChatFacts) {
  return [
    facts.websiteType === null ? "loại website" : null,
    facts.ecommerce === null ? "có bán hàng trên web không" : null,
    facts.monthlyVisits === null ? "lượt truy cập mỗi tháng" : null,
    facts.monthlyBudget === null ? "ngân sách mỗi tháng" : null,
    facts.needsDomain === null ? "nhu cầu tên miền" : null,
    facts.upfrontBudget === null ? "giới hạn trả trước (nếu có)" : null,
  ].filter((item): item is string => Boolean(item));
}

export function buildConversationMemory(messages: MobileChatMemoryMessage[], previous?: MobileChatMemory | null): MobileChatMemory {
  const facts: MobileChatFacts = { ...(previous?.facts ?? EMPTY) };
  for (const message of messages) if (message.role === "user") Object.assign(facts, extract(message.content));
  return { facts, summary: summarize(facts), unresolved: unresolved(facts) };
}

export function recentChatMessages(messages: MobileChatMemoryMessage[], limit = 14) {
  return messages.slice(-limit).map(({ role, content }) => ({ role, content: content.slice(0, 4_000) }));
}
