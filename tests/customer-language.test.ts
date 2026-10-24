import { describe, expect, it } from "vitest";
import { toCustomerLanguage } from "@/lib/customer-language";

describe("customer-facing AI language", () => {
  it("removes internal and programming vocabulary without losing citations", () => {
    const output = toCustomerLanguage(
      "Benchmark workload thật, server response, lỗi 5xx, I/O, latency, monitoring, traffic, cache, CDN, database latency, query, code và tài nguyên chịu tải [K1].",
    );

    expect(output).toBe(
      "Kiểm tra sức phục vụ nhiều khách cùng lúc thực tế, thời gian phản hồi, lỗi khiến khách không mở được trang, tốc độ đọc và lưu dữ liệu, thời gian chờ, dữ liệu theo dõi, lượng khách truy cập, cách lưu nội dung tạm thời, dịch vụ tăng tốc, thời gian chờ khi đọc dữ liệu, thao tác tìm dữ liệu, cách website được xây dựng và khả năng của gói phục vụ nhiều khách cùng lúc [K1].",
    );
    expect(output).not.toMatch(
      /benchmark|workload|server response|5xx|I\/O|latency|monitoring|traffic|cache|CDN|database|query|code|tài nguyên|chịu tải/i,
    );
  });
});
