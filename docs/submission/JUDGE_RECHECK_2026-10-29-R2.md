# HOSTORA 2.0.9 — recheck sau hai lỗi diễn giải

Ngày 29/10/2026. Bản này nối tiếp đánh giá 82/100 và chỉ tập trung vào hai lỗi đã tái hiện trong `JUDGE_REVIEW_2026-10-29.md`.

## Đã sửa

1. “Không cần mua kèm tên miền” giữ `needsDomain: false`; câu vừa phủ định vừa yêu cầu domain trả `null` để hỏi lại.
2. “Blog chia sẻ kinh nghiệm bán hàng, chỉ đăng bài viết, không kinh doanh trên web” giữ `websiteType: blog`, `ecommerce: false`.
3. Bổ sung các cách diễn đạt “viết về cách bán hàng online”, “không nhận đơn”, “không cần giỏ hàng nhưng vẫn nhận đơn” và blog có giao dịch thật.

Nguyên nhân được xử lý ở `lib/advisor-analysis.ts`: tách cụm phủ định khỏi văn bản khẳng định, nhận diện chủ đề nội dung trước khi coi từ “bán hàng” là chức năng thương mại, và trả trạng thái chưa chắc khi hai ý định mâu thuẫn.

## Bằng chứng

- `tests/advisor-quality.test.ts`: 36/36 ca đạt.
- Toàn bộ suite local sau thay đổi: 190/190 test đạt.
- Typecheck, lint và build web đạt.
- Hai câu gọi `/api/ai/analyze` thật qua URL Cloudflare public trả đúng blog, thương mại điện tử false và nhu cầu domain false.

Đây là kiểm tra hồi quy có định hướng, không phải tỷ lệ hiểu tiếng Việt trên toàn bộ ngôn ngữ tự nhiên. Cần tiếp tục thu thập paraphrase từ người dùng thật và đánh giá mù trước khi gọi chất lượng production.
