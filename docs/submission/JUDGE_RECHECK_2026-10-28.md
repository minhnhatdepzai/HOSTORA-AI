# HOSTORA — đối chiếu lại đánh giá ngày 28/10/2026

**Lưu ý:** Đây là ảnh chụp trạng thái ngày 28/10, trước bản 2.0.9. Kết quả và gói bàn giao mới nhất được ghi tại [JUDGE_HANDOFF_2026-10-29.md](JUDGE_HANDOFF_2026-10-29.md). Các dòng phiên bản 2.0.8 và mục “chưa giải quyết” dưới đây là lịch sử, không phải kết luận cho bản mới.

Báo cáo [`JUDGE_REVIEW_2026-10-28.md`](JUDGE_REVIEW_2026-10-28.md) ghi nhận bản trước khi sửa. Bản này kiểm tra working tree và bản production local đang chạy ở `127.0.0.1:3100` vào tối 28/10/2026. Kết quả không phải điểm chấm chính thức; không tính lại 72/100 khi thiếu phản biện, triển khai và người dùng thật.

| Vấn đề trong báo cáo cũ | Trạng thái hiện tại | Bằng chứng và giới hạn |
|---|---|---|
| Ngân sách 10.000đ vẫn gắn “phù hợp nhất” | **Đã sửa lỗi cụ thể** | API trả `no-match`; 3 gói đều `over-budget`. Web và APK trên Redmi hiển thị “Chưa có gói đáp ứng ngân sách này”, các gói là tham khảo. `lib/recommendation.ts`, `tests/advisor-quality.test.ts`, `tests/e2e/advisor-quality.spec.ts`. |
| Giá gia hạn và tiền trả trước | **Một phần** | Xếp gói kiểm tra giá ưu đãi, gia hạn và tiền trả trước *nếu khách nhập giới hạn trả trước*. Khi không nhập, app nhắc xác nhận trước khi mua. Giá tên miền, thuế và dịch vụ mua thêm chưa nằm trong điều kiện ngân sách. |
| Loại website và nhu cầu tên miền ảnh hưởng xếp hạng | **Chưa giải quyết hết** | Đổi `blog` → `company` hoặc `needsDomain: false` → `true` với cùng dữ kiện vẫn cho cùng ba gói, cùng thứ tự và điểm. Loại `store` có kiểm tra khả năng bán hàng; `needsDomain` mới thêm cảnh báo. Chưa có hiệu chỉnh trọng số bằng dữ liệu thực. |
| Suy đoán sức chịu tải từ GB | **Đã bỏ suy đoán trực tiếp; chưa đo tải** | Thành phần tài nguyên để trung tính; UI nói rõ dung lượng không chứng minh sức chịu tải. Chưa chạy thử tải website thật trên từng gói. |
| AI hiểu câu bán mỹ phẩm là web giới thiệu và hỏi lại tên miền | **Đã sửa ca cụ thể** | Gọi `/api/ai/analyze` thật: `websiteType=store`, `ecommerce=true`, 50.000 lượt, 600.000đ, `needsDomain=true`, không hỏi thêm. `lib/advisor-analysis.ts` đối chiếu kết quả model. Lượt gọi đồng thời trong lần kiểm tra này mất 21,63 giây; chưa chứng minh độ trễ ổn định khi nhiều khách dùng cùng lúc. |
| CDN `null` bị nói thành “không có” | **Đã sửa luồng đề xuất** | `/api/ai/explain` thật trả “Chưa xác minh” cho CDN Premium, chỉ cho model chọn mã dữ kiện máy chủ đã xác nhận. Các chủ đề giải thích tự do khác vẫn cần kiểm định nội dung riêng. |
| Tên trắng/số `+++++++++` được lưu; một lead hỏng che hết lead tốt | **Đã sửa lỗi cụ thể** | Chuẩn hóa và kiểm tra trước khi lưu; đọc từng bản ghi, giữ lead hợp lệ và đếm bản ghi lỗi. Unit và E2E hồi quy đạt. Lead tư vấn này vẫn lưu trong browser localStorage, không tự đồng bộ giữa nhiều máy. |
| Trang chủ không có lối vào tư vấn | **Đã sửa** | CTA “Tư vấn chọn hosting” hiện trên web; app có “Tư vấn chọn gói phù hợp” làm nút chính. Đã bấm luồng trên Redmi Note 8 Pro. |
| E2E lệch login quản trị, login Studio và phiên bản APK | **Đã sửa kiểm thử** | Chạy lại toàn bộ: 47 đạt, 1 bỏ qua có chủ đích (CRUD danh mục chỉ chạy một lần trên desktop). Kiểm thử giữ ranh giới đăng nhập. Web trả APK 2.0.8; app 2.0.8 đã cài trên Redmi. |
| Thuật ngữ khó, bảng so sánh mobile | **Cải thiện một phần** | Bảng có chỉ dẫn vuốt và nhãn tiếp cận; giao diện chính dùng lời giải thích tiếng Việt. Chưa có audit screen reader, thứ tự focus và độ tương phản toàn diện; chưa thử với người dùng không rành kỹ thuật. |
| Đánh giá AI theo nhiều tình huống | **Có kiểm thử nội bộ, chưa đủ chứng minh ngoài thực tế** | 25 tình huống × 2 lượt đạt 50/50 trên model tư vấn cấu trúc, trung vị 3.141 ms, p95 quan sát 3.461 ms trong điều kiện tuần tự. Chatbot-v6 còn sai hướng xử lý 8/142 ca, Studio-v3 là ứng viên chưa triển khai. |
| URL công khai, máy sạch, video và source cùng phiên bản | **Chưa đạt** | README ghi chưa có URL công khai ổn định; bản GitHub/tag gần nhất là v1.5.0 trong khi APK local là 2.0.8. `README.md` còn ghi APK 2.0.5, `mobile/README.md` ghi 2.0.6, tệp SHA chưa có 2.0.8. Video nộp hiện có ngày 24/10, dài 34,4 giây; chưa chứng minh nó quay đúng bản 2.0.8. Working tree còn nhiều thay đổi chưa commit. |
| 5–10 chủ shop dùng thử và phản biện thực tế | **Chưa có bằng chứng** | Chưa có quan sát độc lập, thời gian hoàn thành, mức hiểu giá gia hạn, hoặc điểm chấm/phản biện thật. Không thể kết luận 100/100 hay top 10. |

