# Nguồn tham khảo SEO và GEO

Các repo dưới đây được clone dạng shallow vào `/home/admin123/Downloads/hostora-seo-references` để đối chiếu. Chúng không được đưa thẳng vào bundle runtime của HOSTORA.

| Nguồn | Commit đã lấy | Dùng cho | Giấy phép |
| --- | --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | `5e745ace7e151feb2a93d360d0281fe39448b857` | skill review UI và detector chống giao diện rập khuôn | Apache-2.0 |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | `772c9e2781f7db0c0c8ff79567ee84e0a57b1bf6` | tham khảo kiểm tra hiệu năng, accessibility và SEO | Apache-2.0 |
| [llms-txt](https://github.com/AnswerDotAI/llms-txt) | `3700a0a624a4a004c6a246789b37f389940b1b58` | định dạng tài liệu cho trợ lý AI | Apache-2.0 |
| [next-seo](https://github.com/garmeeh/next-seo) | `738ef7e774ee6216f6e90c26a3b5b99dd5d166b4` | đối chiếu metadata/JSON-LD cho Next.js | MIT |
| [optifeed-radar](https://github.com/optifeed/optifeed-radar) | `2e0af8990de6914eefe4665bfe98f5d5c5e9e81b` | tham khảo danh sách crawler AI, quy tắc robots và cách công khai trọng số | MIT |

## Đã áp dụng vào HOSTORA

- `/llms.txt`: bản tóm tắt có thể đọc nhanh, URL chính thức, quy tắc trả lời và nguồn dữ liệu.
- `/llms-full.txt`: danh mục sản phẩm và sổ tay chi tiết, có ngày xác minh.
- Trang chủ có `Organization`, `WebSite`, `SoftwareApplication`, `WebApplication` và `FAQPage` JSON-LD.
- Audit tách ba điểm tổng quan, SEO Google và AI visibility; trọng số và thứ tự sửa do code tất định kiểm soát.
- Audit kiểm tra `llms.txt`, `llms-full.txt`, ngữ cảnh thực thể thương hiệu và quyền đọc của GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot cùng các crawler phổ biến khác.
- Sitemap dùng thời điểm build hiện tại thay vì ngày cố định cũ.

HOSTORA không chép nguyên mã hoặc thêm `optifeed-radar` vào dependency. Repo chỉ là nguồn đối chiếu; parser, SSRF guard, điểm và UI được triển khai theo kiến trúc local-first hiện có của HOSTORA.

## Việc cần bật trong Cloudflare

URL Quick Tunnel hiện tại chỉ dùng để kiểm tra và có thể đổi khi tiến trình dừng. Lần kiểm tra ngày 29/10/2026 cho thấy Cloudflare đang chèn `robots.txt` với các nhóm AI search như `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot` và `Claude-SearchBot` ở trạng thái `Disallow: /`. Điều này làm giảm khả năng chatbot trích dẫn HOSTORA dù `/llms.txt` đã hoạt động.

Trước khi đánh giá GEO ngoài mạng, vào **Cloudflare Dashboard → Security → Bots → AI Crawl Control** và cho phép nhóm bot tìm kiếm AI mà bạn muốn xuất hiện. Giữ nhóm bot huấn luyện ở trạng thái chặn nếu không muốn cấp quyền dùng nội dung để train. Sau khi đổi, kiểm tra lại URL `/robots.txt` công khai và `/llms.txt`; không coi cấu hình trong app là đã đủ nếu lớp Cloudflare vẫn chèn quy tắc chặn.

## Ranh giới dữ liệu

GEO không phải cam kết được Google hoặc một chatbot xếp hạng. HOSTORA chỉ xuất bản nội dung đã có trong catalog, sổ tay và nguồn xác minh; giá, tình trạng và chính sách vẫn phải kiểm tra lại trước khi thanh toán.

Trạng thái crawler chỉ chứng minh quy tắc công khai tại thời điểm quét cho phép hoặc chặn truy cập đường dẫn gốc. Nó không đo câu trả lời thật của ChatGPT/Claude, mức độ được trích dẫn, thứ hạng, traffic hay doanh thu.
