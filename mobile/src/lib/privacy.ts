const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+84|0)(?:[\s.-]?\d){9,10}(?!\d)/g;
const LABELED_SECRET =
  /(\b(?:mật khẩu|mat khau|password|api[- ]?key|khóa api|khoa api|access token|mã otp|ma otp|otp|cvc)\b(?:\s+(?:giả|gia|test))?\s*(?::|=|\blà\b|\bla\b)?\s+)([A-Z0-9_!@#$%^&*.-]{6,})/giu;

/** Hide sensitive text before it enters local history or the API request. */
export function redactChatSensitiveInfo(content: string) {
  return content
    .replace(EMAIL, "[đã ẩn email]")
    .replace(PHONE, "[đã ẩn số điện thoại]")
    .replace(LABELED_SECRET, "$1[đã ẩn bí mật]");
}
