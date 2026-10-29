# HOSTORA AI Mobile

Ứng dụng React Native cài trực tiếp trên Android. Bản bàn giao **không cần Expo Go**; Expo chỉ được dùng như native toolchain để build APK.

## Tải và cài APK

- APK hiện tại 2.1.0 arm64: `releases/HOSTORA-AI-2.1.0-arm64.apk`. Bản này đã cài đè và mở ổn định trên Redmi Note 8 Pro ngày 29/10; có intro cinematic 7 giây và WebView sân khấu 3D.
- APK 2.0.9 trong tài liệu bàn giao là bản đánh giá lịch sử; không dùng làm link tải mặc định nữa.
- Bản dùng để đánh giá: [HOSTORA AI 2.0.9 prerelease cập nhật trên GitHub](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/tag/v2.0.9-review-20261029-r2); bản ổn định cũ là v1.5.0.
- Checksum APK cục bộ: `releases/SHA256SUMS.txt`.

Cài bằng ADB:

```bash
adb install -r releases/HOSTORA-AI-2.1.0-arm64.apk
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

Trong app, mở nút cài đặt ở góc trên → **Kết nối local AI** → nhập `http://<IP-máy>:3000` hoặc nhấn **LAN mặc định**. Máy và điện thoại phải cùng mạng; firewall phải cho phép TCP 3000.

Kiểm thử qua USB, không mở firewall:

```bash
adb reverse tcp:3000 tcp:3000
```

Trong app nhấn **USB localhost** → **Lưu và kiểm tra kết nối**. Trạng thái `READY` đã được xác minh trên Redmi Note 8 Pro.

## Giao diện đã xây

Năm tab chính: Trang chủ, Dịch vụ, Chọn gói, Hỏi đáp và Chi phí. Mục yêu cầu đã lưu mở từ màn hình liên quan. Các màn hình sâu gồm Kết quả gợi ý, tư vấn tên miền, phân tích website, kiến thức và kết nối local AI.

Bản 1.5.0 viết lại toàn bộ nội dung trên màn hình theo góc nhìn khách hàng: không hiển thị tên model, hạ tầng, cơ chế tra cứu hay từ lập trình; tên tính năng cũng chuyển thành mục tiêu dễ hiểu. Câu trả lời động có thêm lớp đổi thuật ngữ sang tiếng Việt phổ thông. Khóa lịch sử mới ngăn nội dung kỹ thuật đã lưu từ bản cũ xuất hiện sau khi nâng cấp, nhưng không xóa dữ liệu cũ khỏi thiết bị. Các phép tính giá, thứ tự gợi ý và giới hạn dữ liệu vẫn giữ nguyên và không giao cho mô hình tự quyết.

Bản 1.6.0 có hướng dẫn mở đầu ba bước, logo trùng biểu tượng cài đặt, hệ màu navy/mint/teal và điều hướng năm tab. Nút và trạng thái nhấn dùng cùng quy tắc; chuyển trang có hiệu ứng nhẹ và tôn trọng thiết lập giảm chuyển động. Nội dung chat hỗ trợ Markdown.

Bản 1.7.0 bổ sung video mở đầu sáu giây từ chính logo app, phát ở mỗi lần mở, có nút Bỏ qua. Máy bật Giảm chuyển động sẽ đi thẳng vào hướng dẫn hoặc trang chủ. Video H.264 được lưu cục bộ tại `assets/video/hostora-intro.mp4`; nguồn dựng nằm ở `brand-film/intro.html`. Sau video, hướng dẫn ba bước chỉ hiện nếu chưa hoàn thành trước đó.

Bản 1.8.0 thêm nền chuyển động Skia trên Trang chủ và phản hồi chạm thống nhất bằng `expo-haptics`. Màn Chọn gói đưa bốn câu hỏi lên trước, thu gọn phần mô tả tự do; danh mục giảm khoảng trống để nút mua của gói đầu hiện ngay trên màn Redmi. Video mở đầu có chữ Việt và vẫn dùng chính logo của APK.

Bản 2.0.1 hiển thị catalog dịch vụ và nhận yêu cầu mua trong app. HOSTORA xác nhận tổng tiền/kỳ hạn rồi phát hành hóa đơn để khách xem và bắt đầu thanh toán trong mục Đơn hàng. Giá “từ” không tự trở thành số tiền phải thu; merchant sandbox chưa được cấu hình.

Bản 2.0.2 cho phép nhập lượng khách và ngân sách riêng (trong giới hạn đầu vào). Bản 2.0.3 thay các ô màu riêng lẻ bằng một bảng chọn màu kéo được và ô HEX; Website Studio trên app vẫn giữ màu tự chọn khi tạo demo.

Bản 2.0.4 đổi thẻ demo Website Studio thành khung xem nhanh cao cố định. Khách bấm Trang đầu, Giới thiệu, Liên hệ và CTA ngay trong app; nút “Mở link website” mở bản HTML thật trên máy chủ HOSTORA.

Bản 2.0.6 bổ sung sổ tay bốn chặng và ba dịch vụ đi kèm: sao lưu dữ liệu, theo dõi tình trạng website, bảo vệ/tăng tốc. Trang chủ mở đúng nhóm dịch vụ; danh mục cho thấy mô tả từng sản phẩm và đưa bộ lọc đang chọn vào tầm nhìn. Giá của ba dịch vụ mới cần xác nhận trước khi tạo hóa đơn.

Bản 2.0.9 ghi rõ gói được ưu tiên mới đáp ứng ngân sách lưu trữ theo tháng. Nếu chưa nhập giới hạn trả trước, màn kết quả nói rõ chưa xác nhận tổng tiền thanh toán; Xưởng tạo website cũng ghi gói vượt điều kiện là phương án tham khảo. Điểm so sánh chỉ là quy tắc chọn gói theo dữ liệu đã công bố, không phải phép đo hiệu năng.

Bản 2.1.0 bổ sung intro cinematic 7 giây (H → HOSTORA → mascot), phát video cục bộ không cần mạng, nút bỏ qua, và sân khấu 3D có poster fallback khi thiết bị không hỗ trợ WebView/WebGL. Đã kiểm tra trực tiếp trên Redmi Note 8 Pro qua ADB; app sống ổn sau intro và về đúng Trang chủ.

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

APK 2.1.0 dùng chữ ký debug cục bộ; package `com.hostora.ai`, versionCode 22, min SDK 24, target SDK 36. Checksum SHA-256 nằm ở `releases/HOSTORA-AI-2.1.0-arm64.apk.sha256`. APK **chưa phải bản ký production cho Google Play**. Trước khi phát hành công khai cần tạo keystore production và bảo quản ngoài Git.
