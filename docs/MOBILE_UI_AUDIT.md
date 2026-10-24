# HOSTORA AI — Tổng hợp và audit giao diện mobile

Ngày kiểm tra: **2026-10-23**. Thiết bị thật: **Redmi Note 8 Pro**, Android arm64.

## Kết quả tổng hợp

Giao diện web trước đó và toàn bộ luồng trong product prompt đã được gom lại thành cấu trúc mobile ưu tiên tác vụ. Thay vì đưa mọi chức năng lên bottom bar, app dùng 5 tab chính và 7 màn hình sâu:

| Khu vực      | Màn hình           | Mục đích                                              |
| ------------ | ------------------ | ----------------------------------------------------- |
| Trang chủ    | Dashboard          | Điểm sẵn sàng, CTA tư vấn, lối tắt công cụ            |
| Tư vấn       | Requirement wizard | Thu thập loại site, traffic, ngân sách và yêu cầu     |
| Trợ lý       | Local RAG chat     | Hỏi Qwen, giữ lịch sử cục bộ, hiển thị Markdown/nguồn |
| Công cụ      | Tool hub           | Product, SEO, Domain, Analyzer, Knowledge             |
| Leads        | Local CRM          | Danh sách lead và quản lý dữ liệu local               |
| Màn hình sâu | Recommendations    | Top 3 gói, giá ưu đãi/gia hạn và lý do                |
| Màn hình sâu | Product Explorer   | Lọc/tìm 26 sản phẩm thuộc 6 nhà cung cấp              |
| Màn hình sâu | SEO Intelligence   | Audit kỹ thuật, ưu tiên và nguồn RAG                  |
| Màn hình sâu | Domain Advisor     | Gợi ý tên miền, không giả availability                |
| Màn hình sâu | Website Analyzer   | Phân tích HTML công khai qua backend an toàn          |
| Màn hình sâu | Knowledge          | Truy xuất kho kiến thức local                         |
| Màn hình sâu | Settings           | Chọn LAN/USB, lưu URL và health check model           |

## Hệ thống thiết kế

- Ink navy làm nền AI/technical; mint cho trạng thái an toàn/ready; cobalt cho CTA và điều hướng.
- Be Vietnam Pro xuyên suốt, phân cấp rõ từ eyebrow đến headline và body.
- Card bo lớn, khoảng trắng rộng, tap target đủ lớn, safe area và bottom bar cố định.
- Trạng thái local AI luôn nhìn thấy: `ONLINE LOCAL`, `LOCAL`, `READY`, loading và lỗi kết nối.
- App icon/splash riêng của HOSTORA được sinh bằng ImageGen rồi tích hợp vào native build.

## QA giao diện trên máy thật

### Bản 1.2.0 — đối chiếu Đề 01

| Yêu cầu đề bài                                      | Kết quả Android 1.2.0                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Form loại website, traffic, ngân sách, tên miền     | Wizard đã có; vẫn dẫn tới kết quả top 3                                                        |
| 01 gói tốt nhất + 02 thay thế và lý do dễ hiểu      | API catalog 13 gói chấm điểm tất định; 3 card và giải thích AI local                           |
| Bảng so sánh giá, dung lượng, băng thông, tính năng | Đã thêm bảng cuộn ngang với 10 tiêu chí, cố định cột nhãn; gồm SSL, backup, CDN, kỳ thanh toán |
| Đăng ký tư vấn tên + điện thoại lưu trên thiết bị   | Đã thêm CTA/form ngay trong kết quả; lưu `planId` + tên gói đã chọn vào AsyncStorage           |
| FAQ accordion 05 câu                                | Đã thêm 5 câu; thử mở câu thứ hai trên Redmi và xác nhận câu đầu đóng                          |

