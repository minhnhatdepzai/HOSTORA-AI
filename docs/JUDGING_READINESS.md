# HOSTORA AI — đối chiếu hai bảng chấm điểm

Ngày đối chiếu: 24/10/2026. Đề 01: **AI tư vấn chọn gói hosting/domain**. Nguồn: [đề chính thức](https://vibecoding.info.vn/de-bai) và [yêu cầu đầu ra, hướng dẫn nộp bài](https://vibecoding.info.vn/bai-viet/yeu-cau-dau-ra-va-huong-dan-nop-bai-vibe-coding-2026). Bảng A/B dưới đây là tiêu chí do ban tổ chức công bố; trạng thái là tự kiểm tra sản phẩm, **không phải điểm giám khảo**. Nhóm cần xác nhận trên cổng thi rằng mình được giao đúng Đề 01 và áp dụng bảng nào.

## Năm tính năng bắt buộc của Đề 01

| Tính năng                                                  | Triển khai và bằng chứng                                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form nhu cầu: loại web, truy cập, ngân sách, mua tên miền  | `/consultation` có wizard, validate và lưu nháp cục bộ; `tests/e2e/rubric.spec.ts` đi hết form.                                                          |
| AI gợi ý một gói chính, hai thay thế, giải thích dễ hiểu   | `/recommendations` nhận đúng 3 gói từ scoring tất định trong `lib/recommendation.ts`; `/api/ai/explain` chỉ diễn giải, không đổi thứ hạng/giá.           |
| Bảng so sánh 3 gói: giá, dung lượng, băng thông, tính năng | Bảng cuộn ngang, cột tiêu chí cố định, nguồn và ngày xác minh; kiểm tra trong Playwright desktop/mobile. Giá thiếu dữ liệu được đánh dấu, không tự tính. |
| Đăng ký tư vấn: tên và số điện thoại, lưu danh sách khách  | Chọn bất kỳ gói nào trong top 3, lưu lead theo gói đã chọn vào `localStorage`, xem/xóa ở `/dashboard`; dữ liệu liên hệ không gửi đến model.              |
| FAQ accordion 5 câu hosting/domain                         | Trang chủ có 5 câu; Playwright kiểm tra mở/đóng.                                                                                                         |

## Bảng A (100 điểm)

| Tiêu chí                               | Tối đa | Trạng thái có thể chứng minh                                                                                                                                        | Việc còn thiếu cho mức cao                                                                                                                 |
| -------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Hoàn thành chức năng và đúng nghiệp vụ |     25 | Có luồng 5 tính năng, top 3 và lead gắn gói; nguồn catalog ngày 23/10/2026.                                                                                         | Người chấm cần thử tình huống shop thực; giá phải xác minh lại trước demo/nộp.                                                             |
| Thiết kế kỹ thuật, mã nguồn            |     20 | Next/React Native TypeScript strict; recommendation, pricing, scenario tính tất định; Zod input; API lỗi dễ hiểu; Ollama loopback.                                  | Source chưa có CI công khai; cần kiểm tra trên máy nhận bài.                                                                               |
| Tích hợp AI, kiểm soát đầu ra          |     15 | Ollama thật, 23 tài liệu RAG local, trích nguồn clickable, guard thương mại, LoRA v2 cho chat; 12 câu retrieval khó đã thử qua endpoint.                            | Chưa có chấm claim faithfulness độc lập, trace production; không quy đổi HTTP 200 thành độ đúng.                                           |
| Kiểm thử ổn định, xử lý lỗi            |     15 | Vitest, Playwright desktop/mobile, `ai:check`, input sai và catalog outage; ma trận tối thiểu 6 case. Bản 1.5.0 đã cài và kiểm tra giao diện khách hàng trên Redmi. | Cần thử tải cao/mất Ollama và kiểm tra lại trên máy chấm.                                                                                  |
| Làm chủ Vibe Coding, phản biện         |     15 | `docs/submission/AI_EVIDENCE.md` ghi yêu cầu, lỗi quan sát, sửa và giới hạn; mã/test cho phép giải thích quyết định.                                                | Nhóm cần tự trình bày và trả lời chất vấn 5 phút; chưa có bằng chứng buổi bảo vệ.                                                          |
| Giao diện, trải nghiệm                 |      5 | Web responsive, mobile Playwright; APK cài trực tiếp; Lighthouse mobile trang đề xuất A11y 100.                                                                     | Cần đánh giá thực tế với người dùng mới.                                                                                                   |
| Triển khai, bàn giao                   |      5 | README, APK tải LAN, source ZIP, video demo dưới 2 phút.                                                                                                            | **Chưa có URL web công khai**; Bảng A yêu cầu link online. Cần triển khai có xác thực, HTTPS và kiểm soát truy cập local AI trước khi nộp. |

## Bảng B (100 điểm)

| Tiêu chí                 | Tối đa | Trạng thái có thể chứng minh                                                                                                | Việc còn thiếu cho mức cao                                                                            |
| ------------------------ | -----: | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Hoàn thành chức năng     |     30 | 5 chức năng dùng được theo luồng ở trên; APK 1.5.0 đã cài và kiểm tra giao diện khách hàng trên Redmi.                      | Demo trực tiếp theo tình huống và kiểm tra lại trên máy chấm.                                         |
| Hiểu bài toán, giá trị   |     15 | Tình huống chủ shop mới, ngân sách 600.000đ/tháng, 50.000 lượt/tháng, cần tên miền; nhận gói chính, so sánh, để lại tư vấn. | Người thuyết trình cần nói rõ lợi ích và giới hạn dữ liệu giá.                                        |
| Dùng AI xây và cải thiện |     20 | Có nhật ký yêu cầu → lỗi → sửa → thử trong `AI_EVIDENCE.md`, test và video.                                                 | Nên chọn tối đa 5 ảnh/trích đoạn thật từ quá trình làm để đính kèm 1 trang; không tạo bằng chứng giả. |
| Đúng nghiệp vụ và đầu ra |     15 | Giá/điểm tính bằng code, nguồn có ngày; không nói tên miền còn trống khi chưa kiểm tra; fallback mobile ghi rõ snapshot.    | Xác minh giá mới khi nộp, thêm case người dùng độc lập.                                               |
| Giao diện/trải nghiệm    |     10 | Web mobile và APK cài trực tiếp, FAQ/cột so sánh/CTA rõ.                                                                    | Thử người dùng lần đầu để phát hiện thao tác khó.                                                     |
| Kiểm tra/xử lý lỗi       |      5 | Input sai trả 400; lỗi catalog có retry; bộ test tự động.                                                                   | Có thể trình diễn 1 normal, 1 invalid, 1 edge theo ma trận.                                           |
| Demo/bàn giao            |      5 | README, ZIP, APK, video 34,4 giây. Bảng B cho chạy source tại máy.                                                          | Nhóm xem video, bổ sung thuyết minh nếu cần; thử ZIP trên máy sạch.                                   |

## Hồ sơ nộp và giới hạn

- [Ma trận test](submission/TEST_MATRIX.md): tối thiểu 2 case bình thường, 2 input sai, 2 edge/failure cho A; 1 mỗi loại cho B.
- [Bằng chứng dùng AI](submission/AI_EVIDENCE.md): tối đa một trang và tối đa 5 ảnh/trích đoạn theo hướng dẫn chính thức; nội dung hiện tại là mô tả có thể kiểm chứng, nhóm có thể đính kèm ảnh thật.
- [Video demo](submission/HOSTORA-demo-2026-10-24.mp4): 34,4 giây, dưới giới hạn 2 phút; bản quay hiện im tiếng, cần người nộp duyệt.
- [Lời dẫn 60–90 giây](submission/VIDEO_SCRIPT.md) để quay hoặc thuyết trình rõ 5 tính năng; không ghép nguyên lời dài vào video ngắn hiện có.
- `HOSTORA-source-2026-10-24.zip` là source có README và không chứa `.env.local`, lead, token, model GGUF hay `node_modules`. Model là dependency local cần cài theo README; không được gọi ZIP là bản AI chạy offline hoàn toàn ngay sau giải nén.
- APK dùng Android debug certificate; link tải từ máy local/LAN không thay thế URL công khai cho Bảng A. Chưa có server public/HTTPS/OAuth và không có Langfuse self-host trace, vì vậy không tuyên bố sẵn sàng production.
