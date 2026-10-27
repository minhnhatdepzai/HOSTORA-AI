# HOSTORA AI — Tổng hợp và audit giao diện mobile

## Kiểm tra bản 2.0.0 — 2026-10-26

Thiết bị thật: Redmi Note 8 Pro qua USB, package `com.hostora.ai`, versionCode 12, versionName 2.0.0. Bản arm64 đã được cài đè thành công; deep link `hostora://studio` mở đúng Website Studio ở độ phân giải vật lý, header nằm dưới tai thỏ và nội dung không bị thanh điều hướng Android che. Cold launch mất khoảng 1,1 giây theo Activity Manager; không thấy `FATAL EXCEPTION` hoặc lỗi React Native sau lần mở sạch. Ảnh kiểm chứng: [Website Studio trên Redmi](../output/hostora-studio-2.0.0-redmi.png).

Website Studio thu thập ý tưởng, khách hàng, loại hình, mục tiêu, phong cách, màu sắc, lưu lượng và ngân sách. Nội dung do Qwen local sinh phải qua schema; HTML xem trước do template cố định dựng và escape nội dung, còn thứ tự gợi ý hosting dùng logic tất định hiện có. Luồng API thật đã trả `generationMode: local-ai` cùng ba gợi ý hosting. Việc nhập form native tự động chưa hoàn tất vì `adb shell input text` trên bộ gõ MIUI kích hoạt tìm kiếm hệ thống; không tính thao tác automation đó là bằng chứng lỗi của app.

Hai APK 2.0.0 đã build thành công. Bản arm64 có SHA-256 `498a5e5729ef579a3844aa594e249fbf260befa7d20768425ca00610a3803a32`; bản universal có SHA-256 `bc2265566103d5dff7616cca4eaa3f3ce81efce62436d2c1b7d7186ceb41460f`. `apksigner` xác nhận chữ ký v2; `aapt` xác nhận bản universal có `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`, min SDK 24 và target SDK 36. Đây vẫn là debug certificate cục bộ, chưa phải bản ký phát hành Google Play.

Web app-first và Studio đã được kiểm tra desktop/mobile bằng Playwright; ảnh nằm trong `output/playwright/`. Web và mobile typecheck/lint đều qua, 75 unit test qua, production build thành công, AI runtime dùng Qwen và embedding local phản hồi, 24/24 luồng E2E desktop/mobile qua. Hai endpoint tải APK trả đúng tệp 2.0.0 và checksum nội dung tải về khớp artifact trên đĩa.

## Kiểm tra bản 1.8.0 — 2026-10-26

Thiết bị thật: Redmi Note 8 Pro qua USB, package `com.hostora.ai`, versionCode 10. Ảnh cuối được chụp ở độ phân giải vật lý 1080 × 2340, density 440; các ảnh từng bước tư vấn được chụp khi ADB tạm đặt 720 × 1560, density 293 để thao tác. Đã trả màn hình về độ phân giải và density vật lý sau QA.

| Màn/luồng | Quan sát trên Redmi | Ảnh |
| --- | --- | --- |
| Mở app | Logo trong hero khớp biểu tượng ngoài app; nền Skia có chuyển động, CTA và tab nằm trên thanh điều hướng Android. Intro MP4 sáu giây đã quan sát ở vòng kiểm tra trước khi đóng APK cuối; MP4 nhúng trong cả hai APK cuối khớp SHA-256 với tệp nguồn. | [Trang chủ cuối](../output/ui-1.8/home-physical-resolution.png), [intro](../output/ui-1.8/after-launch.png) |
| Chọn gói | Câu hỏi đầu, ba lựa chọn và nút Tiếp tục cùng hiện trên màn đầu. Đã bấm qua 4 bước, thử Quay lại và mở được kết quả. Phần mô tả bằng lời nằm dưới wizard, chỉ mở khi người dùng chọn. | [Bước 1](../output/ui-1.8/consult-physical-resolution.png), [bước 2](../output/ui-1.8/consult-step2.png), [bước 4](../output/ui-1.8/consult-step4.png) |
| Dịch vụ | 26 mục; giá có nguồn. Nút mua của gói đầu hiện trọn ở độ phân giải vật lý, không bị tab hoặc thanh Home che. | [Danh mục cuối](../output/ui-1.8/products-physical-resolution.png) |
| Kết quả | Nhãn “Đã kiểm tra” không xuống dòng; giá ưu đãi, kỳ thanh toán, giá gia hạn và nút mua đều nhìn được. Bấm mua mở trình duyệt ngoài app. | [Kết quả cuối](../output/ui-1.8/recommendations-release.png) |
| Hỏi đáp và Chi phí | Đã mở hai tab trực tiếp trên máy, kiểm tra ô nhập/nhóm gói và vị trí thanh tab. Màn Chi phí rút ngắn phần mở đầu để tổng tiền và chi tiết kỳ thanh toán hiện cùng màn đầu. | [Hỏi đáp](../output/ui-1.8/assistant-final.png), [Chi phí cuối](../output/ui-1.8/cost-release-physical.png) |

Build Android arm64 và universal thành công. `apksigner` xác nhận chữ ký v2; `aapt` xác nhận bản arm64 chỉ có `arm64-v8a`, bản universal có `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`. `SHA256SUMS.txt` kiểm tra cả hai tệp. HEAD và GET tại `/downloads/android` và `/downloads/android-universal` trả tệp cục bộ 1.8.0; SHA-256 của nội dung tải về khớp APK trên đĩa. Đã cài đè bản arm64 cuối bằng ADB và xác nhận versionCode 10. Không thấy `FATAL EXCEPTION` của app trong logcat sau các luồng đã thử.

