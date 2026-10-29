# HOSTORA — web, admin, Android và lộ trình tới 95 điểm

Ngày đánh giá: 29/10/2026. Mục tiêu: Đề 01, rubric người dùng cung cấp; ít nhất 6 ca kiểm thử. Phạm vi hiện tại là source phát triển và APK 2.1.0 trên Redmi Note 8 Pro. Các báo cáo 2.0.9 và điểm 72/82 trước đây là lịch sử. Không suy ra thứ hạng từ số công nghệ hoặc số test.

## Kết luận chấm thử

**Khoảng 83/100 theo bằng chứng hiện có.** Có nền tảng cạnh tranh, nhưng chưa chứng minh mức 95. Điểm này chấm cả sản phẩm một lần, không cộng ba bảng 100 điểm cho web/admin/app. Phần phản biện vẫn tạm tính vì chưa phỏng vấn người dự thi.

95/100 là mục tiêu chất lượng và trình bày, không bảo đảm chung kết top 10/265: chưa có điểm hoặc sản phẩm của các đội khác. Để bảo vệ mức 95 cần kết quả ở máy/đường mạng độc lập, hành trình AI đáng tin cậy, usability có quan sát và phần phản biện thật.

| Tiêu chí | Hiện tại, giả lập | Mục tiêu | Điều kiện tăng điểm |
|---|---:|---:|---|
| Chức năng, đúng nghiệp vụ | 24/25 | 24/25 | Giữ trọn 5 chức năng, phân biệt tiền trả trước/gia hạn và không có gói phù hợp; xác minh thêm giá/điều kiện trước nộp. |
| Kỹ thuật, chất lượng mã | 18/20 | 19/20 | Build/cài lại tái lập từ cùng bản nguồn, cấu hình SDK/JDK rõ, giảm nhánh logic trùng và có kiểm chứng hợp đồng web/app. |
| AI, kiểm soát đầu ra | 12/15 | 14/15 | Tập độc lập có paraphrase/phủ định/mâu thuẫn, đo cold/warm và nhiều lượt đồng thời; không có claim thương mại sai trong tập chấm. |
| Kiểm thử, xử lý lỗi | 13/15 | 14/15 | Ca native lặp lại, lỗi mạng/model/storage/restart; báo cáo có actual/expected/evidence và không che ca lỗi/skip. |
| Làm chủ Vibe Coding, phản biện | 10/15 tạm tính | 14/15 | Bảo vệ kiến trúc và một chuỗi prompt thật → lỗi thật → test → quyết định sửa; trả lời câu hỏi trực tiếp. |
| UI/UX | 3/5 | 5/5 | Xử lý findings contrast/ARIA, intro không để lộ control phía sau cho accessibility; giảm ma sát tìm gói trên app. |
| Triển khai, bàn giao | 3/5 | 5/5 | URL HTTPS hoạt động từ mạng ngoài, source/APK/video cùng phiên bản, cài máy khác theo README, có phương án demo dự phòng. |
| **Tổng** | **83/100** | **95/100** | 12 điểm tăng có điều kiện; chưa được công nhận chỉ vì đã cài công cụ. |

## Kết quả mới trong lượt này