## Lượt kiểm tra mới

- `pnpm typecheck` và `pnpm --dir mobile typecheck`: đạt.
- `pnpm test`: 179/179 đạt; 31 test hồi quy liên quan tư vấn, lead và app chạy riêng cũng đạt.
- `pnpm lint`: 0 lỗi, 1 cảnh báo ở tệp probe trong `output/`.
- `pnpm test:e2e` trên production local, desktop + Pixel 7: 47 đạt, 1 bỏ qua. Đây là browser E2E; không thay cho kiểm thử toàn bộ APK trên điện thoại.
- API thật: ngân sách thấp trả `no-match`; AI phân tích ca bán mỹ phẩm đúng; giải thích CDN Premium “Chưa xác minh”. Hai lượt AI được gọi đồng thời, lần lượt 21,63 và 22,63 giây.
- Thiết bị USB được nhận là Redmi Note 8 Pro, package `com.hostora.ai` phiên bản 2.0.8. Đã thao tác trực tiếp 4 bước tư vấn với ngân sách 10.000đ/tháng; màn kết quả trên thiết bị hiện đúng trạng thái không có gói đáp ứng. Ảnh: `output/hostora-redmi-audit-low-budget-result.png` và `output/hostora-redmi-advisor-2.0.8-*-final.png`.

Ưu tiên còn lại: (1) xác định điều kiện chọn gói khi cần tên miền và giới hạn trả trước chưa nhập; (2) hiệu chỉnh trọng số bằng tình huống có đáp án và thử tải thật; (3) đánh giá AI dưới nhiều lượt đồng thời và các câu trả lời tự do; (4) chốt một commit/tag, đồng bộ README–SHA–APK–video, kiểm tra từ máy sạch và URL HTTPS; (5) thử có quan sát với chủ shop rồi mới xin chấm lại.
