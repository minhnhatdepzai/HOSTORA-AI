# HOSTORA — kế hoạch khắc phục sau đánh giá

Phạm vi: các lỗi trong `JUDGE_REVIEW_2026-10-28.md`, áp dụng web và app. Giữ nguyên các thay đổi đang có trong working tree. Không dùng số điểm nội bộ để tuyên bố thứ hạng cuộc thi.

1. Ràng buộc khả năng chi trả trước xếp hạng: giá gia hạn, số tiền trả trước tùy chọn; trạng thái chưa có gói đáp ứng; phương án tham khảo được gắn nhãn riêng. Không suy diễn sức chịu tải từ GB lưu trữ.
2. Kiểm chứng đầu ra tư vấn: loại website nhất quán với nhu cầu bán hàng; câu hỏi chỉ hỏi dữ kiện thiếu; giải thích gói từ dữ kiện máy chủ, giữ Có / Không / Chưa xác minh; xử lý AI không khả dụng.
3. Chuẩn hóa dữ liệu liên hệ trước xác thực; cô lập từng bản ghi lỗi khi đọc, bảo toàn dữ liệu gốc và hiển thị cảnh báo.
4. Tư vấn là điểm vào chính; giải thích giá trả trước, gia hạn và ý nghĩa điểm bằng tiếng Việt; đồng bộ mobile và loại bỏ xếp hạng dự phòng chưa xác minh.
5. Cập nhật E2E theo phiên đăng nhập hợp lệ, phiên bản APK, luồng Studio; thêm bộ đánh giá nội dung AI có đáp án và thời gian phản hồi thật.
6. Chạy typecheck, lint, unit, build, E2E desktop/mobile, AI check; kiểm tra app trên Redmi nếu thiết bị khả dụng. Ghi kết quả mới riêng với báo cáo cũ.
7. Hoàn thiện hướng dẫn demo, phản biện, đóng gói và nghiên cứu 5–10 người dùng. Link công khai, phản biện trực tiếp và thử nghiệm người thật phải có bằng chứng thực tế, không tự đánh dấu đạt.

Hướng UI: chủ shop không rành kỹ thuật; tập trung chọn gói vừa túi tiền; xanh trầm và chữ hiện có, mật độ vừa phải; một hành động chính, tổng tiền nhìn thấy trước khi chọn; dùng cảnh báo có điều kiện thay cho lời hứa tuyệt đối.

## Kết quả xác minh sau sửa — 28/10/2026

- Bản web production build bằng Webpack thành công. `pnpm typecheck`, `pnpm lint` (0 lỗi, 1 cảnh báo ở tệp probe trong `output/`), `pnpm test` (179/179), và `git diff --check` đạt.
- E2E trên bản production cổng 3100: 47 đạt, 1 chủ động bỏ qua vì ca sửa danh mục chạy một lần trên desktop. Chạy cả viewport desktop và Pixel 7; đã kiểm tra tạo/sửa/lưu trữ dịch vụ, đăng nhập quản trị, tư vấn, Studio và thanh toán thử. Bộ kiểm thử thanh toán cần trỏ đến cùng tệp SQLite với server qua `HOSTORA_PAYMENTS_DB_PATH`.
- Đánh giá AI thật cố định 25 tình huống × 2 lượt: 50/50 đạt bộ tiêu chí nội bộ, trung vị 3.141 ms và p95 quan sát 3.461 ms. Kết quả trong `output/advisor-quality-verified/`; đây không phải benchmark tải đồng thời, khảo sát khách hàng hay điểm cuộc thi. `pnpm ai:check` đã được sửa để đọc `.env.local` và kiểm tra đúng các model app đang dùng; lượt sau khi model đã nạp đạt trong 316 ms (lượt nạp nguội trước đó mất 83.031 ms).
- Đợt train chatbot-v6 và studio-v3 trước đó đều hoàn thành nhưng vẫn là ứng viên, chưa đưa vào app. Bộ đánh giá ứng viên ghi chatbot-v6 đúng hướng xử lý 134/142 ca (8 ca còn sai), Studio-v3 đạt các cổng tự động trên 24 ca. Cần xem thủ công các câu sai và website sinh ra trước khi đổi model đang phục vụ khách; không gọi ứng viên là bản đã triển khai.
- APK Android 2.0.8 arm64 được build lại, SHA-256 `aff6761ad3b8284a0a3dcce11ea09e538861c8a076e3f2c7d59835119c8b6002`, cài đè thành công trên Redmi Note 8 Pro (`com.hostora.ai`, versionCode 20). Thiết bị đã kết nối backend qua ADB reverse; mở trực tiếp trang chủ → tư vấn và kiểm tra trang chi phí khi cuộn. Ảnh ở `output/hostora-redmi-advisor-2.0.8-*-final.png` và `output/hostora-redmi-advisor-2.0.8-cost-checklist.png`.
- Đã bỏ biểu đồ chịu tải dựng từ số mẫu trên app; thay bằng danh sách kiểm tra và nêu rõ chưa có dữ liệu thử tải. CTA chính của trang chủ app hiện dẫn tới tư vấn chọn gói; lối tạo web vẫn ở ngay dưới.
- Đã xem lại ảnh web production sau khi animation ổn định ở 1440×900 và 390×844: `output/playwright/improved-home-settled-desktop.png`, `output/playwright/improved-home-settled-mobile.png`. Console không có lỗi JavaScript; Chromium phát cảnh báo GPU stall khi đọc pixel WebGL để chụp ảnh.

Việc chưa xác minh: URL triển khai công khai, thử nghiệm có quan sát với 5–10 chủ shop, phản biện trực tiếp và điểm chính thức. Không quy kết kết quả kiểm thử nội bộ thành 100/100 hoặc thứ hạng top 10.
