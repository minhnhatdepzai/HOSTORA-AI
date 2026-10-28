# HOSTORA 2.0.9 — bàn giao kiểm tra lại ngày 29/10/2026

Đây là bản đối chiếu từ mã nguồn, APK trên Redmi Note 8 Pro và web production local. [Báo cáo chấm thử ban đầu](JUDGE_REVIEW_2026-10-28.md) và [đối chiếu 28/10](JUDGE_RECHECK_2026-10-28.md) là tài liệu lịch sử. Không suy ra điểm 100/100 hay thứ hạng top 10 từ bộ kiểm thử nội bộ.

## Ba tệp cần gửi cùng nhau

| Tệp | Nội dung | Trạng thái |
|---|---|---|
| `mobile/releases/HOSTORA-AI-2.0.9-arm64.apk` | Ứng dụng Android, package `com.hostora.ai`, versionCode 21, min SDK 24, target SDK 36 | Đã build, cài đè và mở trên Redmi Note 8 Pro; ký debug cục bộ, chưa dùng để phát hành Play Store |
| `docs/submission/HOSTORA-source-2.0.9-2026-10-29.zip` | Source web, app, test, tài liệu, RAG index công khai và asset; không kèm APK/model/data khách | Đã giải nén, cài dependency web/app vào thư mục riêng và kiểm tra build; chưa thử trên máy khác |
| `docs/submission/HOSTORA-demo-2.0.9-2026-10-29.mp4` | 46 giây, không tiếng: web production và thao tác app thật trên Redmi Note 8 Pro | Đã kiểm tra thời lượng, khung hình và luồng app có dữ liệu qua kết nối USB |

SHA-256 của ba tệp nằm trong `HOSTORA-2.0.9-SHA256SUMS.txt`. Web local tải đúng APK 2.0.9 qua `/downloads/android`. Cùng các tệp này được đưa lên [GitHub prerelease 2.0.9 cập nhật](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/tag/v2.0.9-review-20261029-r2), gắn nhãn bản đánh giá. Bản ổn định cũ là v1.5.0.

## Những lỗi chính đã xử lý

1. **Xếp gói theo nhu cầu:** `lib/recommendation.ts` phân biệt website blog, doanh nghiệp và cửa hàng. Yêu cầu tên miền làm ưu tiên gói có tên miền theo điều kiện đã công bố; nhu cầu bán hàng vẫn loại gói không hỗ trợ. Đây là trọng số quy tắc minh bạch, **chưa hiệu chỉnh bằng dữ liệu người dùng**. Không suy diễn sức chịu tải từ GB và không tự cộng phí tên miền chưa xác minh.
2. **Ngân sách và lời hứa:** gói vượt ngân sách thành phương án tham khảo. Khi khách bỏ trống số tiền trả trước, web, app và lời tư vấn từ website được tạo đều nói chỉ đang so sánh **ngân sách lưu trữ theo tháng**; tổng tiền còn phải xác nhận. Xưởng tạo website không gắn “phù hợp nhất” cho gói không đạt điều kiện.
3. **Tương tác và bảo vệ dữ liệu:** lỗi bản standalone thiếu JavaScript/CSS, ảnh đã được sửa bằng `scripts/prepare-standalone.mjs`. Bản chạy standalone được đóng gói với thư mục dữ liệu đơn hàng và dự án khách trống; chỉ mang hai APK tải về đang dùng. Cấu hình `.env.local` không được đưa vào ZIP.
4. **Đồng bộ phiên bản:** `mobile/app.json`, `mobile/package.json`, README, checksum APK, link tải trên web và video cùng chỉ tới bản 2.0.9.

## Kết quả kiểm tra mới

