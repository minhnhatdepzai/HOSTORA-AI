# HOSTORA Website Studio

## Luồng khách hàng

1. Khách nhập ý tưởng, chọn phong cách/màu và quy mô dự kiến.
2. HOSTORA dựng bản demo, lưu project trên máy chủ và trả link `/website-studio/p/{id}`.
3. Khách có thể mở link, xem website cuộn liền mạch ngay trong khung máy tính/điện thoại, bấm điều hướng giữa Trang đầu/Giới thiệu/Điểm nổi bật/Liên hệ, tải ZIP và chat để sửa nội dung.
4. Khách đổi phong cách, màu chủ đạo và giọng văn ở trang link; lựa chọn được lưu trong project. Có nút đánh giá phù hợp/cần chỉnh và lý do để HOSTORA biết bản nháp gặp vấn đề gì.
5. Nếu bật GitHub, máy chủ tạo repo riêng tư cho project và đẩy bản đầu tiên; các lần chat tiếp theo đồng bộ commit mới.

## Học từ góp ý và giới hạn fine-tuning

- Mỗi project nhớ bản nội dung mới nhất, phong cách, màu, giọng văn và số lần sửa. Khi khách yêu cầu chỉnh tiếp, AI local nhận bản hiện tại và giọng văn đã lưu. Bản sửa cũng qua bước kiểm chứng nội dung trước khi lưu; bản chưa có căn cứ giữ nguyên website cũ. Đây là **thích nghi theo project**, không phải cập nhật trọng số model.
- Nút đánh giá chỉ lưu `rating`, lý do dạng lựa chọn, chế độ tạo, số lần sửa và phong cách trong `data/runtime/site-studio/feedback/`. Không lưu lời chat, tên, email hay số điện thoại trong bản ghi đánh giá. Xem tổng hợp bằng `pnpm studio:feedback-report`.
- Khi có Langfuse self-host/project đã kiểm chứng, các sự kiện đánh giá chỉ gửi metadata ẩn danh. Chúng chưa gắn với trace tạo nội dung để thành Langfuse score; không coi là đo chất lượng model đã hoàn chỉnh.
- HOSTORA kiểm tra một số cụm hứa hẹn bằng quy tắc, sau đó dùng lượt AI local thứ hai để đối chiếu bản nháp với mô tả gốc. Nếu một trong hai lượt phát hiện thông tin thiếu căn cứ, hệ thống trả bản mẫu. Kiểm chứng tự động có thể bỏ sót hoặc báo nhầm; khách vẫn cần xác nhận mọi khẳng định trước khi xuất bản.
- Có thể đặt `OLLAMA_STUDIO_MODEL` cho lượt soạn nháp nhanh hơn; lượt kiểm chứng vẫn dùng `OLLAMA_CHAT_MODEL`. Hai model phải có sẵn trong Ollama local. Nếu không đặt, cả hai lượt dùng `OLLAMA_CHAT_MODEL`.
- Prompt gửi tới Ollama local được lược bỏ mẫu email và số điện thoại phổ biến. Khách không nên nhập thông tin liên hệ vào mô tả; bộ lọc tự động có giới hạn và bản demo lưu trên máy chủ vẫn cần được khách kiểm tra trước khi chia sẻ.

## Trình diễn và mã tải về

- Website mẫu là một trang cuộn liền mạch. Three.js vẽ vật thể WebGL trong hero; GSAP và ScrollTrigger tạo chuyển động chữ, section và parallax khi cuộn.
- `prefers-reduced-motion` tắt animation liên tục và giữ một frame 3D tĩnh.
- File ZIP mang theo `three.module.js`, `three.core.js`, `gsap.min.js` và `ScrollTrigger.min.js` trong thư mục `vendor/`; website không cần CDN. Vì ES module không chạy ổn định khi mở trực tiếp bằng `file://`, README hướng dẫn mở bằng static web server hoặc tải cả thư mục lên hosting.
- Chưa fine-tune Website Studio: hiện chưa có tập ví dụ đủ lớn, được khách cho phép dùng, đã khử PII và được biên tập/đánh giá độc lập. Không lấy raw chat/lead hoặc bản demo chưa duyệt để train. Khi đủ dữ liệu, chia train/holdout theo project, chạy LoRA ngoại tuyến, lưu số bước optimizer và hash adapter, reload adapter và so sánh bốn chỉ số trong `docs/AI_EVALUATION.md` trước khi dùng.

## Bật tự động đẩy repo GitHub

Đăng nhập GitHub CLI trên đúng tài khoản chạy HOSTORA (`gh auth login`) hoặc cấp `GH_TOKEN` qua secret manager của máy chủ. Sau đó bật:

```bash
HOSTORA_STUDIO_GITHUB_ENABLED=true HOSTORA_STUDIO_GITHUB_OWNER=minhnhatdepzai pnpm dev:lan
```

Trên production, đặt hai biến này trong cấu hình service và khởi động lại service. Repo mặc định là private để không công khai nội dung khách. Link xem được phục vụ từ HOSTORA; muốn khách ngoài mạng nội bộ mở link, HOSTORA cần chạy ở domain công khai có HTTPS.

## Lưu trữ

Project JSON nằm trong `data/runtime/site-studio/`, thư mục này bị Git ignore. Đây là lưu trữ filesystem phù hợp cho một máy HOSTORA. Khi chạy nhiều instance hoặc nền tảng có filesystem tạm thời, cần chuyển storage sang database/object storage dùng chung trước khi nhận khách thật.
