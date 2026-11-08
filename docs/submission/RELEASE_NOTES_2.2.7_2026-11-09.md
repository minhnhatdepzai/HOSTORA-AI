# HOSTORA AI 2.2.7 — đồng bộ web, admin, app và source

Bản phát hành ngày 09/11/2026 đồng bộ website khách hàng, web quản trị, backend dùng chung, APK Android universal và Source ZIP trên cùng phiên bản 2.2.7.

## Thay đổi chính

- Hóa đơn lấy giá gói đã chốt từ snapshot của yêu cầu mua; quản trị viên chỉ nhập dịch vụ mua thêm và số tiền bổ sung.
- Yêu cầu hủy đơn hoặc hủy mua chuyển sang trạng thái chờ quản trị viên xác nhận; lịch sử xử lý được giữ lại.
- Chatbot đọc đúng giao dịch theo câu hỏi hiện tại, hỗ trợ checkout trong hội thoại và cho phép xóa từng cuộc trò chuyện.
- Giao diện app có lịch sử chat, composer an toàn với bàn phím, nhập VNI và dữ liệu tên/email được điền lại từ tài khoản khi mua thêm.
- SEO Analyzer chấp nhận tên miền không có tiền tố và chuẩn hóa sang HTTPS; thông báo quên mật khẩu giải thích rõ giới hạn gửi lại.
- Website Studio hiển thị và chia sẻ đường dẫn ổn định của website đã tạo.

## Bằng chứng kiểm tra

- TypeScript typecheck và ESLint web/Expo: đạt.
- Vitest: 63 tệp, 371/371 ca đạt.
- Next.js production build và AI local smoke check: đạt.
- Playwright cách ly: 67 ca đạt, 3 ca bỏ qua có chủ đích trên desktop và mobile viewport.
- UI audit: 12 tổ hợp desktop/mobile không có lỗi accessibility tự động hoặc page error.
- APK universal 2.2.7: đủ bốn ABI, chữ ký APK hợp lệ, cài đè giữ `firstInstallTime` và dữ liệu app.
- Native Maestro: 1/1 luồng tư vấn đạt trên Android Emulator 16.
- Native judge suite: 9/9 ca đạt trên chính APK 2.2.7, gồm 3 ca bình thường, 3 đầu vào không hợp lệ và 3 ca biên/sự cố; báo cáo HTML nằm tại `docs/submission/HOSTORA_MOBILE_9_CASES.html`.

## Chạy nhanh

Đọc `README.md`, sao chép `.env.docker.example` thành `.env.docker`, rồi chạy Docker Compose. Web khách hàng mở tại `http://127.0.0.1:3000`; web quản trị tại `http://127.0.0.1:3000/admin`.
