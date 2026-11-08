# HOSTORA AI Mobile

Ứng dụng React Native cài trực tiếp trên Android. Bản bàn giao **không cần Expo Go**; Expo chỉ được dùng như native toolchain để build APK.

## Tải và cài APK

- APK hiện tại 2.2.7 universal: [tải từ GitHub Release](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download/HOSTORA-AI-2.2.7-universal.apk). Bản này chứa `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`. Link tên [`arm64.apk`](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download/HOSTORA-AI-2.2.7-arm64.apk) phục vụ cùng binary universal để biểu mẫu cũ không bị hỏng.
- Checksum SHA-256: `34bb4a93cb636e6b3bea0a13407a977ddd7ce0efbae1a0da920ab90c7171ce51`; xem tệp `HOSTORA-AI-2.2.7-universal.apk.sha256` trong GitHub Release mới nhất.
- APK 2.1.0 trở về trước là bằng chứng lịch sử; không dùng làm link tải mặc định nữa.

Cài bằng ADB:

```bash
adb install -r HOSTORA-AI-2.2.7-universal.apk
```

Android có thể yêu cầu cho phép “Cài ứng dụng không rõ nguồn gốc” nếu mở APK từ trình quản lý file. Bản hiện tại yêu cầu Android 7.0/API 24 trở lên; Android 6 trở xuống cần một ứng dụng legacy riêng vì Expo 58/React Native 0.88 không còn hỗ trợ.

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

Bản 2.2.0 thêm chuyển cảnh theo tiến độ, haptic và reduced-motion thống nhất, chống chuyển bước khi input chưa hợp lệ, trạng thái catalog dự phòng và chế độ trình diễn cho giám khảo. Cinematic H → HOSTORA → robot phát ở mọi lần cold-start, vẫn có nút Bỏ qua và có thể phát lại ngay trong hồ sơ vòng loại; khi người dùng bật Giảm chuyển động, app đi thẳng vào nội dung. Bộ kiểm tra showcase đạt 20/20; TC01–TC09 đạt trên APK cài thật.

Bản 2.2.1 khôi phục toàn bộ hai chương cinematic: orbit/beam/logo/headline mở màn, sau đó H → HOSTORA → robot. Phim 12,4 giây là asset H.264 cục bộ, phát ở mọi cold-start, có nút Bỏ qua và nút phát lại trong Hồ sơ giám khảo; phát lại xong trở về đúng màn đang mở. Native splash, chuyển cảnh trang, haptic, Skia backdrop, sân khấu 3D web và admin đều được giữ nguyên.

Bản 2.2.2 giữ nguyên toàn bộ cinematic 2.2.1 và bổ sung bộ bàn giao portable: Docker CPU mặc định cho Windows/macOS/Linux, Mailpit OTP local, Source ZIP và fine-tuning ZIP có checksum cùng verifier. Thay đổi phát hành không tự promote hai LoRA candidate vào runtime.

Bản 2.2.6 hợp nhất luồng tư vấn–chọn gói–thanh toán và dữ liệu vận hành. Trợ lý đọc hồ sơ, website, yêu cầu mua và đơn gần nhất của đúng tài khoản; gói được chọn mở checkout ngay trong chat. Tồn kho 13 gói dùng chung với web/admin, chỉ trừ sau thanh toán thành công và trả lại khi hoàn tiền hoàn tất. App hiển thị Còn hàng/Sắp hết/Hết hàng, giữ lịch sử chat, mở website đã tạo bằng link, bỏ banner nổi toàn app và đặt composer đúng phía trên bàn phím.

Bản 2.2.7 bổ sung nhập tiếng Việt VNI, lịch sử chat theo từng cuộc trò chuyện, xóa đồng bộ với admin, phiên tư vấn mới sạch nhưng giữ tên/email tài khoản khi mua lại, URL website chia sẻ được và luồng hóa đơn/hủy đơn đồng bộ với backend mới. APK universal đã cài đè giữ dữ liệu và vượt luồng native Maestro trên Android Emulator 16.

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

APK 2.2.7 dùng chữ ký debug cục bộ; package `com.hostora.ai`, versionCode 30, min SDK 24, target SDK 36. APK **chưa phải bản ký production cho Google Play**. Trước khi phát hành qua store cần tạo keystore production và bảo quản ngoài Git.
