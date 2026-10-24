# Minh chứng sử dụng AI để xây và cải thiện HOSTORA AI

Ngày 24/10/2026. Đây là bản tóm tắt một trang, chỉ nêu việc có thể đối chiếu bằng mã/test; không dựng lại hội thoại giả. Tối đa 5 ảnh/trích đoạn thật có thể được người nộp bổ sung từ phiên làm việc.

1. **Yêu cầu người dùng:** “check xem có đúng tiêu chí chưa, nếu chưa thì hoàn thiện đi ... cả 2 bảng luôn”. Agent đối chiếu [Đề 01 và hướng dẫn nộp chính thức](https://vibecoding.info.vn/bai-viet/yeu-cau-dau-ra-va-huong-dan-nop-bai-vibe-coding-2026), rồi xác định 5 luồng và điều kiện A/B trong `docs/JUDGING_READINESS.md`.
2. **Lỗi nghiệp vụ tìm được:** CTA lead trên web luôn gắn gói đầu tiên dù khách chọn gói thay thế; fallback mobile chứa giá và ID cũ. Đã sửa chọn gói trước khi lưu lead, đồng bộ snapshot ngày 23/10 và ghi rõ đây không phải giá hiện hành. Kiểm tra qua Playwright và build APK 1.3.0.
3. **Lỗi kiểm soát AI/RAG:** citation ở chat trước đó chỉ là ID văn bản, người dùng khó kiểm chứng; khi vector index lỗi, chế độ từ khóa dự phòng im lặng. Đã thêm link HTTPS/ngày nguồn được trích và cảnh báo fallback; thử retrieval qua endpoint 12 câu khó. Chưa có chấm claim faithfulness độc lập.
4. **Lỗi trải nghiệm/ổn định:** API input sai có thể thành 500; catalog mất kết nối có nguy cơ làm người dùng hiểu nhầm giá dự phòng. Đã thêm Zod 400, lỗi 503 khi chat không chạy, màn retry không hiển thị giá chưa xác minh. Có test request sai và browser outage.
5. **Phản biện sau kiểm tra thiết bị:** QA bản 1.3.0 thấy lịch sử chat từ phiên bản cũ còn chứa gói/giá lỗi thời và có thể bị đưa lại vào ngữ cảnh model. Đã tách khóa lưu hội thoại ở web/native, giữ nguyên dữ liệu cũ trên thiết bị nhưng không tái sử dụng; Playwright kiểm tra câu cũ không xuất hiện trong request mới. Bản APK sửa lỗi là 1.3.1. Lighthouse 100 chỉ áp dụng một trang; holdout/challenge HTTP 200 và retrieval score không chứng minh mọi câu trả lời đều đúng.

Người thuyết trình có thể mở test, catalog nguồn và kết quả AI thật để giải thích tại sao **giá/xếp hạng do code quyết định**, còn Ollama chỉ giải thích nội dung có nguồn. Không đưa số điện thoại thật, secret hay raw trace vào minh chứng.
