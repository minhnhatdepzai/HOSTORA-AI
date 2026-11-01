# Ma trận kiểm thử vòng loại — Đề 01, Bảng A

**Bản xem nhanh cho giám khảo:** [Trang minh chứng 6 ca](MINH_CHUNG_6_CA.html) · [PDF 5 trang](MINH_CHUNG_6_CA.pdf). Mở HTML cùng thư mục `evidence/` để xem ảnh gốc; PDF dùng khi cần tải lên một tệp duy nhất.

**Bản nguồn được kiểm tra:** HOSTORA 2.2.0, bộ phát hành `v2.2.0`.

**Ngày chạy:** 01/11/2026 (giờ Việt Nam).

**Môi trường:** production build Next.js chạy với SQLite kiểm thử cách ly; Chromium desktop và mobile viewport. Ollama chạy local cho bộ ca AI riêng. Link HTTPS Quick Tunnel được thử trong trình duyệt sau các bộ kiểm thử; link này tạm thời và không phải địa chỉ nộp cố định.

## Sáu ca tối thiểu theo cơ cấu Bảng A

| ID  | Nhóm                 | Dữ liệu / thao tác                                                                                           | Kỳ vọng                                                                | Kết quả thực tế ngày 01/11                                                                                                                                                                                               |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N01 | Bình thường          | Từ trang chủ mở tư vấn, đi 4 bước, xem 3 gói và bảng so sánh, chọn gói thứ hai, lưu lead thử nghiệm; mở FAQ. | Đủ 5 tính năng; lead giữ đúng gói đã chọn.                             | **Đạt** trên Chromium desktop và mobile viewport trong `tests/e2e/rubric.spec.ts`. Qua URL HTTPS tạm, thao tác thật cũng tới kết quả, chọn Premium, lưu lead trong trình duyệt và mở FAQ.                                |
| N02 | Bình thường          | Mô tả tiếng Việt về website bán mỹ phẩm, 5.000 lượt/tháng, 300.000đ/tháng, cần tên miền.                     | AI điền đúng 4 dữ kiện để khách xác nhận; có thể tiếp tục đến đề xuất. | **Đạt** khi thao tác trực tiếp qua URL HTTPS: AI điền 5.000 lượt và 300.000đ; đi tiếp đến 3 gói. Bộ tư vấn local riêng đạt **25/25 ca**, gồm phân tích, quyết định và giải thích; không suy ra độ đúng với mọi cách nói. |
| I01 | Đầu vào không hợp lệ | `POST /api/recommend` với `{}`.                                                                              | HTTP 400, lỗi đầu vào dễ hiểu; không có stack trace.                   | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`.                                                                                                                                                            |
| I02 | Đầu vào không hợp lệ | `POST /api/ai/chat` với `messages: []`.                                                                      | HTTP 400; không gọi inference vô ích.                                  | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`.                                                                                                                                                            |
| E01 | Ca biên              | Ngân sách hosting 10.000đ/tháng, thấp hơn mọi gói phù hợp.                                                   | Nói rõ không có gói đáp ứng; phương án còn lại chỉ để tham khảo.       | **Đạt** trên desktop/mobile trong `tests/e2e/advisor-quality.spec.ts`; có test domain tương ứng.                                                                                                                         |
| E02 | Sự cố                | Giả lập catalog/API đề xuất mất kết nối trong màn kết quả.                                                   | Hiện lỗi và cách thử lại; không thay bằng giá chưa xác minh.           | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`. Đây là sự cố **giả lập có chủ đích**, không phải lần mất mạng thật trên URL công khai.                                                                     |

## Kết quả kiểm định bổ sung

- `pnpm typecheck`, `pnpm lint`, `pnpm build`, mobile typecheck/lint: **đạt**.
- `pnpm test`: **263/263** unit/integration, 53 file đạt.
- `pnpm test:e2e:isolated`: **47 đạt, 1 bỏ qua có chủ đích**. Ca bỏ qua là thao tác sửa catalog trên mobile; luồng tương ứng chạy trên desktop.
- `pnpm audit:ui`: 12 trạng thái desktop/mobile, 0 phát hiện accessibility tự động, 0 lỗi trang, 0 tràn ngang. Audit tự động không chứng minh mọi tiêu chí WCAG hoặc khả năng dùng với người thật.
- `pnpm ai:check`: inference thật qua Ollama loopback đạt. `pnpm ai:evaluate:advisor`: **25/25** ca cố định đạt; 3 câu mới về blog, website giới thiệu và cửa hàng có thanh toán được phân loại đúng trong một lượt local.
- APK 2.2.0 (versionCode 23) đã cài đè bằng `adb install -r` trên Redmi Note 8 Pro mà không xóa dữ liệu. Bộ showcase đạt **20/20** và bộ native TC01–TC09 đạt ngày 01/11; báo cáo nằm tại [HOSTORA_MOBILE_9_CASES.html](HOSTORA_MOBILE_9_CASES.html).

## Giới hạn của bằng chứng

Playwright mobile viewport là trình duyệt, không phải APK Android; bằng chứng APK được ghi riêng trong báo cáo 9 ca. Các ca sự cố được mô phỏng để kiểm tra UI. Kết quả AI là bộ ca local nhỏ, không phải kiểm định độc lập về mọi câu hỏi hoặc tải sản xuất. Web HTTPS đang dùng Quick Tunnel nên chưa phải URL production cố định; video tối đa hai phút vẫn phải được quay và xem lại trên đúng bộ phát hành cuối trước khi nộp.