- `pnpm typecheck` và `pnpm --dir mobile typecheck`: đạt sau thay đổi mã.
- Kiểm tra ZIP trong thư mục giải nén riêng: `pnpm install --frozen-lockfile` ở gốc và `mobile/` tạo hai cây `node_modules` mới từ pnpm store trên máy này; `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` và typecheck/lint mobile đều đạt. Chưa thử trên máy khác hoặc tải toàn bộ package từ registry không có cache.
- `pnpm test`: **182/182** đạt; thêm các ca đổi loại website, tên miền, giới hạn trả trước và gói vượt ngân sách trong Studio.
- `pnpm build`: đạt trên Next.js 16, có cảnh báo từ dependency OpenTelemetry; bản standalone trả JavaScript/CSS, icon và APK 2.0.9 bằng HTTP 200. Trước khi chạy E2E, thư mục `data/runtime` trong bản standalone được làm trống.
- Playwright trên bản ZIP chạy production local cổng 3210: **47 đạt, 1 bỏ qua có chủ đích** (ca sửa danh mục chỉ chạy trên desktop); có desktop và viewport Pixel 7. Bộ test dùng cấu hình phiên quản trị và SQLite cách ly.
- Redmi Note 8 Pro: APK 2.0.9 cài đè thành công; đã bấm từ trang chủ qua bốn bước tư vấn và nhìn kết quả ngân sách lưu trữ, tiền trả trước chưa nhập. ADB kết nối lại ngày 29/10; đã thiết lập máy chủ qua USB trong app, tải được bảng giá và quay thao tác thật cho video. App vẫn cần máy chủ HOSTORA khả dụng. Ảnh `output/hostora-2.0.9-*.png` lưu tại máy phát triển.
- `pnpm ai:check` trả structured output thật từ Ollama local sau 19,531 giây trên cấu hình phát triển. Chạy từ ZIP không có `.env.local` cũng đạt với model mặc định `qwen3.5:9b-q8_0` sau 11,706 giây; phép đo này không đánh giá riêng model fine-tune. Hai yêu cầu `/api/ai/analyze` gọi đồng thời ở bản production local trả HTTP 200 và nhận đúng `store`/`company`, với thời gian quan sát 19,463 và 16,298 giây (tổng thời gian tường 19,463 giây). Đây chỉ là **một cặp yêu cầu**, không đủ để ước tính p95 hay khả năng chịu tải. Bộ 50/50 tình huống tuần tự trong đối chiếu 28/10 là kết quả lịch sử, chưa chấm lại ở bản 2.0.9.

## Giới hạn còn cần bằng chứng ngoài máy phát triển

- Đã có URL HTTPS tạm thời qua Cloudflare Quick Tunnel để đánh giá ngoài mạng: xem [CLOUDFLARE_DEMO_2026-10-29.md](CLOUDFLARE_DEMO_2026-10-29.md). Đây không phải URL production cố định; URL sẽ mất khi tiến trình tunnel dừng.
- Chưa có lần cài và chạy trên máy khác; người đánh giá cần Node.js/pnpm, Ollama và các model trong README. APK cần server HOSTORA để gọi AI.
- Chưa có 5–10 chủ shop dùng thử có quan sát, điểm chấm mới, hoặc số chuyển đổi bán hàng thật.
- Chưa kiểm thử tải thực tế từng gói hosting; điểm so sánh không đo hiệu năng. Độ trễ AI ở nhiều mức đồng thời, nội dung trả lời tự do và khả năng chịu tải vẫn cần kiểm tra riêng.
- Stripe/VNPay thật yêu cầu merchant sandbox và khóa HOSTORA; không coi thanh toán nội bộ là xác nhận từ cổng thật. APK hiện ký debug, chưa ký production.
- Working tree phát triển chính vẫn có nhiều thay đổi chưa được commit. Bản nguồn nộp đánh giá được tách thành nhánh và tag prerelease riêng; không nên dùng link release GitHub v1.5.0 như bản mới.

## Cách kiểm tra trên máy này

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm --dir mobile typecheck && pnpm --dir mobile lint
pnpm ai:check
pnpm start
```

Web chạy mặc định tại `http://127.0.0.1:3000`; vào `/admin` để thấy cổng email, `/consultation` để chọn gói, `/website-studio` để thử tạo web sau khi đăng nhập. Nếu kiểm tra lại E2E, dùng server production riêng và SQLite cách ly như trong `playwright.config.ts` và test fixture, không chạy trên cơ sở dữ liệu khách đang dùng.
