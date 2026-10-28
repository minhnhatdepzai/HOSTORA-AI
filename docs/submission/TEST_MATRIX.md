# Ma trận kiểm tra Đề 01

**Bản này ghi nhận ca chạy ngày 24/10.** Xem [bàn giao 2.0.9 ngày 29/10](JUDGE_HANDOFF_2026-10-29.md) để biết kết quả mới và giới hạn chưa kiểm chứng.

Ngày chạy cuối: 24/10/2026. Nguồn thực thi: `tests/e2e/rubric.spec.ts`, `tests/api-validation.test.ts`, `tests/recommendation.test.ts`, `scripts/evaluate-rag-live.mjs`. Kết quả: 39/39 unit, 18/18 Playwright desktop/mobile; 12/12 retrieval hard queries qua endpoint ở chế độ hybrid.

| Nhóm          | Case                                                                 | Kỳ vọng và cách kiểm tra                                                            | Trạng thái          |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------- |
| Bình thường 1 | Chủ shop đi từ wizard → top 3 → bảng so sánh → chọn gói thứ 2 → lead | Cả 5 chức năng đi hết, lead ghi đúng gói đã chọn; Playwright desktop/mobile.        | Đạt, desktop/mobile |
| Bình thường 2 | Hỏi domain availability qua chat                                     | Trả lời không đoán còn trống, có URL nguồn thực HTTPS; Playwright + endpoint local. | Đạt, desktop/mobile |
| Input sai 1   | POST `/api/recommend` body `{}`                                      | HTTP 400 và thông báo chỉ ra dữ liệu nhập, không có stack trace.                    | Đạt, desktop/mobile |
| Input sai 2   | POST `/api/ai/chat` với `messages: []`                               | HTTP 400 dễ hiểu, không gọi inference vô ích.                                       | Đạt, desktop/mobile |
| Biên/lỗi 1    | Giả lập API đề xuất mất kết nối                                      | UI có cảnh báo và nút thử lại, không thay giá/xếp hạng chưa xác minh.               | Đạt, desktop/mobile |
| Biên/lỗi 2    | Giá gia hạn chưa xác minh                                            | Không tính tổng chắc chắn hay coi là phù hợp ngân sách tuyệt đối; Vitest domain.    | Đạt, unit test      |

Bảng A dùng cả 6 case (2 bình thường, 2 sai, 2 biên/lỗi). Bảng B dùng ít nhất case 1, 3 và 5. Case bảo vệ bổ sung: lịch sử chat cũ có giá sai không được đưa sang hội thoại/AI context mới; Playwright desktop/mobile đã đạt. Câu hỏi chọn gói quá chung được yêu cầu bổ sung 4 đầu vào trước khi xếp hạng. `rag:evaluate:live` kiểm tra retrieval 12 câu hỏi khó; **không** đồng nghĩa đánh giá toàn diện câu trả lời sinh. APK 1.3.0 đã được thử wizard → top 3 → so sánh → chọn gói thứ hai → lưu/xóa lead trên Redmi Note 8 Pro. APK 1.3.1 arm64 đã cài đè; chat mới không còn câu giá cũ, trả lời CDN bằng local AI kèm 2 link nguồn.
