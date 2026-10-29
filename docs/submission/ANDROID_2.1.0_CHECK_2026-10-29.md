# HOSTORA Android 2.1.0 — kiểm tra Redmi Note 8 Pro

> **Cập nhật working tree cuối ngày 29/10/2026:** web test hiện là 233/233 trên 52 file; các số 197 test bên dưới là snapshot của lượt kiểm tra Android trước khi thêm account-memory/source guardrail. Không dùng số snapshot này để mô tả toàn bộ source hiện tại.

Ngày kiểm tra: 29/10/2026. Thiết bị kết nối ADB qua USB: Redmi Note 8 Pro (`begonia`).

## Kết quả

- Package: `com.hostora.ai`
- `versionName=2.1.0`, `versionCode=22`, min SDK 24, target SDK 36.
- APK đã cài đè và mở ổn định trên thiết bị.
- SHA-256 APK local và APK kéo lại từ thiết bị trùng nhau:
  `8d48589b0674272063fd92fa61ed0d82fc1028d57262fc49dc1980bc8c1c83ed`.
- Intro cục bộ dài 7 giây: ở khoảng 3 giây thấy chữ H chuyển thành HOSTORA; khoảng 6 giây mascot xuất hiện; sau khi kết thúc app về Trang chủ. Nút **Bỏ qua** hoạt động.
- Sau intro, app vẫn sống (`pidof com.hostora.ai` có tiến trình) và Trang chủ hiển thị đúng vùng an toàn của Redmi.
- Video intro được đóng gói trong APK, nên không phụ thuộc mạng. Sân khấu 3D mobile có WebView và poster fallback.

## Kiểm tra web và AI

- `pnpm typecheck`: đạt.
- `pnpm lint`: đạt.
- `pnpm test`: snapshot Android trước đó 48 file, 197 test đạt; bản source hiện tại đã chạy lại 52 file, 233/233 test đạt.
- `pnpm build`: đạt; standalone chứa 2 APK.
- `pnpm ai:check`: structured output từ Ollama local đạt.
- Playwright đúng môi trường SQLite kiểm thử: 47 đạt, 1 bỏ qua có chủ đích trên desktop/mobile; không có lượt lỗi.
- `HEAD /downloads/android` trả `200`, tên tệp `HOSTORA-AI-2.1.0-arm64.apk`; tải lại và đối chiếu checksum đạt.

## Giới hạn bàn giao

APK hiện dùng chữ ký debug cục bộ, chưa phải bản ký production cho Google Play. Các tài liệu chấm 2.0.9 trong thư mục `docs/submission` được giữ lại làm lịch sử; tệp này ghi nhận trạng thái 2.1.0 mới nhất.