- Web typecheck và lint đạt. Unit **198/198**, 48 file, đạt.
- Production build mặc định đạt; có cảnh báo OpenTelemetry/Gradle deprecation được giữ trong log, không coi cảnh báo là test thất bại.
- Mobile typecheck/lint đạt.
- Toàn bộ E2E trên production SQLite cách ly: **47 đạt, 1 bỏ qua có chủ đích, 0 lỗi**. Đã chạy lại qua lệnh mới `test:e2e:isolated` và nhận cùng kết quả; ca skip là CRUD danh mục trên mobile vì desktop đã chạy.
- AI smoke thật đạt. Bộ advisor thật **24/25**: ca đầu HTTP 503 sau khoảng 90 giây; các ca sau hoàn tất. Trung vị quan sát khoảng 3,08 giây, p95 trong tập này khoảng 61,53 giây. Đây là tập nhỏ, tuần tự, không phải p95 production. Không được dùng con số 25/25 của lần trước thay thế.
- Mobile MCP đã initialize, khám phá Redmi, đọc tree và chụp ảnh qua giao thức MCP thật. Luồng native từ cold launch/intro → trang chủ → bốn bước → kết quả **đạt**, có bảng giá tải được và ảnh từng bước. Test không gửi lead hoặc thanh toán.
- Kết nối app ban đầu không tải catalog: app đã trỏ `127.0.0.1:3000` nhưng không có ADB reverse. Đã tạo `adb reverse tcp:3000 tcp:3000` và xác nhận màn Kết nối dịch vụ “SẴN SÀNG”. Đây là cấu hình phát triển USB, không chứng minh truy cập Internet.
- Build arm64 source hiện tại đã đạt sau khi chỉ rõ Android SDK và dùng JDK 17 có javac. Ban đầu Gradle chọn Java 21 runtime không có compiler; đó là lỗi môi trường phát triển, không phải lỗi luồng kinh doanh.
- Runner `android:update` đã được chạy thật: build đạt, metadata khớp, `adb install -r` trả Success và mở app 2.1.0. Không uninstall/clear storage. Sau cài đè đã chạy lại native smoke và đạt đủ bốn bước đến bảng giá. Đây là cập nhật cục bộ trên thiết bị; không tự phát hành lên GitHub hay thay bộ ZIP/video nộp cũ.
- Maestro CLI 2.12.0 đã cài và chạy được, nhưng driver trên Redmi bị chặn với `INSTALL_FAILED_USER_RESTRICTED`. Đang chờ người dùng cho phép cài qua USB; không tính native Maestro flow là đã đạt. Mobile MCP đã kiểm tra được luồng native thay thế.

Các E2E admin dùng phiên ký kiểm thử và SMTP tắt; chúng chứng minh hành vi sau đăng nhập, không chứng minh email OTP thật đã giao. Các ca có mock vẫn được phân biệt với AI thật. Không chạy trên SQLite khách đang dùng.

## Nhận xét theo từng bề mặt

### Web khách hàng

Điểm tốt: CTA tư vấn dễ thấy; wizard, top 3, bảng so sánh và lead đi được trong E2E; trạng thái ngân sách thấp không còn giả vờ chọn gói phù hợp. Giá quy đổi tháng và khoản trả trước được nói rõ. Trang kết quả không có vi phạm axe trong trạng thái đã quét.

Khoảng trống: hero thương hiệu lớn hơn phần giải thích cụ thể về hosting/domain; cần kiểm chứng người không rành kỹ thuật hiểu ngay bước tiếp theo. Một số chữ nhỏ trên nền xanh nhạt chưa đủ tương phản; wizard có chữ mô tả khoảng 4,41:1 so với ngưỡng 4,5:1. Đừng sửa bằng cách bỏ hết màu thương hiệu: chỉnh token chữ/nền và đo lại.

### Web admin

Điểm tốt: có cổng đăng nhập, dashboard, doanh thu, danh mục, đơn hàng và hỗ trợ. E2E xác nhận tạo/xuất bản/lưu trữ dịch vụ với dữ liệu test cách ly; không bỏ xác thực để làm test xanh. Screenshot desktop/mobile không tràn ngang toàn trang.

Khoảng trống đã xác minh: `.admin-revenue-chart` đặt `aria-label` trên div chưa có role phù hợp. Các mô tả, nhãn nhỏ và chữ trong biểu đồ cần chỉnh tương phản. Axe báo 126 node contrast trên admin ở mỗi viewport; nhiều node là chữ/glyph lặp trong một vùng, **không đồng nghĩa 126 lỗi nghiệp vụ độc lập**. Cần sửa theo token/component rồi quét lại, không sửa từng glyph.

Khoảng trống vận hành: chưa có bằng chứng OTP email end-to-end, restore backup trên máy độc lập, thao tác của hai nhân viên hoặc bộ dữ liệu đủ lớn để đánh giá lọc/phân trang. Không bắt buộc thêm dashboard hay 3D mới để đạt điểm; ưu tiên những tác vụ vận hành có thể trình diễn chắc chắn.

### Android

Điểm tốt: package đang cài đúng 2.1.0/versionCode 22, UI native có vùng an toàn, có màn chọn cấu hình USB và xử lý lỗi catalog. Mobile MCP đã đi đủ bốn bước đến kết quả trên máy thật, không suy diễn từ browser mobile.

