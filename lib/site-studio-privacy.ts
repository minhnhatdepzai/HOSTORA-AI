const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?<!\d)(?:\+?\d[\s().-]*){9,15}(?!\d)/g;

/** Remove contact details from prompts sent to the local model. */
export function redactStudioContact(value: string) {
  return value
    .replace(emailPattern, "[thông tin liên hệ]")
    .replace(phonePattern, "[thông tin liên hệ]");
}
