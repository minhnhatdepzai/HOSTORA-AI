import type { AiEscalationReason } from "@/lib/customer/types";

const fold = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

const HOSTORA_SCOPE =
  /hostora|website|web\b|hosting|luu tru|ten mien|domain|dns|ssl|cdn|backup|vps|server|wordpress|woocommerce|seo|google|schema|sitemap|robots|email|thu dien tu|gia|chi phi|ngan sach|gia han|goi (?:hosting|dich vu|nao|chinh|thay the)|nha cung cap|trang web|cua hang|ban hang|thanh toan|hoa don|don hang|hoan tien|tai khoan|xay dung trang/i;
const SOCIAL_ONLY = /^(xin chao|chao|hello|hi|cam on|cảm ơn|ok|oke|duoc|được)[!. ]*$/i;
const HUMAN_REQUEST = /nhan vien|quan tri vien|nguoi that|ho tro truc tiep|gap tu van vien/i;
const QUESTION_SHAPE = /\?|^(ai|cai gi|bao nhieu|bao gio|khi nao|o dau|tai sao|vi sao|lam sao|co |ngay mai|hom nay)/i;
const INSUFFICIENT =
  /chua (?:co du du lieu|co du thong tin|the xac nhan|xac minh)|khong (?:co du du lieu|the xac nhan|the tra loi)|can xac minh|ngoai pham vi/i;

export function evaluateAiEscalation(input: {
  question: string;
  answer?: string;
  assistantUnavailable?: boolean;
}): { reason: AiEscalationReason } | null {
  const question = fold(input.question.trim());
  if (!question || SOCIAL_ONLY.test(question)) return null;
  if (input.assistantUnavailable) return { reason: "assistant_unavailable" };
  if (HUMAN_REQUEST.test(question)) return { reason: "human_requested" };
  if (input.answer && INSUFFICIENT.test(fold(input.answer)))
    return { reason: "insufficient_data" };
  if (QUESTION_SHAPE.test(question) && !HOSTORA_SCOPE.test(question))
    return { reason: "out_of_scope" };
  return null;
}
