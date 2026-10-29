# HOSTORA — web, admin, Android và lộ trình tới 95 điểm

Ngày đánh giá: 29/10/2026. Mục tiêu: Đề 01, rubric người dùng cung cấp; ít nhất 6 ca kiểm thử. Phạm vi hiện tại là source phát triển và APK 2.1.0 trên Redmi Note 8 Pro. Các báo cáo 2.0.9 và điểm 72/82 trước đây là lịch sử. Không suy ra thứ hạng từ số công nghệ hoặc số test.

## Kết luận chấm thử

**Khoảng 87/100 theo bằng chứng hiện có.** Sản phẩm đã mạnh hơn rõ rệt về accessibility, regression và hardening bảo mật, nhưng chưa chứng minh mức 95. Điểm này chấm cả sản phẩm một lần, không cộng ba bảng 100 điểm cho web/admin/app. Phần phản biện vẫn tạm tính vì chưa phỏng vấn người dự thi.

95/100 là mục tiêu chất lượng và trình bày, không bảo đảm chung kết top 10/265: chưa có điểm hoặc sản phẩm của các đội khác. Để bảo vệ mức 95 cần kết quả ở máy/đường mạng độc lập, hành trình AI đáng tin cậy, usability có quan sát và phần phản biện thật.

| Tiêu chí | Hiện tại, giả lập | Mục tiêu | Điều kiện tăng điểm |
|---|---:|---:|---|
| Chức năng, đúng nghiệp vụ | 24/25 | 24/25 | Giữ trọn 5 chức năng, phân biệt tiền trả trước/gia hạn và không có gói phù hợp; xác minh thêm giá/điều kiện trước nộp. |
| Kỹ thuật, chất lượng mã | 19/20 | 19/20 | Đã có build tái lập, stream body limit, header/CSP, quota/Turnstile và test; vẫn cần chứng minh edge/origin production. |
| AI, kiểm soát đầu ra | 12/15 | 14/15 | Tập độc lập có paraphrase/phủ định/mâu thuẫn, đo cold/warm và nhiều lượt đồng thời; không có claim thương mại sai trong tập chấm. |
| Kiểm thử, xử lý lỗi | 14/15 | 14/15 | 220 unit, 47 E2E, 12 trạng thái UI và load/stress AI 1–32 đồng thời đã đo; vẫn thiếu bộ native tự động do quyền Maestro và soak/mạng ngoài. |
| Làm chủ Vibe Coding, phản biện | 10/15 tạm tính | 14/15 | Bảo vệ kiến trúc và một chuỗi prompt thật → lỗi thật → test → quyết định sửa; trả lời câu hỏi trực tiếp. |
| UI/UX | 5/5 | 5/5 | Contrast/ARIA web-admin và overlay accessibility Android đã sửa; audit tự động xanh, vẫn cần TalkBack/usability độc lập. |
| Triển khai, bàn giao | 3/5 | 5/5 | URL HTTPS hoạt động từ mạng ngoài, source/APK/video cùng phiên bản, cài máy khác theo README, có phương án demo dự phòng. |
| **Tổng** | **87/100** | **95/100** | Còn 8 điểm phụ thuộc chủ yếu AI độc lập, phản biện thật và deployment/handoff production. |

## Kết quả mới trong lượt này

- Web typecheck và lint đạt. Unit **220/220**, 51 file, đạt.
- Production build mặc định đạt; có cảnh báo OpenTelemetry/Gradle deprecation được giữ trong log, không coi cảnh báo là test thất bại.
- Mobile typecheck/lint đạt.
- Toàn bộ E2E trên production SQLite cách ly: **47 đạt, 1 bỏ qua có chủ đích, 0 lỗi**. Đã chạy lại qua lệnh mới `test:e2e:isolated` và nhận cùng kết quả; ca skip là CRUD danh mục trên mobile vì desktop đã chạy.
- Audit UI production cách ly đạt **12/12 trạng thái**, 0 axe finding và 0 page error ở desktop/mobile. Đây là kiểm tra tự động, không thay TalkBack/keyboard/usability thật.
- Accessibility đã sửa: contrast/ARIA web-admin và Stack native không còn mount phía sau intro/onboarding. Android source vẫn qua typecheck/lint và bản 2.1.0/versionCode 22 trên Redmi không có crash/fatal trong lượt kiểm tra gần nhất.
- Hardening mới: CSP/header, giới hạn body theo stream, quota `429 + Retry-After`, canonical origin, proxy trust opt-in và Turnstile thích ứng cho login/register/forgot. Stripe raw webhook, OCR lớn, replay/timeout/misconfiguration đều có test hồi quy.
- `pnpm audit --prod` không báo advisory đã biết. Runtime production local trả đúng security headers và `413` cho JSON 20 KiB. Cloudflare WAF/origin lock production **chưa được bật hoặc xác minh** trong lượt này.
- Load/stress staging production cô lập đã đo từ 1 đến 32 request AI đồng thời. Throughput bão hòa khoảng 0,35 request/giây; p95 tăng từ 3,16 giây ở concurrency 1 lên 45,89 giây ở concurrency 16. Ở concurrency 32 có 1/32 request trả 503 tại khoảng 90,1 giây. Đây là bằng chứng queue/model đang là nút thắt, không phải năng lực production ngoài mạng.
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