Web typecheck, lint, 52 unit test, build, 24 luồng Playwright ở desktop/mobile và `ai:check` đều qua trong vòng kiểm tra này. Ảnh web desktop/mobile của vòng thiết kế nằm tại `output/playwright/hostora-1.7-web-*-verified.png`; sau đó web chỉ đổi đường tải APK. Các luồng Android được quan sát trực tiếp trên một Redmi; chưa có kiểm thử thiết bị Android khác, iOS hoặc đo hiệu năng GPU dài hạn. APK hiện dùng debug certificate cục bộ, chưa phải bản ký để phát hành Google Play.

## Ghi chép lịch sử — 2026-10-23

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

## Cập nhật và kiểm tra APK 2.0.0 — 2026-10-26

Build arm64 vừa hoàn tất bằng `assembleRelease -PreactNativeArchitectures=arm64-v8a`; APK có duy nhất ABI `arm64-v8a`, package `com.hostora.ai`, versionCode 12 và versionName 2.0.0. Chữ ký SHA-256 trùng bản cài trước, nên `adb install -r` cập nhật thành công và giữ dữ liệu app. Đã thay `mobile/releases/HOSTORA-AI-2.0.0-arm64.apk` và `HOSTORA-AI-2.0.0.apk`; universal 2.0.0 giữ nguyên. SHA-256 arm64 mới: `3fb825f42c2f32c0c9d46c2882023ad678c33018ddbfd698309176d42288b03f`.

Trên Redmi Note 8 Pro, cold launch mở màn intro, nút Bỏ qua đi tới kết nối dịch vụ, kết nối USB qua `adb reverse tcp:3000 tcp:3000` báo “SẴN SÀNG”, rồi quay lại được trang chủ. Thanh trạng thái và điều hướng Android không che header, CTA hay tab dưới. Logcat sau cài và mở app không có `FATAL EXCEPTION` hoặc lỗi React Native. Ảnh chụp bản cài mới: [intro](../output/hostora-redmi-after-release.png), [kết nối USB](../output/hostora-redmi-connected.png), [trang chủ](../output/hostora-redmi-after-release-main.png).

## Mua dịch vụ trên HOSTORA — 2026-10-26

Đã đổi CTA trong catalog web/app từ mở trang mua nhà cung cấp sang **Đặt mua qua HOSTORA**. Khách gửi yêu cầu kèm email/số điện thoại và ghi chú nhu cầu ngay trên nền tảng. Giá “từ” vẫn chỉ để tham khảo; admin chốt tổng tiền, kỳ hạn, thuế và điều kiện rồi phát hành hóa đơn HOSTORA. Khách xem hóa đơn/trạng thái tại `/orders` trên web hoặc tab Đơn hàng trong app. Yêu cầu lưu trong SQLite, hiển thị trong hàng đợi admin, không gửi vào AI/Langfuse và bị xóa sau 90 ngày khi admin tải danh sách. QA chỉ mở form, không tạo yêu cầu bán thử.

Website Studio, catalog và trang đơn hàng vẫn responsive. Form mua đã xem trực quan ở viewport 390 × 844 và 1440 × 900; modal nằm đúng viewport, không tràn ngang. Trên Redmi Note 8 Pro, APK arm64 2.0.1 (versionCode 13) cập nhật thành công; nút mua mở bottom sheet, các trường và nút gửi nằm phía trên vùng điều hướng Android. Ảnh: [catalog và CTA trên Redmi](../output/hostora-redmi-2.0.1-products.png), [form mua trên Redmi](../output/hostora-redmi-2.0.1-purchase-modal.png), [form web mobile](../output/playwright/hostora-services-purchase-mobile.png), [form web desktop](../output/playwright/hostora-services-purchase-desktop.png).

APK arm64 2.0.1 có SHA-256 `6eeee1f0eef166bab778e8e916d5155a9f0252bc1b013eb5897834ef5fab4785`; universal có SHA-256 `ed753e5de79450e672a5b629ca9a133f0581af3be00282ddafb17bb97cf9a9bd`. Hai APK ký cùng debug certificate local; arm64 có ABI `arm64-v8a`, universal có `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`. Typecheck/lint web/mobile và production build web đều qua; chưa chạy luồng API tạo yêu cầu bằng dữ liệu giả và chưa có tài khoản merchant để thử giao dịch sandbox đầu-cuối. Khi bật Stripe Checkout/VNPay, gateway có thể hiển thị trang thanh toán riêng; catalog, báo giá, hóa đơn và lịch sử vẫn ở HOSTORA.

## Kiểm tra lựa chọn tùy chỉnh — 2026-10-26

Bản 2.0.2 cho phép nhập lượng truy cập và ngân sách riêng; mức phổ biến chỉ còn là nút chọn nhanh. Từ bản 2.0.3, web dùng một ô mở bảng màu hệ thống và app dùng bảng HSV kéo được, cả hai vẫn nhận mã HEX sáu chữ số. API kiểm tra định dạng màu và giới hạn số trước khi dựng demo hoặc tính gói. Thiết bị đã được dùng để kiểm tra bản 2.0.2 trước đó; bản 2.0.3 cần xác minh thao tác kéo màu trên Redmi sau khi cài APK.

APK arm64 SHA-256 `c599743820465e5498e17925a988981042fccc5f9580c74641f57a6694ea686c`; universal SHA-256 `ecd380f19fbbfd8c07e0cee792b41e9649b8c32516ec55dc15e87721ce42a29f`. `apksigner` xác nhận chữ ký v2 debug local. Typecheck, lint, 75 web tests, Playwright 390×844 và Android build đều qua. Chưa chạy production web build vì Next dev server đang dùng chung thư mục `.next`; APK chưa ký production.