Khoảng trống: intro 7 giây vẫn để cây accessibility của trang chủ phía sau xuất hiện; các probe đầu tiên có thể tìm thấy CTA trong tree khi intro còn che màn hình. Đây là lý do cần xử lý visibility/modal accessibility, không chỉ tăng thời gian chờ test. Màn kết quả có khối cảnh báo dài đẩy lựa chọn/giá xuống thấp. Cần giữ thông tin tiền trả trước nhưng rút gọn một câu chính, cho mở chi tiết.

Kết nối backend là điểm dễ hỏng khi đem thi: USB reverse mất sau ngắt thiết bị; URL Quick Tunnel không phải địa chỉ cố định. App cần trạng thái kết nối dễ hiểu, retry và hướng dẫn thao tác phù hợp người dùng. Chưa thử đầy đủ TalkBack, font lớn, offline sau restart, đa thiết bị, đổi mạng hoặc vòng đời background/resume.

## Audit accessibility tự động mới

Quét 6 route × 2 viewport (1440×900 và 390×844), reduced motion, browser thật, chờ dashboard hết loading. Không có page error hoặc tràn ngang toàn trang ở các trạng thái này.

| Route | Findings chính |
|---|---|
| `/` | Contrast: 12 node desktop, 15 node mobile |
| `/consultation` | Contrast: 1 node mỗi viewport |
| `/recommendations` | Không có vi phạm axe trong trạng thái đã quét |
| `/admin` | 1 node ARIA và 126 node contrast mỗi viewport |
| `/admin/orders` | Không có vi phạm axe trong trạng thái đã quét |
| `/admin/support` | Contrast: 2 node mỗi viewport |

Ví dụ nguồn: chữ `#687c76` trên nền `#b5efd2` ở một nhãn tải app chỉ đạt khoảng 3,43:1; text thông thường cần 4,5:1. Axe không chứng minh WCAG toàn diện; còn cần keyboard, focus, screen reader và gesture/target size trên thiết bị thật. Các finding style của Impeccable chỉ là heuristic, không tự động trừ điểm nếu không kiểm chứng ảnh/ngữ cảnh.

## Bàn giao và URL

Source/app.json/APK phát triển đã lên 2.1.0, trong khi bộ ZIP/video/checksum và GitHub prerelease được mô tả trong handoff vẫn là 2.0.9. Cần chốt rõ phiên bản nộp và quay/đóng gói lại cùng phiên bản trước khi đòi điểm bàn giao tối đa.

URL Quick Tunnel ghi trong tài liệu (`consultation-directory-budgets-plus.trycloudflare.com`) không phân giải DNS trong lượt kiểm tra này, cả `/`, `/admin`, `/downloads/android`. Đây là quan sát tại máy kiểm tra, không phải kết luận mọi mạng đều như vậy. Cần dùng URL được quản lý ổn định và kiểm tra bằng thiết bị ngoài mạng phát triển; không tự tạo thêm public tunnel trong đợt setup công cụ này.

## Thứ tự thực hiện để tiến tới 95

| Ưu tiên | Việc cụ thể | Bằng chứng nghiệm thu | Phần điểm hỗ trợ |
|---|---|---|---|
| P0 | Chốt nguồn, APK, link tải, video, SHA cùng version; ổn định endpoint | Cài máy khác/điện thoại 4G, mở web/admin và gọi AI đúng luồng, đúng artifact | Bàn giao +2 |
| P0 | Đo và xử lý timeout AI | Tách cold/warm, timeout/retry/queue dễ hiểu; chạy tập độc lập nhiều lượt, ghi cả lỗi | AI +2, test +1 |
| P1 | Sửa contrast/ARIA/intro accessibility và rút gọn cảnh báo app | Quét lại axe, keyboard, TalkBack/font lớn, ảnh desktop/mobile/native sau sửa | UI/UX +2 |
| P1 | Kiểm thử native lặp lại và trạng thái lỗi | Luồng thường, không đủ ngân sách, API lỗi, input sai, restart giữ dữ liệu, update APK giữ dữ liệu | Test +1 đã gộp, kỹ thuật +1 |
| P1 | Chuẩn bị phản biện từ công việc thật | 3 ví dụ prompt → lỗi → test → sửa, giải thích scoring/nguồn/null/local-first; diễn tập có người hỏi | Phản biện +4 |
| P2 | Quan sát 5–10 chủ shop | Tỷ lệ đi hết luồng, thời gian, mức hiểu gia hạn/trả trước, ghi cả hiểu nhầm | Củng cố nghiệp vụ/UI/AI, không tự cộng thêm ngoài rubric |

