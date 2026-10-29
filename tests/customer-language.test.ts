import { describe, expect, it } from "vitest";
import { toCustomerLanguage } from "@/lib/customer-language";

describe("customer-facing AI language", () => {
  it("removes internal and programming vocabulary without losing citations", () => {
    const output = toCustomerLanguage(
      "Benchmark workload thật, server response, lỗi 5xx, I/O, latency, monitoring, traffic, cache, CDN, database latency, query, code và tài nguyên chịu tải [K1].",
    );

    expect(output).toBe(
      "Kiểm tra sức phục vụ nhiều khách cùng lúc thực tế, thời gian phản hồi, lỗi khiến khách không mở được trang, tốc độ đọc và lưu dữ liệu, thời gian chờ, dữ liệu theo dõi, lượng khách truy cập, cách lưu nội dung tạm thời, CDN (dịch vụ tăng tốc), thời gian chờ khi đọc dữ liệu, thao tác tìm dữ liệu, cách website được xây dựng và khả năng của gói phục vụ nhiều khách cùng lúc [K1].",
    );
    expect(output).not.toMatch(
      /benchmark|workload|server response|5xx|I\/O|latency|monitoring|traffic|cache|database|query|code|tài nguyên|chịu tải/i,
    );
  });

  it("translates internal delivery terms into plain Vietnamese", () => {
    const output = toCustomerLanguage(
      "Backend nhận webhook từ gateway sandbox, SMTP gửi mail, OCR và SEO được theo dõi trong RAG pipeline.",
    );
    expect(output).not.toMatch(
      /backend|webhook|gateway|sandbox|smtp|ocr|seo|rag|pipeline/i,
    );
    expect(output).toContain("Phần xử lý");
    expect(output).toContain("thông báo giao dịch tự động");
    expect(output).toContain("khả năng được tìm thấy trên Google");
  });
});
