# HOSTORA — hardening bảo mật nhiều lớp

Ngày rà soát: 29/10/2026. Phạm vi: web khách hàng, web quản trị và API Next.js 16.4.2. Đây là review source và kiểm thử local; chưa phải pentest độc lập hay bằng chứng Cloudflare production đã bật.

## Kết luận điều hành

HOSTORA đã có thêm lớp bảo vệ ở ứng dụng: security headers/CSP, giới hạn JSON trước khi parse, quota SQLite cho hành động nhạy cảm, `429` có `Retry-After`, kiểm soát proxy header và Cloudflare Turnstile thích ứng cho đăng nhập/đăng ký/quên mật khẩu trên web. Turnstile được xác minh phía server, giới hạn 2.048 ký tự, có timeout, kiểm tra `action` và hostname; token/secret không được log.

Các thay đổi này giảm brute force, spam và cạn tài nguyên ở tầng ứng dụng. Chúng **không thể tự chống DDoS volumetric**. Production vẫn phải đặt Cloudflare proxy/WAF trước origin và khóa origin chỉ nhận dải IP Cloudflare. Cloudflare mô tả DDoS L3/4 và L7 là luôn bật trên mọi gói, nhưng cũng khuyến nghị WAF/rate limiting, khóa origin và cache để phòng chủ động: [feature interoperability](https://developers.cloudflare.com/waf/feature-interoperability/), [proactive DDoS defense](https://developers.cloudflare.com/ddos-protection/best-practices/proactive-defense/).

## Những gì đã triển khai trong source

| Lớp | Cơ chế | Trạng thái |
|---|---|---|
| Trình duyệt | CSP, chống iframe, `nosniff`, Referrer/Permissions Policy, CORP | Đã triển khai trong `next.config.ts` |
| Payload | JSON mặc định tối đa 16 KiB trước khi parse/Zod | Đã triển khai trong `lib/api-validation.ts` |
| Stream | Dừng đọc khi vượt giới hạn dù thiếu `Content-Length`; response website ngoài được cắt stream | Đã triển khai và có test |
| Brute force | Hai bucket client/IP + danh tính, fixed-window SQLite; key được băm, không lưu email/IP thô | Đã triển khai cho customer auth; admin có quota riêng |
| Phản hồi | `429`, `Retry-After`, `cache-control: no-store` | Đã triển khai |
| CAPTCHA | Turnstile chỉ hiện sau nhiều lần thử trên web | Đã triển khai, cần key Cloudflare để bật |
| Siteverify | Server-side, timeout 5 giây, action/hostname, token single-use do Cloudflare | Đã triển khai và có unit test |
| Proxy identity | Bỏ qua `CF-Connecting-IP`/`X-Forwarded-For` nếu deployment chưa opt-in | Đã triển khai |
| CSRF/origin | Canonical production origin được ưu tiên; không dùng forwarded proto nếu proxy chưa tin cậy | Đã triển khai |
| Edge DDoS/WAF | Cloudflare proxy, origin lock, Managed Rules, Bot và rate-limit rules | Cần cấu hình trên tài khoản Cloudflare production |

Các route SEO, Website Analyzer, yêu cầu mua, Studio, Stripe webhook và Journey OCR đã được chuyển sang reader có giới hạn. Stripe vẫn xác minh chữ ký trên **raw body** nguyên bản; OCR cho phép JSON base64 tối đa 7,1 MB rồi dừng stream nếu vượt ngưỡng. Không còn `request.json()`/`request.text()` trực tiếp trong `app/api/**/route.ts` ở revision đã kiểm tra.

Cloudflare yêu cầu Siteverify ở server; token hết hạn sau 300 giây và chỉ dùng một lần. Tài liệu chính thức cũng yêu cầu cho phép `challenges.cloudflare.com` trong `script-src`/`frame-src`: [server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).

## Bật Turnstile an toàn

1. Trong Cloudflare Dashboard, tạo widget riêng cho staging và production; giới hạn đúng hostname.
2. Đặt biến môi trường trên server, không commit giá trị thật:

   ```dotenv
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=<public-site-key>
   HOSTORA_TURNSTILE_SECRET_KEY=<server-secret>
   HOSTORA_TURNSTILE_HOSTNAMES=hostora.example,www.hostora.example
   HOSTORA_PUBLIC_BASE_URL=https://hostora.example
   ```

3. Build lại web vì `NEXT_PUBLIC_TURNSTILE_SITE_KEY` được nhúng lúc build.
4. Kiểm tra ba luồng web: đăng nhập, đăng ký, quên mật khẩu. Ba lần đầu không làm phiền người dùng; sau ngưỡng route sẽ trả `CAPTCHA_REQUIRED`, widget xuất hiện và request chỉ đi tiếp sau Siteverify.
5. Kiểm tra token thiếu, token sai, token dùng lại, action sai, hostname sai và Siteverify timeout đều bị từ chối.

Nếu chỉ có site key hoặc chỉ có secret, auth trả `503 CAPTCHA_UNAVAILABLE` thay vì âm thầm bỏ CAPTCHA. Khi cả hai đều không có, Turnstile tắt và hard rate limit vẫn hoạt động.

Android hiện dùng hard rate limit và lớp WAF ở edge; CAPTCHA thích ứng chưa được nhúng native để tránh phá luồng app. Cloudflare có hướng dẫn WebView riêng và yêu cầu User-Agent/cookie nhất quán: [mobile implementation](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/). Đây là hạng mục tiếp theo nếu cuộc thi yêu cầu CAPTCHA trong app.

## Cấu hình Cloudflare production đề xuất

### 1. DNS và origin

- Bật proxy màu cam cho hostname web/API.
- Chặn truy cập trực tiếp đến IP origin; firewall chỉ nhận HTTPS từ dải IP Cloudflare hiện hành.
- Chỉ sau khi origin lock hoàn tất mới đặt `HOSTORA_TRUST_CLOUDFLARE_PROXY=true`. Nếu bật sớm, client có thể giả `CF-Connecting-IP` khi gọi thẳng origin.
- Không dùng Quick Tunnel làm production; tunnel tạm không thay thế DNS ổn định, WAF policy và origin lock.

### 2. Managed protections

- Giữ DDoS managed rules ở sensitivity/action mặc định theo khuyến nghị Cloudflare.
- Bật Cloudflare Managed Ruleset; bật OWASP Core Ruleset sau giai đoạn log/quan sát false positive.
- Gói Free: cân nhắc Bot Fight Mode. Gói Pro/Business: dùng Super Bot Fight Mode để có rule loại trừ chính xác hơn.
- Không Managed Challenge webhook Stripe/VNPay; webhook phải đi tới origin rồi được xác thực chữ ký/hash trong app.

### 3. Rate limiting rules khởi điểm

Các ngưỡng dưới đây là baseline để chạy ở chế độ log/Managed Challenge trước, sau đó chỉnh bằng traffic thật. Cloudflare khuyến nghị nhiều tầng: challenge sớm cho người thật, rồi giới hạn dài hơn để chặn bot: [rate limiting best practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/).

| Expression/phạm vi | Ngưỡng khởi điểm | Action |
|---|---:|---|
| `POST /api/account/login` | 4 request/phút/IP | Managed Challenge |
| Cùng route | 10 request/10 phút/IP | Block 10 phút |
| `POST /api/account/register` hoặc `/forgot-password` | 3 request/10 phút/IP | Managed Challenge |
| `/api/admin/payments/login*` | 3 request/5 phút/IP | Managed Challenge |
| `/api/ai/*` | 12 request/phút/IP | Managed Challenge hoặc Block cho bot |
| `/api/ai/journey-ocr`, `/api/ai/site-studio*` | 5 request/phút/IP | Managed Challenge |
| `/api/payments/stripe/webhook`, `/api/payments/vnpay/ipn` | Không challenge tương tác | Giữ signature/hash validation, quota riêng nếu cần |

Cache chỉ áp dụng asset tĩnh và trang công khai phù hợp. Không cache `/api/account/*`, `/api/admin/*`, session, đơn hàng hoặc response có PII.

## GitHub đã tham khảo

Không có repo nào được kéo nguyên vào dự án và không thêm dependency mới chỉ để “có bảo mật”. Các nguồn được chọn theo độ phù hợp và license:

| Repo | License | Quyết định |
|---|---|---|
| [cloudflare/turnstile-demo-workers](https://github.com/cloudflare/turnstile-demo-workers) | Không thấy LICENSE ở root tại thời điểm review | Chỉ đọc mô hình client → Siteverify; không sao chép code |
| [express-rate-limit/express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | MIT | Tham khảo `429`, standard headers và shared store; không cài vì đây là Next Route Handler, không phải Express app |
| [animir/node-rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) | ISC | Ứng viên khi chuyển sang Redis/Valkey nhiều instance; chưa cần cho bản local-first một node |
| [helmetjs/helmet](https://github.com/helmetjs/helmet) | MIT | Tham khảo baseline header; dùng `next.config.ts` native thay vì thêm Express middleware |
| [OWASP/CheatSheetSeries](https://github.com/OWASP/CheatSheetSeries) | CC BY-SA 4.0 | Chuẩn tham khảo review; không vendoring nội dung |

## Findings còn lại

### SEC-005 — High — Edge protection chưa được xác minh runtime

- **Location/evidence:** `lib/security/client-ip.ts:12`; source chỉ tin `CF-Connecting-IP` sau opt-in, nhưng repo không thể chứng minh firewall/DNS production.
- **Impact:** nếu origin vẫn public, kẻ tấn công có thể bỏ qua Cloudflare/WAF và spoof proxy headers.
- **Fix:** proxy DNS, khóa firewall chỉ nhận HTTPS từ dải Cloudflare hiện hành, rồi gọi trực tiếp IP origin để xác nhận thất bại trước khi bật trust proxy.
- **Mitigation/false-positive:** có thể hạ mức nếu hạ tầng bên ngoài repo đã khóa origin; cần ảnh cấu hình và kiểm tra runtime, không suy đoán.

### SEC-006 — Medium — CSP production vẫn có `unsafe-inline`

- **Location/evidence:** `next.config.ts:4-18`; `script-src` và `style-src` còn `unsafe-inline`.
- **Impact:** CSP vẫn chặn nhiều nguồn lạ nhưng giảm khả năng hạn chế inline XSS.
- **Fix:** thử nonce CSP theo hướng dẫn Next.js ở staging; đo ảnh hưởng static rendering, CDN cache và PPR trước khi đổi.
- **Mitigation/false-positive:** React escaping, không có raw HTML không kiểm soát và các directive `object/base/form/frame` hiện giảm rủi ro; đây vẫn chưa phải strict CSP.

### SEC-007 — Medium — Quota SQLite chỉ nhất quán trên một origin/node

- **Location/evidence:** `lib/customer/store.ts:89-93,112-166`; counter nằm trong SQLite local.
- **Impact:** nhiều container có counter riêng có thể cho phép tổng số lượt cao hơn ngưỡng dự kiến.
- **Fix:** khi scale, chuyển quota sang Redis/Valkey hoặc Cloudflare rate limiting.
- **Mitigation/false-positive:** SQLite phù hợp deployment local-first một node; không gọi cơ chế này là distributed protection.

### SEC-008 — Medium — Chưa load/stress test

- **Location/evidence:** khoảng trống kiểm thử; chưa có artifact tải đồng thời/slow client/Ollama queue trong repo.
- **Impact:** chưa biết ngưỡng suy giảm và khả năng phục hồi khi có traffic burst.
- **Fix:** test staging bằng dữ liệu giả, ghi throughput/error/p95 và ngưỡng dừng an toàn.
- **Mitigation/false-positive:** body stream limit và AI concurrency limit giảm blast radius nhưng không thay benchmark.

### SEC-009 — Low — Turnstile native chưa bật

- **Location/evidence:** `lib/security/abuse-protection.ts`; nhánh mobile giữ hai hard bucket client + danh tính nhưng bỏ qua widget tương tác.
- **Impact:** mobile không có challenge phục hồi cho người thật sau nhiều lần sai; header mobile không được xem là trust boundary.
- **Fix:** nếu cần CAPTCHA native, dùng WebView Turnstile theo hướng dẫn Cloudflare và test Redmi thật, User-Agent/cookie/offline/accessibility.
- **Mitigation/false-positive:** cả app và web vẫn chịu hard limit; Cloudflare edge phải áp dụng cho mọi client, không miễn route mobile.

## Ca kiểm thử bảo mật tối thiểu

1. Body JSON vượt 16 KiB → `413`, không chạy Zod/domain logic.
2. Forwarded IP giả khi trust proxy tắt → bị bỏ qua.
3. `CF-Connecting-IP` hợp lệ khi trust Cloudflare bật → dùng làm quota key/remoteip.
4. Lặp dưới ngưỡng → auth hoạt động bình thường, chưa hiện CAPTCHA.
5. Vượt ngưỡng mềm → `403 CAPTCHA_REQUIRED` và widget xuất hiện.
6. Token thiếu/sai/replay → Siteverify fail, không đăng nhập.
7. Action hoặc hostname khác → fail closed.
8. Vượt hard limit → `429` và có `Retry-After`.
9. Siteverify timeout/misconfiguration → không bypass CAPTCHA.
10. Header CSP/frame/nosniff có trên HTML và route API production.
11. Webhook Stripe/VNPay vẫn vào được và chữ ký sai bị từ chối.
12. Gọi thẳng IP origin production → không kết nối được.

Các test source tự động không thay thế mục 10–12 trên deployment thật.

## Bằng chứng chạy lại ngày 29/10/2026

- `pnpm agent:verify`: 220/220 unit trên 51 file, build production, web/mobile typecheck + lint và Ollama thật đạt.
- `pnpm test:e2e:isolated`: 47 đạt, 1 mobile skip có chủ đích, 0 lỗi.
- `pnpm audit:ui`: 12/12 trạng thái desktop/mobile, 0 axe finding, 0 page error.
- Runtime production local: CSP/header đầy đủ; asset `/vendor` giữ CORP cross-origin theo chủ đích; JSON 20 KiB trả `413`.
- `pnpm audit --prod`: không có advisory đã biết tại thời điểm chạy.

Test mới bao phủ body stream không có `Content-Length`, Stripe payload quá lớn, OCR quá lớn, Turnstile thiếu một key, Siteverify timeout, token replay `timeout-or-duplicate`, action/hostname sai, hard limit có `Retry-After` và bot đổi email liên tục trên cùng client.