Các phần điểm hỗ trợ có thể giao nhau; không cộng hai lần một bằng chứng. Giữ mục tiêu 95 trong bảng rubric, không biến checklist này thành một thang điểm mới.

Một bộ nghiệm thu nên có ít nhất 6 ca sau, mỗi ca ghi input/expected/actual/evidence: (1) shop đủ ngân sách; (2) không có gói phù hợp; (3) lead sai và lead hợp lệ cùng tồn tại; (4) dữ liệu tính năng chưa xác minh; (5) API/model không khả dụng; (6) lưu/reload/cài đè APK giữ dữ liệu. Bổ sung câu tự nhiên chưa có trong tập train/test và một buổi phản biện độc lập.

## Công cụ đã cài và workflow dùng lại

Xem [CODEX_TOOLCHAIN.md](../CODEX_TOOLCHAIN.md) để biết repo nguồn, version, nơi cài và giới hạn. Đã bổ sung:

- Mobile MCP 1.0.14/mobilecli 1.0.21: đã có initialize, tree, screenshot, tương tác và luồng native thành công. Đã tắt telemetry theo cấu hình của công cụ; các dependency HTTP được patch bằng override, npm audit sidecar sau cài báo 0 vulnerability.
- Maestro CLI 2.12.0: archive được đối chiếu SHA; flow và JUnit command đã chuẩn bị; chờ quyền driver Redmi.
- 5 skill Expo chính thức và skill `hostora-quality` để Codex phát triển/đánh giá có bằng chứng.
- axe Playwright, runner production/SQLite cách ly, runner build và cài đè APK, doctor môi trường.

```bash
pnpm agent:doctor
pnpm agent:verify
pnpm test:e2e:isolated
pnpm audit:ui
pnpm test:mobile:mcp
pnpm test:mobile:e2e
pnpm android:update
```

`audit:ui` hiện exit 1 vì những finding thật ở trên; đó không phải kết quả pass. `test:mobile:e2e` chưa pass do quyền thiết bị. Các công cụ/skill mới cần lượt hoặc phiên Codex mới để xuất hiện trong catalog MCP/skill; CLI dùng được ngay. Chưa tự triển khai, push hay phát hành bài nộp.

## Ảnh và bước đã xác nhận

1. **Web khách — luồng tư vấn hoạt động**, cần cải thiện tương phản và ưu tiên giải thích giá trị.

![Web khách](../../output/playwright/agent-2026-10-29T04-46-46-048Z/desktop-home.png)

2. **Admin desktop — dữ liệu test đã tải**, cổng quyền được giữ, cần chỉnh contrast/ARIA.

![Admin desktop](../../output/playwright/agent-2026-10-29T04-46-46-048Z/desktop-admin.png)

3. **Admin mobile — không tràn ngang**, còn cần kiểm tra các tác vụ thao tác dài trên điện thoại.

![Admin mobile](../../output/playwright/agent-2026-10-29T04-46-46-048Z/mobile-admin.png)

4. **Android native — đủ bốn bước và tải được đề xuất** sau khi thiết lập USB; còn vấn đề độ dài cảnh báo.

![Android kết quả](../../output/playwright/mobile-mcp-2026-10-29T04-58-19-016Z/result.png)

## Bằng chứng máy đọc được

- [198 unit, build, E2E và AI](../../output/playwright/full-review-tooling/).
- [Kết quả AI 24/25](../../output/playwright/full-review-tooling/ai/results.json), [tóm tắt thời gian](../../output/playwright/full-review-tooling/ai/summary.json).
- [Audit 12 trạng thái web/admin](../../output/playwright/agent-2026-10-29T04-46-46-048Z/ui-audit.json).
- [Native flow đã pass](../../output/playwright/mobile-mcp-2026-10-29T04-58-19-016Z/result.json).
- [URL public trong lượt này](../../output/playwright/full-review-tooling/public-check.json).
- [Maestro đang bị chặn](../../output/playwright/full-review-tooling/maestro-blocker.log).

Giới hạn: chưa so sánh 264 đối thủ, chưa chấm thuyết trình thật, chưa audit bảo mật toàn repo hay transaction Stripe/VNPay merchant thật, chưa load-test các gói hosting, chưa có usability độc lập. Bộ công cụ chuẩn bị cho những công việc tiếp theo; việc cài xong không tự chứng minh các tiêu chí đó đã đạt.
