# Ma trận 20 ca kiểm thử vòng loại — Đề 01, Bảng A

**Bản xem nhanh cho giám khảo:** [Trang minh chứng 20 ca](MINH_CHUNG_20_CA.html) · [Báo cáo 9 ca APK](HOSTORA_MOBILE_9_CASES.html) · [PDF 6 ca tối thiểu](MINH_CHUNG_6_CA.pdf).

**Bản nguồn:** HOSTORA 2.2.2, commit phát hành `127bef9`, release `v2.2.2`.

**Ngày đối chiếu:** 03/11/2026 (UTC+7).

**Môi trường:** Next.js production và SQLite kiểm thử cách ly; Chromium desktop/mobile; Ollama loopback cho AI thật; Android emulator API 36 cho APK universal. Ca mô phỏng lỗi được ghi riêng, không trình bày như sự cố production.

## Sáu ca tối thiểu của Bảng A

| ID | Nhóm | Dữ liệu / thao tác | Kỳ vọng | Kết quả gần nhất |
| --- | --- | --- | --- | --- |
| N01 | Bình thường | Đi bốn bước tư vấn, xem ba gói, so sánh, chọn gói thứ hai, lưu lead và mở FAQ. | Đủ năm tính năng; lưu đúng lựa chọn. | **Đạt** trên Chromium desktop/mobile trong `tests/e2e/rubric.spec.ts`. |
| N02 | Bình thường · AI local | Mô tả website mỹ phẩm, 5.000 lượt/tháng, 300.000đ/tháng và cần tên miền. | AI điền dữ kiện để khách xác nhận trước khi đề xuất. | **Đạt**: điền đúng lượt truy cập và ngân sách; người dùng vẫn sửa được. |
| I01 | Đầu vào sai | `POST /api/recommend` với `{}`. | HTTP 400, lỗi dễ hiểu, không lộ stack trace. | **Đạt**; không sinh gói khi thiếu năm trường bắt buộc. |
| I02 | Đầu vào sai | `POST /api/ai/chat` với `messages: []`. | Chặn trước khi gọi model. | **Đạt**, HTTP 400. |
| E01 | Ca biên | Ngân sách 10.000đ/tháng cho website bán hàng. | Không gắn nhãn phù hợp cho gói vượt ngân sách. | **Đạt**; hiện “Chưa có gói đáp ứng ngân sách này”. |
| E02 | Sự cố mô phỏng | Endpoint đề xuất trả lỗi 503. | Không hiển thị giá chưa xác minh; có nút thử lại. | **Đạt**; UI hiện lỗi và “Thử tải lại”. |

## Mười bốn ca bổ sung

| ID | Phạm vi | Dữ liệu / thao tác | Kỳ vọng | Kết quả gần nhất |
| --- | --- | --- | --- | --- |
| N03 | Web · Admin · APK | Admin phản hồi một hội thoại đang chờ. | Khách tự nhận phản hồi trong thread hiện có. | **Đạt**; hiện nhãn quản trị viên và trạng thái đã phản hồi. |
| N04 | Website Studio | Tạo preview từ brief hợp lệ rồi tải ZIP. | Link khách ổn định; ZIP có trang và hướng dẫn. | **Đạt** trong `tests/site-studio-delivery.test.ts`. |
| I03 | SEO Analyzer | Gửi URL `file:///etc/passwd`. | Từ chối scheme không an toàn, không lộ stack. | **Đạt** trong `tests/seo-audit-route.test.ts`, HTTP 400. |
| I04 | APK · validation | Nhập giới hạn trả trước âm, chữ hoặc vượt ngưỡng. | Chặn giá trị sai; trường bỏ trống vẫn hợp lệ. | **Đạt** trong `tests/mobile-showcase.test.ts`. |
| E03 | Giá thương mại | Gói có giá kỳ đầu nhưng chưa có giá gia hạn. | Không tự bịa hoặc coi là đủ điều kiện. | **Đạt** trong advisor/mobile cost tests; UI ghi “Chưa có dữ liệu”. |
| E04 | Tư vấn mâu thuẫn | Vừa nói cần tên miền, vừa nói đã có tên miền. | Hỏi lại thay vì đoán. | **Đạt** trong `tests/advisor-quality.test.ts`. |
| A01 | AI local thật | Chạy `pnpm ai:check` qua Ollama loopback. | Structured output hợp lệ; không gọi cloud LLM. | **Đạt** ở lượt phát hành 2.2.2. |
| A02 | PII + escalation | Câu ngoài phạm vi kèm email/số điện thoại thử nghiệm. | Ẩn PII trước khi lưu; chuyển admin một lần. | **Đạt** trong `tests/chat-route.test.ts`. |
| A03 | Quyền hội thoại | Đọc thread bằng token sai rồi token đúng. | Token sai không làm lộ thread. | **Đạt** trong `tests/ai-conversation-routes.test.ts`: sai → 404. |
| A04 | SEO dự phòng | Giả lập Ollama offline khi audit website. | Điểm tất định và crawler evidence vẫn hoạt động. | **Đạt** trong `tests/seo-audit-route.test.ts`; không dùng cloud fallback. |
| A05 | Kiểm soát Studio | Draft AI chứa lời hứa không có trong brief. | Repair hoặc chuyển template an toàn. | **Đạt** trong `tests/site-studio-workflow.test.ts`. |
| P01 | Motion APK | Cold-start app; bật reduced motion. | Cinematic đầy đủ, có bỏ qua; reduced motion có trạng thái tĩnh. | **Đạt** theo motion contract và bằng chứng Android 2.2.2. |
| P02 | Persistence APK | Cài đè APK bằng `adb install -r`. | Không mất hội thoại hoặc phiên hiện có. | **Đạt** trên emulator API 36, package `com.hostora.ai`, versionCode 25. |
| P03 | Bàn giao | Kiểm tra Source ZIP, Docker CPU/GPU, volume, checksum, secret và đường dẫn chéo nền tảng. | Chạy được Windows/macOS/Linux, dữ liệu bền vững, Ollama loopback. | **Đạt** với 13/13 `tests/release-handoff.test.ts`. |

## Cách hiểu bằng chứng

- **Mục chọn trên cổng thi:** `API / model AI thật`. Mock chỉ được dùng để cô lập dependency trong kiểm thử; sản phẩm không giả câu trả lời Mock thành AI thật.
- **AI thật:** Ollama chạy trên loopback, structured output có schema. Không có cloud LLM fallback.
- **Dự phòng/test cô lập:** sự cố API hoặc Ollama được mô phỏng có chủ đích để xác nhận UI/logic lỗi; template và điểm tất định không được trình bày như câu trả lời AI.
- **Browser mobile:** chỉ chứng minh responsive web, không thay thế APK.
- **APK:** bằng chứng Android được ghi riêng; không uninstall hoặc xóa dữ liệu để làm test xanh.
- **Điểm:** 20/20 ca đạt không đồng nghĩa 100 điểm hoặc bảo đảm top 10.

## Giới hạn còn lại

Hostname HTTPS cố định nhưng máy demo, Internet và tunnel phải đang bật. Email trong test dùng SMTP mock/Mailpit; không được diễn giải là đã kiểm chứng giao thư qua nhà cung cấp email công cộng. Hai adapter `chatbot-v8` và `studio-v3` vẫn là candidate. Video tối đa hai phút phải được quay và xem lại trên đúng bản phát hành trước khi nộp.
