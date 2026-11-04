// Best-effort guard for contact details and credentials typed into free-form
// chat. Lead fields are never routed here. Do not log the original message.
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+84|0)(?:[\s.-]?\d){9,10}(?!\d)/g;
const LABELED_SECRET =
  /(\b(?:mật khẩu|mat khau|password|api[- ]?key|khóa api|khoa api|access token|mã otp|ma otp|otp|cvc)\b(?:\s+(?:giả|gia|test))?\s*(?::|=|\blà\b|\bla\b)?\s+)([A-Z0-9_!@#$%^&*.-]{6,})/giu;

export function redactContactInfo(content: string) {
  return content
    .replace(EMAIL, "[đã ẩn email]")
    .replace(PHONE, "[đã ẩn số điện thoại]")
    .replace(LABELED_SECRET, "$1[đã ẩn bí mật]");
}

export function asksToPutContactInfoInModel(content: string) {
  const contact = /số điện thoại|sđt|email|e-mail/i;
  const model = /prompt|model|mô hình|ai\b/i;
  return contact.test(content) && model.test(content);
}