Khoảng trống: hero thương hiệu vẫn lớn hơn phần giải thích cụ thể về hosting/domain; cần quan sát người không rành kỹ thuật để biết họ có hiểu ngay bước tiếp theo. Audit tự động hiện không còn finding contrast, nhưng không chứng minh nội dung dễ hiểu hoặc thao tác bàn phím/TalkBack hoàn chỉnh.

### Web admin

Điểm tốt: có cổng đăng nhập, dashboard, doanh thu, danh mục, đơn hàng và hỗ trợ. E2E xác nhận tạo/xuất bản/lưu trữ dịch vụ với dữ liệu test cách ly; không bỏ xác thực để làm test xanh. Screenshot desktop/mobile không tràn ngang toàn trang.

Các lỗi đã sửa: biểu đồ doanh thu có semantics phù hợp, token chữ/nền đủ tương phản trong 12 trạng thái đã quét; lượt audit mới không còn axe finding. Khoảng trống vận hành vẫn là OTP email end-to-end, restore backup trên máy độc lập, thao tác của hai nhân viên và dữ liệu đủ lớn để đánh giá lọc/phân trang.

### Android

Điểm tốt: package đang cài đúng 2.1.0/versionCode 22, UI native có vùng an toàn, có màn chọn cấu hình USB và xử lý lỗi catalog. Mobile MCP đã đi đủ bốn bước đến kết quả trên máy thật, không suy diễn từ browser mobile.

Overlay accessibility đã được sửa bằng cách không mount native Stack khi intro/onboarding đang hiển thị. Cảnh báo chi phí trên kết quả cũng được rút gọn theo tầng thông tin. Vẫn cần TalkBack, font lớn, offline/restart, background/resume và kiểm thử native tự động lặp lại khi Redmi cho phép Maestro driver.

Kết nối backend là điểm dễ hỏng khi đem thi: USB reverse mất sau ngắt thiết bị; URL Quick Tunnel không phải địa chỉ cố định. App cần trạng thái kết nối dễ hiểu, retry và hướng dẫn thao tác phù hợp người dùng. Chưa thử đầy đủ TalkBack, font lớn, offline sau restart, đa thiết bị, đổi mạng hoặc vòng đời background/resume.

## Audit accessibility tự động mới

Quét 6 route × 2 viewport (1440×900 và 390×844), reduced motion, browser thật, chờ dashboard hết loading. **Cả 12 trạng thái có 0 axe finding và 0 page error**; không có tràn ngang toàn trang trong tập đã quét.

| Route | Findings chính |
|---|---|
| `/` | 0 finding, 0 page error |
| `/consultation` | 0 finding, 0 page error |
| `/recommendations` | 0 finding, 0 page error |
| `/admin` | 0 finding, 0 page error |
| `/admin/orders` | 0 finding, 0 page error |
| `/admin/support` | 0 finding, 0 page error |

Axe không chứng minh WCAG toàn diện; còn cần keyboard, focus, screen reader và gesture/target size trên thiết bị thật. Kết quả xanh chỉ áp dụng đúng route, dữ liệu và viewport đã ghi.

## Bàn giao và URL

Source/app.json/APK phát triển đã lên 2.1.0, trong khi bộ ZIP/video/checksum và GitHub prerelease được mô tả trong handoff vẫn là 2.0.9. Cần chốt rõ phiên bản nộp và quay/đóng gói lại cùng phiên bản trước khi đòi điểm bàn giao tối đa.

