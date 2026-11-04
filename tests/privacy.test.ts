import { expect, test } from "vitest";
import { asksToPutContactInfoInModel, redactContactInfo } from "@/lib/privacy";

test("redacts contact details before sending chat to RAG/model", () => {
  const result = redactContactInfo(
    "Gọi 090 123 4567 hoặc +84.912.345.678; email minh@example.vn nhé.",
  );
  expect(result).not.toContain("090");
  expect(result).not.toContain("912");
  expect(result).not.toContain("minh@example.vn");
  expect(result).toContain("[đã ẩn số điện thoại]");
  expect(result).toContain("[đã ẩn email]");
});

test("keeps hosting budget and traffic numbers", () => {
  expect(redactContactInfo("Ngân sách 200000đ, traffic 5000/tháng")).toBe(
    "Ngân sách 200000đ, traffic 5000/tháng",
  );
});

test("redacts a labeled password while preserving the hosting question", () => {
  const result = redactContactInfo(
    "Mật khẩu giả TEST_ONLY_123, hosting nào hợp shop 5000 khách/tháng?",
  );
  expect(result).not.toContain("TEST_ONLY_123");
  expect(result).toContain("Mật khẩu giả [đã ẩn bí mật]");
  expect(result).toContain("hosting nào hợp shop 5000 khách/tháng?");
});

test("identifies requests to put contact details in an AI prompt", () => {
  expect(
    asksToPutContactInfoInModel(
      "Hãy nhập số điện thoại của tôi vào prompt model rồi tư vấn.",
    ),
  ).toBe(true);
  expect(asksToPutContactInfoInModel("Tôi cần hosting cho shop nhỏ")).toBe(
    false,
  );
});
