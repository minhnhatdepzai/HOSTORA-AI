# Bộ công cụ phát triển và đánh giá HOSTORA

Thiết lập ngày 29/10/2026 cho web Next.js, web quản trị và Android Expo. Các công cụ dưới đây phục vụ Codex trên máy phát triển; không cấp thêm quyền cho model Ollama trong sản phẩm.

## Những thành phần đã chuẩn bị

| Thành phần | Nguồn | Vai trò |
|---|---|---|
| Mobile MCP 1.0.14 + mobilecli 1.0.21 | https://github.com/mobile-next/mobile-mcp và https://github.com/mobile-next/mobilecli | Codex khám phá thiết bị, đọc cây giao diện, chụp ảnh, chạm/cuộn, cài và mở app |
| Maestro CLI 2.12.0 | https://github.com/mobile-dev-inc/Maestro | Luồng Android YAML lặp lại được, JUnit và ảnh bằng chứng |
| Expo skills | https://github.com/expo/skills | expo-native-ui, expo-router, expo-data-fetching, expo-dev-client, expo-upgrade |
| React Native skill có sẵn | https://github.com/vercel-labs/agent-skills | Hướng dẫn hiệu năng/native UI, đã có trước đợt thiết lập |
| Playwright và Chrome DevTools MCP có sẵn | https://github.com/microsoft/playwright-mcp và https://github.com/ChromeDevTools/chrome-devtools-mcp | Luồng web/admin, responsive, console/network và ảnh |
| axe-core Playwright 4.11.1 | https://github.com/dequelabs/axe-core-npm | Phát hiện tự động một phần lỗi accessibility trên web/admin |
| Impeccable và human-ui-design có sẵn | skill local | Audit và cải thiện UI theo sản phẩm |
| hostora-quality | skill local tạo riêng | Workflow phát triển/kiểm thử ba bề mặt và chấm theo rubric cuộc thi |

Không có một repo “tốt nhất” cho mọi việc. Bộ này chọn công cụ chính thức theo nền tảng đang dùng, ưu tiên hoạt động trên Linux và Redmi USB, tránh thêm Appium/Detox/emulator khi chưa cần. Những công cụ cần tài khoản cloud hoặc dịch vụ trả tiền không được tự bật.

## Vị trí cài trên máy

- Mobile MCP: `~/.local/share/codex-tools/mobile-mcp/`, wrapper `~/.local/bin/hostora-mobile-mcp`.
- Codex MCP: entry `mobile` trong `~/.codex/config.toml`; các entry cũ được giữ. Bản sao cấu hình trước khi sửa nằm cạnh file với tiền tố `config.toml.before-hostora-mobile-` và không được đưa vào repo.
- Maestro: `~/.local/share/codex-tools/maestro/2.12.0/`, wrapper `~/.local/bin/maestro`.
- Expo skills và hostora-quality: `~/.codex/skills/`.
- ADB/SDK: `~/Android/Sdk`; package app `com.hostora.ai`. `adb` có symlink ở `~/.local/bin/adb`. Máy có Java 21 runtime và JDK 17; workflow build chọn JDK 17 đầy đủ thay vì runtime thiếu javac. Có thể đặt `HOSTORA_JAVA_HOME` để chọn một JDK khác. `mobile/android/local.properties` ghi SDK local và đã được Git ignore.

Maestro được tải từ GitHub release `cli-2.12.0`; SHA-256 archive đã đối chiếu: `a6044a84542f522f434c5dc3d609e60c7446d423f3ed1b2ae513f5c48663ec5e`. Mobile MCP chạy stdio, tắt telemetry bằng `MOBILEMCP_DISABLE_TELEMETRY=1`; Maestro tắt analytics qua wrapper. Dependency HTTP transport của Mobile MCP được override sang `@modelcontextprotocol/node@2.1.2` và `@hono/node-server@2.1.5` để xử lý advisory trong bản transitive gốc; cần kiểm tra MCP lại khi nâng version.

Các MCP/skill mới sẽ được Codex nạp ở lượt hoặc phiên mới; lệnh CLI dùng được ngay. Kiểm tra `/mcp` hoặc `codex mcp list` sau khi mở phiên mới. Cấu hình MCP của CLI/IDE dùng chung theo https://developers.openai.com/codex/mcp#connect-codex-to-an-mcp-server .

## Các lệnh đã nối vào repo

```bash
pnpm agent:doctor
pnpm agent:verify
pnpm test:e2e:isolated
pnpm audit:ui
pnpm test:mobile:e2e
pnpm test:mobile:mcp
pnpm android:update
```