URL Quick Tunnel ghi trong tài liệu (`consultation-directory-budgets-plus.trycloudflare.com`) không phân giải DNS trong lượt kiểm tra này, cả `/`, `/admin`, `/downloads/android`. Đây là quan sát tại máy kiểm tra, không phải kết luận mọi mạng đều như vậy. Cần dùng URL được quản lý ổn định và kiểm tra bằng thiết bị ngoài mạng phát triển; không tự tạo thêm public tunnel trong đợt setup công cụ này.

## Thứ tự thực hiện để tiến tới 95

| Ưu tiên | Việc cụ thể | Bằng chứng nghiệm thu | Phần điểm hỗ trợ |
|---|---|---|---|
| P0 | Chốt nguồn, APK, link tải, video, SHA cùng version; ổn định endpoint | Cài máy khác/điện thoại 4G, mở web/admin và gọi AI đúng luồng, đúng artifact | Bàn giao +2 |
| P0 | Đo và xử lý timeout AI | Tách cold/warm, timeout/retry/queue dễ hiểu; chạy tập độc lập nhiều lượt, ghi cả lỗi | AI +2, test +1 |
| P1 | Kiểm thử native lặp lại và trạng thái lỗi | TalkBack/font lớn; luồng thường, API lỗi, input sai, restart giữ dữ liệu và update APK | Củng cố UI/test, không tự cộng thêm điểm |
| P1 | Bật Cloudflare production đúng cách | Proxy DNS, WAF/rate limit, Turnstile key, origin lock; gọi trực tiếp IP origin phải thất bại | Chứng minh kỹ thuật/deployment, không gọi là chống DDoS tuyệt đối |
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

`audit:ui` hiện đạt 12/12 trạng thái. `test:mobile:e2e` chưa pass do quyền cài driver trên Redmi; Mobile MCP đã hoàn tất luồng native thay thế. Chưa tự triển khai Cloudflare production, push hoặc phát hành bài nộp.

## Ảnh và bước đã xác nhận

1. **Web khách — luồng tư vấn hoạt động**, tương phản tự động đã đạt; bước tiếp theo là ưu tiên giải thích giá trị và kiểm chứng với người dùng thật.

![Web khách](../../output/playwright/agent-2026-10-29T04-46-46-048Z/desktop-home.png)

2. **Admin desktop — dữ liệu test đã tải**, cổng quyền được giữ; contrast/ARIA đã sửa và audit tự động không còn finding.

![Admin desktop](../../output/playwright/agent-2026-10-29T04-46-46-048Z/desktop-admin.png)

3. **Admin mobile — không tràn ngang**, còn cần kiểm tra các tác vụ thao tác dài trên điện thoại.

![Admin mobile](../../output/playwright/agent-2026-10-29T04-46-46-048Z/mobile-admin.png)

4. **Android native — đủ bốn bước và tải được đề xuất** sau khi thiết lập USB; cảnh báo dài và lớp route phía sau overlay đã được khắc phục.

![Android kết quả](../../output/playwright/mobile-mcp-2026-10-29T04-58-19-016Z/result.png)

## Bằng chứng máy đọc được

- [220 unit, build và AI](../../output/playwright/full-review-tooling/) cùng log chạy mới trong terminal.
- [Kết quả AI 24/25](../../output/playwright/full-review-tooling/ai/results.json), [tóm tắt thời gian](../../output/playwright/full-review-tooling/ai/summary.json).
- [Audit 12 trạng thái web/admin mới](../../output/playwright/agent-2026-10-29T12-38-50-888Z/ui-audit.json).
- [Native flow đã pass](../../output/playwright/mobile-mcp-2026-10-29T04-58-19-016Z/result.json).
- [URL public trong lượt này](../../output/playwright/full-review-tooling/public-check.json).
- [Maestro đang bị chặn](../../output/playwright/full-review-tooling/maestro-blocker.log).

Giới hạn: chưa so sánh 264 đối thủ, chưa chấm thuyết trình thật, chưa pentest độc lập hay xác minh Cloudflare production, chưa chạy transaction Stripe/VNPay merchant thật, chưa load test mạng ngoài/multi-node hoặc soak dài hạn và chưa có usability độc lập. 87/100 là mô phỏng có bằng chứng, không phải kết quả ban tổ chức.