Đã cài bản 1.2.0 arm64 lên Redmi Note 8 Pro. UI hiển thị catalog online 13 gói; bảng so sánh cuộn ngang đến cột thứ ba Vietnix WordPress 4 trong khi cột tiêu chí vẫn hiện; chọn gói thay thế **Hostinger Premium**, form hiện đúng gói, lưu lead QA, mở tab Leads xác nhận đúng gói rồi xóa **chỉ** lead QA. Bảng chi phí của Hostinger Không giới hạn trả 2.683.200đ cho kỳ 48 tháng và “Chưa đủ dữ liệu” cho 12 tháng vì giá công bố gắn với cam kết 48 tháng. Ảnh kiểm tra: [bảng so sánh](../mobile/test-results/hostora-1.2.0-comparison.png), [cột thứ ba](../mobile/test-results/hostora-1.2.0-comparison-third.png), [FAQ](../mobile/test-results/hostora-1.2.0-faq.png), [form chọn gói](../mobile/test-results/hostora-1.2.0-lead.png), [chi phí](../mobile/test-results/hostora-1.2.0-cost.png).

Màn web True Cost cũng được sửa để không suy diễn giá ưu đãi 48 tháng cho kỳ ngắn hơn hoặc tự điền giá gia hạn chưa xác minh. `allowedDevOrigins` giới hạn `127.0.0.1` sửa lỗi Next dev chặn hydration khi Playwright dùng loopback; không mở origin công khai.

### Bản 1.1.0 — bằng chứng trước đó

Đã mở và kiểm tra trực quan bản 1.1.0: Product Explorer, Recommendations và SEO Intelligence trên Redmi Note 8 Pro. Các màn Home, Tư vấn, Trợ lý, Công cụ, Leads, Domain, Analyzer, Knowledge và Settings đã được kiểm tra ở vòng 1.0.0. Artifact ảnh nằm tại `mobile/test-results/` hoặc thư mục QA tạm trên máy phát triển.

Các lỗi phát hiện và đã sửa:

1. Starter chips ở màn Trợ lý kéo giãn theo chiều dọc → giới hạn chiều cao horizontal scroller.
2. Action pill ở header màn hình sâu bị wrap → cân bằng vùng back/action.
3. URL local khó nhập qua thiết bị → thêm preset `LAN mặc định` và `USB localhost`.
4. Nội dung Qwen hiện Markdown thô → tích hợp renderer cho heading, bold, list, link và table.
5. Manifest có quyền overlay/storage không dùng → chặn trong `app.json`; APK cuối chỉ còn các quyền cần cho network/runtime.

## Bằng chứng runtime

- APK arm64 cài thành công qua `adb install -r`.
- Cold launch cuối: khoảng **1.4 giây** theo Android Activity Manager; process React Native sống và không thấy `FATAL EXCEPTION` trong log kiểm tra.
- Settings/backend trả `READY` với `qwen3.5:9b-q8_0` và `qwen3-embedding:4b` qua `adb reverse`.
- Một hội thoại “Shop mới nên chọn gói nào?” đã gọi `/api/ai/chat`, nhận câu trả lời grounded và hiển thị Markdown đúng trên điện thoại.
- Product Explorer hiển thị đúng 26 sản phẩm, 6 nhà cung cấp, 9 nhóm; Recommendations xác nhận xếp hạng từ 13 gói.
- SEO Intelligence gọi API thật từ điện thoại, audit `https://example.com` và hiển thị score 40/100 cùng nhận định AI có nguồn.
- APK arm64 đã qua `apksigner verify`; package `com.hostora.ai`, version `1.1.0`, versionCode 2, min SDK 24, target SDK 36.

## Giới hạn còn lại

- Chưa đo visual regression tự động theo pixel; kết quả hiện là QA trực quan trên một thiết bị vật lý.
- Chưa kiểm tra iPhone/iOS vì không có macOS/Xcode trong môi trường Ubuntu.
- Kết nối Wi-Fi trực tiếp có thể cần người dùng cho phép TCP 3000 trong firewall; không dùng `sudo` để tự mở cổng.
- APK dùng debug certificate cho local distribution; bản Google Play cần production keystore và quy trình release riêng.
