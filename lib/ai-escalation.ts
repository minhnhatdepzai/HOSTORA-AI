import type { AiEscalationReason } from "@/lib/customer/types";

const fold = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

const HOSTORA_SCOPE =
  /hostora|website|web\b|hosting|luu tru|ten mien|domain|dns|ssl|cdn|backup|vps|server|wordpress|woocommerce|seo|google|schema|sitemap|robots|email|thu dien tu|\bgia\b(?!\s+tri\b)|chi phi|ngan sach|gia han|goi (?:hosting|dich vu|nao|chinh|thay the)|nha cung cap|trang web|cua hang|ban hang|thanh toan|hoa don|don hang|hoan tien|tai khoan|xay dung trang/i;
const SOCIAL_ONLY = /^(xin chao|chao|hello|hi|cam on|cảm ơn|ok|oke|duoc|được)[!. ]*$/i;
const HUMAN_REQUEST =
  /(?:(?:muon|can|cho toi|hay|xin|yeu cau).{0,24}(?:gap|noi chuyen|chuyen|ket noi).{0,24}|(?:gap|noi chuyen voi|chuyen cho|ket noi voi).{0,24})(?:nhan vien|quan tri vien|nguoi that|tu van vien)|(?:muon|can|xin).{0,20}ho tro truc tiep/i;
const QUESTION_SHAPE = /\?|^(ai|cai gi|bao nhieu|bao gio|khi nao|o dau|tai sao|vi sao|lam sao|co |ngay mai|hom nay)/i;
const DIRECT_REQUEST =
  /^(hay |giup |cho toi |xin cho |viet |tao |chi |huong dan |dich |ke |soan |chan doan |du bao )/i;

export function evaluateAiEscalation(input: {
  question: string;
  answer?: string;
  assistantUnavailable?: boolean;
}): { reason: AiEscalationReason } | null {
  const question = fold(input.question.trim());
  if (!question || SOCIAL_ONLY.test(question)) return null;
  if (input.assistantUnavailable) return { reason: "assistant_unavailable" };
  if (HUMAN_REQUEST.test(question)) return { reason: "human_requested" };
  // A missing price, live domain status or customer detail is a follow-up,
  // not a reason to send an otherwise in-scope question to an administrator.
  if (
    (QUESTION_SHAPE.test(question) || DIRECT_REQUEST.test(question)) &&
    !HOSTORA_SCOPE.test(question)
  )
    return { reason: "out_of_scope" };
  return null;
}