- `agent:doctor`: xem Node/pnpm, ADB, Maestro, APK local, phiên bản đang cài và skill. Trả lỗi nếu không có đúng một thiết bị sẵn sàng hoặc version khác app.json.
- `agent:verify`: typecheck/lint/test/build web, typecheck/lint mobile và AI smoke test thật. Đây không phải toàn bộ kiểm định chất lượng AI hoặc APK.
- `test:e2e:isolated`: mở production ở cổng loopback trống, tạo SQLite/khóa phiên riêng, tắt SMTP và GitHub Studio, chạy Playwright rồi dừng server. Cần `pnpm build` trước khi muốn đánh giá source mới.
- `audit:ui`: cùng cơ chế server cách ly, chụp desktop/mobile cho trang chủ, wizard, kết quả, admin, đơn hàng và hỗ trợ. Ghi `ui-audit.json`; exit 1 khi có lỗi axe/page/overflow. Đó là kết quả audit để xử lý, không phải script hỏng chỉ vì exit 1.
- `test:mobile:e2e`: chạy `mobile/.maestro/consultation-smoke.yaml` trên thiết bị được chọn; đi bốn bước và yêu cầu màn kết quả đã tải bảng giá. Không xóa dữ liệu app và không gửi yêu cầu mua.
- `test:mobile:mcp`: luồng bốn bước qua Mobile MCP khi Maestro chưa có quyền cài driver; tạo đường USB `adb reverse tcp:3000 tcp:3000`. Backend cổng 3000 phải đang chạy và app phải chọn chế độ USB trong Kết nối dịch vụ. Có ảnh từng bước, kết quả và log; test thất bại nếu catalog không tải được.
- `android:update`: build arm64, kiểm tra package/version bằng aapt trước khi `adb install -r`, mở app. Nếu app.json và native Android chưa đồng bộ thì dừng, không cài nhầm APK. Việc upload/release ra GitHub không được thực hiện bởi lệnh này.

Chọn thiết bị khi cắm nhiều máy:

```bash
HOSTORA_ANDROID_DEVICE=<adb-serial> pnpm test:mobile:e2e
```

Ảnh và báo cáo ghi trong `output/playwright/agent-<UTC timestamp>/`; SQLite test nằm ở thư mục tạm được in cuối lệnh. Không đưa cơ sở dữ liệu thật, cookie, secret, raw lead hoặc ảnh có PII vào commit.

## Trên Xiaomi/Redmi

Maestro cần cài ứng dụng test driver qua USB. Nếu có `INSTALL_FAILED_USER_RESTRICTED`, người dùng phải cho phép “Cài đặt qua USB” và chấp nhận hộp thoại cài ứng dụng hỗ trợ. Không tự tắt bảo vệ thiết bị để né lỗi. Mobile MCP đã có thể khám phá máy, đọc cây và chụp ảnh trong cấu hình hiện tại; có thể dùng nó để kiểm tra thủ công có bằng chứng trong khi Maestro chờ quyền.

Không dùng `adb uninstall` hoặc `pm clear` như bước kiểm thử mặc định. App phải được cập nhật giữ dữ liệu. Trước khi test, xác nhận API base URL trong app; không thay cấu hình mạng của người dùng nếu chưa cần. App vẫn cần backend HOSTORA, kể cả APK release.

## Quy trình cho Codex khi sửa app

1. Đọc AGENTS.md, git status và file liên quan; xác nhận phiên bản/source/API thực tế.
2. Thực hiện đúng phạm vi được yêu cầu; giữ giá/xếp hạng ở domain code và dữ liệu nguồn.
3. Chạy typecheck/lint và test cần thiết; thay đổi native dependency/config thì kiểm tra tài liệu Expo hiện hành trước prebuild.
4. Build và cài đè đúng version bằng `pnpm android:update`; kiểm tra intro và luồng vừa thay đổi trên thiết bị thật bằng MCP/ADB/Maestro.
5. Lưu ảnh, bước thực hiện và kết quả; phân biệt thiết bị thật, browser giả lập, mock và inference thật.

## Cách yêu cầu công việc ở lượt sau

“Dùng hostora-quality, kiểm tra trạng thái repo và thiết bị trước. Sửa [luồng cụ thể] cho web/admin/app. Build, cài đè APK giữ dữ liệu, đi lại luồng trên Redmi, lưu ảnh và báo cáo test. Nếu có lỗi thì tìm nguyên nhân và hoàn tất trong phạm vi đã giao.”

“Dùng hostora-quality để chấm như giám khảo theo rubric Đề 01. Chạy tối thiểu 6 ca có dữ liệu/kỳ vọng/kết quả, kiểm tra web/admin/Android, gọi AI thật và chỉ ra bằng chứng còn thiếu để đạt 95 điểm. Không tự nâng điểm vì tăng số test hoặc số công nghệ.”
