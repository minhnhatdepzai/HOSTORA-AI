import { expect, test } from "vitest";
import { redactStudioContact } from "@/lib/site-studio-privacy";

test("Studio prompts omit contact details while preserving the business idea", () => {
  const text = redactStudioContact(
    "Xưởng gốm thủ công, gọi 090 123 4567 hoặc gửi hello@example.com để xem mẫu.",
  );
  expect(text).toContain("Xưởng gốm thủ công");
  expect(text).not.toContain("090 123 4567");
  expect(text).not.toContain("hello@example.com");
});
