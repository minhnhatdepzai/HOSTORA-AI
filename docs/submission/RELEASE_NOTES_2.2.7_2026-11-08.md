# HOSTORA AI 2.2.7 — source handoff 08/11/2026

Đây là bản source chốt sau 2.2.6 để giám khảo tải về và chạy web khách hàng, web quản trị, backend dùng chung và source ứng dụng Android từ một repository.

## Thay đổi chính

- Hóa đơn lấy giá gói đã chốt từ snapshot của yêu cầu mua; quản trị viên chỉ nhập dịch vụ mua thêm và số tiền bổ sung.
- Yêu cầu hủy đơn hoặc hủy mua chuyển sang trạng thái chờ quản trị viên xác nhận; lịch sử xử lý được giữ lại.
- Chatbot đọc đúng giao dịch theo câu hỏi hiện tại, hỗ trợ checkout trong hội thoại và cho phép xóa từng cuộc trò chuyện.
- Giao diện app có lịch sử chat, composer an toàn với bàn phím, nhập VNI và dữ liệu tên/email được điền lại từ tài khoản khi mua thêm.
- SEO Analyzer chấp nhận tên miền không có tiền tố và chuẩn hóa sang HTTPS; thông báo quên mật khẩu giải thích rõ giới hạn gửi lại.
- Website Studio hiển thị và chia sẻ đường dẫn ổn định của website đã tạo.

## Bằng chứng kiểm tra trước khi đóng gói

- TypeScript typecheck: đạt.
- ESLint web và Expo: đạt.
- Vitest: 63 tệp, 371/371 ca đạt.
- Next.js production build: đạt.
- AI local smoke check: đạt với Qwen/Ollama loopback.
- Playwright cách ly: 67 ca đạt, 3 ca bỏ qua có chủ đích trên desktop và mobile viewport.
- Android native: chưa chạy lại trong lượt chốt source vì không có thiết bị được kết nối; APK universal 2.2.6 vẫn là artifact native gần nhất đã kiểm tra.

## Chạy nhanh

Đọc `README.md`, sao chép `.env.docker.example` thành `.env.docker`, rồi chạy Docker Compose. Web khách hàng mở tại `http://127.0.0.1:3000`; web quản trị tại `http://127.0.0.1:3000/admin`.
