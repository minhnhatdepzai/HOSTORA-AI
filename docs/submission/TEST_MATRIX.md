# Ma trận kiểm thử vòng loại — Đề 01, Bảng A

**Bản xem nhanh cho giám khảo:** [Trang minh chứng 9 ca](MINH_CHUNG_9_CA.html) · [Báo cáo 9 ca APK](HOSTORA_MOBILE_9_CASES.html) · [PDF 6 ca tối thiểu](MINH_CHUNG_6_CA.pdf). Mở HTML từ Source ZIP để các ảnh gốc đi kèm hiển thị đầy đủ.

**Bản nguồn được kiểm tra:** HOSTORA 2.2.1, bộ phát hành `v2.2.1`.

**Ngày chạy gần nhất:** 02/11/2026 (giờ Việt Nam).

**Môi trường:** production build Next.js chạy với SQLite kiểm thử cách ly; Chromium desktop và mobile viewport. Ollama chạy local cho bộ ca AI riêng. Android emulator API 36 chạy APK universal 2.2.1; HTTPS công khai qua hostname Tailscale Funnel cố định, vẫn phụ thuộc máy demo đang bật.

## Chín ca: sáu ca tối thiểu và ba ca hỗ trợ AI

| ID  | Nhóm                 | Dữ liệu / thao tác                                                                                           | Kỳ vọng                                                                      | Kết quả thực tế gần nhất                                                                                                                                                                                                 |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N01 | Bình thường          | Từ trang chủ mở tư vấn, đi 4 bước, xem 3 gói và bảng so sánh, chọn gói thứ hai, lưu lead thử nghiệm; mở FAQ. | Đủ 5 tính năng; lead giữ đúng gói đã chọn.                                   | **Đạt** trên Chromium desktop và mobile viewport trong `tests/e2e/rubric.spec.ts`. Qua URL HTTPS tạm, thao tác thật cũng tới kết quả, chọn Premium, lưu lead trong trình duyệt và mở FAQ.                                |
| N02 | Bình thường          | Mô tả tiếng Việt về website bán mỹ phẩm, 5.000 lượt/tháng, 300.000đ/tháng, cần tên miền.                     | AI điền đúng 4 dữ kiện để khách xác nhận; có thể tiếp tục đến đề xuất.       | **Đạt** khi thao tác trực tiếp qua URL HTTPS: AI điền 5.000 lượt và 300.000đ; đi tiếp đến 3 gói. Bộ tư vấn local riêng đạt **25/25 ca**, gồm phân tích, quyết định và giải thích; không suy ra độ đúng với mọi cách nói. |
| I01 | Đầu vào không hợp lệ | `POST /api/recommend` với `{}`.                                                                              | HTTP 400, lỗi đầu vào dễ hiểu; không có stack trace.                         | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`.                                                                                                                                                            |
| I02 | Đầu vào không hợp lệ | `POST /api/ai/chat` với `messages: []`.                                                                      | HTTP 400; không gọi inference vô ích.                                        | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`.                                                                                                                                                            |
| E01 | Ca biên              | Ngân sách hosting 10.000đ/tháng, thấp hơn mọi gói phù hợp.                                                   | Nói rõ không có gói đáp ứng; phương án còn lại chỉ để tham khảo.             | **Đạt** trên desktop/mobile trong `tests/e2e/advisor-quality.spec.ts`; có test domain tương ứng.                                                                                                                         |
| E02 | Sự cố                | Giả lập catalog/API đề xuất mất kết nối trong màn kết quả.                                                   | Hiện lỗi và cách thử lại; không thay bằng giá chưa xác minh.                 | **Đạt** trên desktop/mobile trong `tests/e2e/rubric.spec.ts`. Đây là sự cố **giả lập có chủ đích**, không phải lần mất mạng thật trên URL công khai.                                                                     |
| S01 | Hỗ trợ AI            | Khách hỏi ngoài phạm vi và để lại số điện thoại thử nghiệm.                                                  | Ẩn thông tin liên hệ, lưu hội thoại, chuyển admin và lên lịch email một lần. | **Đạt** trên web và APK; unit test xác nhận database không chứa số gốc, SMTP mock nhận đúng cảnh báo và link `/admin/support`. Email thật đến Inbox chưa được xác minh độc lập.                                          |
| S02 | Bảo vệ hội thoại     | Đọc hội thoại khách ẩn danh bằng token sai; thử trả lời admin từ origin lạ.                                  | Không lộ hội thoại; từ chối thao tác quản trị không hợp lệ.                  | **Đạt**: token sai nhận 404, origin lạ nhận 403; token đúng và phiên admin hợp lệ mới đọc/trả lời được.                                                                                                                  |
| S03 | Phản hồi người thật  | Admin trả lời từ `/admin/support`; web/app khách giữ nguyên màn hình.                                        | Khách tự nhận phản hồi, thấy nhãn quản trị viên và trạng thái đã trả lời.    | **Đạt** trên Chromium và APK Android. Polling bao phủ cả hội thoại `active` chuyển muộn sau stream; test hồi quy giữ nút hành động AI khi trạng thái chưa đổi.                                                           |

## Kết quả kiểm định bổ sung

- `pnpm typecheck`, `pnpm lint`, `pnpm build`, mobile typecheck/lint: **đạt**.
- `pnpm test`: **282/282** unit/integration, 57 file đạt.
- `pnpm test:e2e:isolated`: **55 đạt, 1 bỏ qua có chủ đích** trên desktop/mobile. Ca bỏ qua là thao tác sửa catalog trên mobile; luồng tương ứng chạy trên desktop.
- `pnpm audit:ui`: 12 trạng thái desktop/mobile, 0 phát hiện accessibility tự động, 0 lỗi trang, 0 tràn ngang. Audit tự động không chứng minh mọi tiêu chí WCAG hoặc khả năng dùng với người thật.
- `pnpm ai:check`: inference thật qua Ollama loopback đạt. `pnpm ai:evaluate:advisor`: **25/25** ca cố định đạt; 3 câu mới về blog, website giới thiệu và cửa hàng có thanh toán được phân loại đúng trong một lượt local.
- APK universal 2.2.1 (versionCode 24) build đủ `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` và cài đè bằng `adb install -r` trên emulator mà không xóa dữ liệu. Cinematic hai chương đã được quay ở cold-start và qua nút phát lại; cả hai trở về đúng nội dung sau phim và logcat không có fatal/crash. Bộ native TC01–TC09 trên Redmi trước đó nằm tại [HOSTORA_MOBILE_9_CASES.html](HOSTORA_MOBILE_9_CASES.html).

## Giới hạn của bằng chứng

Playwright mobile viewport là trình duyệt, không phải APK Android; bằng chứng APK được ghi riêng trong báo cáo 9 ca. Các ca sự cố được mô phỏng để kiểm tra UI. Kết quả AI là bộ ca local nhỏ, không phải kiểm định độc lập về mọi câu hỏi hoặc tải sản xuất. Hostname HTTPS cố định nhưng máy demo tắt thì web vẫn offline; video tối đa hai phút vẫn phải được quay và xem lại trên đúng bộ phát hành cuối trước khi nộp.
