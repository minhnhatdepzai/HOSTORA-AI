# HOSTORA Mobile Showcase Design

## Intent

Biến app Android thành bề mặt thuyết phục nhất khi giám khảo cầm máy: nhìn rõ hành trình chính, cảm nhận được phản hồi chạm và chuyển cảnh, đồng thời mở một màn “Hồ sơ vòng loại” để hiểu 5 tính năng và bằng chứng 9 ca kiểm thử mà không đọc mã nguồn.

## Art direction

“Cố vấn kinh doanh có nhịp điệu”: giữ hệ màu xanh đậm, mint, nền sáng và Be Vietnam Pro hiện có; tăng chiều sâu bằng chuyển động có chủ đích, đường tiến trình, trạng thái chọn và phản hồi chạm. Không dùng gradient tím-xanh, glassmorphism tràn lan, emoji, animation liên tục hoặc hiệu ứng làm chậm máy.

## Goals

- Chuyển màn theo quan hệ không gian; wizard đổi bước có hướng và trạng thái rõ.
- Phản hồi chạm trong 80–150 ms, haptic nhẹ, vùng chạm Android tối thiểu 48 dp.
- Chỉ animate transform và opacity; tôn trọng Reduce Motion.
- Nâng cấp Trang chủ, Chọn gói, Dịch vụ và Kết quả mà không thay logic giá/xếp hạng.
- Thêm màn Hồ sơ vòng loại: kịch bản demo 2 phút, 5 tính năng, 9 ca kiểm thử và liên kết đi thẳng vào luồng thật.
- Sinh báo cáo HTML giám khảo từ kết quả kiểm thử và ảnh máy thật.

## Non-goals

- Không đổi backend, dữ liệu giá, công thức đề xuất hoặc kiến trúc local-first.
- Không thêm thư viện UI/motion mới.
- Không gửi đơn mua thật, email thật hoặc dữ liệu cá nhân khi kiểm thử.

## Constraints

- Expo Router, React Native Reanimated hiện có, TypeScript strict.
- APK phải cài đè bằng `adb install -r`, không xóa dữ liệu app.
- Redmi Note 8 Pro Android 11 là thiết bị chứng minh chính.
- Mọi kết luận “đạt” phải đi từ test vừa chạy; Maestro bị MIUI chặn thì dùng Mobile MCP và ghi rõ.

## Approach

Chọn motion system dùng chung + showcase trong app + báo cáo HTML bên ngoài. Cách này tạo cảm giác nhất quán, cho giám khảo một lối demo trực tiếp và vẫn để lại bằng chứng mở được trong ZIP. Không chọn hiệu ứng riêng lẻ từng màn vì dễ rối và khó kiểm soát hiệu năng; không làm video giả lập vì không chứng minh app thật.
