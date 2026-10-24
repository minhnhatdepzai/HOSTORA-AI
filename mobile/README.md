# HOSTORA AI Mobile

Ứng dụng React Native cài trực tiếp trên Android. Bản bàn giao **không cần Expo Go**; Expo chỉ được dùng như native toolchain để build APK.

## Tải và cài APK

- Bản khuyến nghị cho điện thoại Android arm64: [HOSTORA-AI-1.5.0.apk](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v1.5.0/HOSTORA-AI-1.5.0.apk) — khoảng 37 MiB.
- Bản universal dự phòng: [HOSTORA-AI-1.5.0-universal.apk](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v1.5.0/HOSTORA-AI-1.5.0-universal.apk) — khoảng 100 MiB.
- Checksum: [SHA256SUMS.txt](releases/SHA256SUMS.txt).

Cài bằng ADB:

```bash
adb install -r HOSTORA-AI-1.5.0.apk
```

Android có thể yêu cầu cho phép “Cài ứng dụng không rõ nguồn gốc” nếu mở APK từ trình quản lý file.

Nếu máy HOSTORA đang chạy `pnpm dev:lan`, mở `http://<IP-máy-HOSTORA>:3000/downloads/android` trên điện thoại để tải trực tiếp; bản universal ở `/downloads/android-universal`. Máy và điện thoại cần cùng mạng, cổng TCP 3000 phải truy cập được. IP LAN có thể đổi theo mạng.

## Kết nối local AI

App chạy độc lập, nhưng tính năng Qwen/RAG cần máy HOSTORA chạy backend và Ollama.

Cùng Wi-Fi:

```bash
cd ..
pnpm dev:lan
```

Trên máy phát triển hiện tại, pnpm 12 có thể chặn bước tự xác minh dependency vì build script `unrs-resolver` chưa được phê duyệt. Với `node_modules` đã cài và kiểm tra, dùng `pnpm --config.verify-deps-before-run=false dev:lan` nếu gặp lỗi này; không tự cấp quyền cho build script lạ.

Trong app, mở avatar `H` → **Kết nối local AI** → nhập `http://<IP-máy>:3000` hoặc nhấn **LAN mặc định**. Máy và điện thoại phải cùng mạng; firewall phải cho phép TCP 3000.

Kiểm thử qua USB, không mở firewall:

```bash
adb reverse tcp:3000 tcp:3000
```

Trong app nhấn **USB localhost** → **Lưu và kiểm tra kết nối**. Trạng thái `READY` đã được xác minh trên Redmi Note 8 Pro.

## Giao diện đã xây

Năm tab chính: Trang chủ, Tư vấn, Trợ lý local RAG, Công cụ và Leads. Các màn hình sâu gồm Kết quả gợi ý từ catalog 13 gói, Kho 26 sản phẩm, SEO Intelligence, Domain Advisor, Website Analyzer, Knowledge Assistant và Kết nối local AI.

Bản 1.5.0 viết lại toàn bộ nội dung trên màn hình theo góc nhìn khách hàng: không hiển thị tên model, hạ tầng, cơ chế tra cứu hay từ lập trình; tên tính năng cũng chuyển thành mục tiêu dễ hiểu. Câu trả lời động có thêm lớp đổi thuật ngữ sang tiếng Việt phổ thông. Khóa lịch sử mới ngăn nội dung kỹ thuật đã lưu từ bản cũ xuất hiện sau khi nâng cấp, nhưng không xóa dữ liệu cũ khỏi thiết bị. Các phép tính giá, thứ tự gợi ý và giới hạn dữ liệu vẫn giữ nguyên và không giao cho mô hình tự quyết.

Thiết kế dùng hệ thống màu ink/mint/cobalt, Be Vietnam Pro, card bo lớn, safe area, bottom navigation và trạng thái loading/error/ready. Nội dung chat hỗ trợ Markdown thay vì hiển thị ký hiệu thô.

## Phát triển và build

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm dlx expo-doctor@latest
pnpm prebuild:android
pnpm apk:arm64
```

APK sinh tại `android/app/build/outputs/apk/release/app-release.apk`. Android native folder là artifact sinh tự động, không phải source of truth; cấu hình quyền/app nằm trong `app.json`.

## Trạng thái ký

APK 1.5.0 dùng Android debug certificate để có thể cài trực tiếp. Cả hai bản qua `apksigner verify` v2; package `com.hostora.ai`, versionCode 7, min SDK 24, target SDK 36, nhưng **chưa phải bản ký production cho Google Play**. Bản arm64 đã cài đè và mở trên Redmi Note 8 Pro; màn Trang chủ và Trợ lý đã được kiểm tra trực tiếp, lịch sử cũ không còn hiển thị. Trước khi phát hành công khai cần tạo keystore production và bảo quản ngoài Git.
