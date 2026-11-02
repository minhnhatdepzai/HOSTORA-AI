# HOSTORA AI

HOSTORA AI giúp chủ shop và doanh nghiệp Việt Nam đi từ một nhu cầu còn mơ hồ đến phương án website, hosting và đơn hàng có thể theo dõi. Người dùng mô tả bằng tiếng Việt, kiểm tra dữ kiện AI đã hiểu, so sánh gói, tạo website mẫu và gửi yêu cầu mua trên web hoặc Android. Mọi hội thoại AI được lưu sau khi ẩn email/số điện thoại; câu ngoài phạm vi hoặc chưa đủ dữ liệu được chuyển tới hộp thư admin để người thật trả lời ngay trong cuộc trò chuyện.

AI chạy local qua Ollama. AI chỉ trích xuất, giải thích và soạn nội dung; giá, thứ tự gói, voucher và trạng thái giao dịch do mã TypeScript/SQLite tất định kiểm soát. HOSTORA không dùng cloud AI fallback và không đưa PII vào model.

## Truy cập nhanh

| Nội dung               | Liên kết                                                                                                                       | Trạng thái                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Web khách hàng         | [Mở HOSTORA](https://obtaining-dennis-excited-replacement.trycloudflare.com/)                                                   | HTTPS demo đang chạy, kiểm tra 02/11/2026                          |
| Web quản trị           | [Mở trang admin](https://obtaining-dennis-excited-replacement.trycloudflare.com/admin)                                          | Chuyển tới cổng đăng nhập admin                                    |
| Hộp thư AI của admin   | [Mở hộp thư hỗ trợ](https://obtaining-dennis-excited-replacement.trycloudflare.com/admin/support)                               | Cần phiên quản trị hợp lệ                                          |
| APK Android mới nhất   | [Tải HOSTORA AI 2.2.0 universal](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download/HOSTORA-AI-2.2.0-universal.apk) | 4 ABI, package `com.hostora.ai`                                |
| SHA-256 APK            | [Tải checksum](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download/HOSTORA-AI-2.2.0-universal.apk.sha256)    | `c1695598f8c57f6d4772ccc3512d4eeb03d243d5284f8b1b6dd56b99838fe0d3` |
| Minh chứng 9 ca        | [Mở báo cáo](docs/submission/MINH_CHUNG_9_CA.html)                                                                              | 6 ca Bảng A + 3 ca hộp thư AI                                     |
| Source ZIP mới nhất    | [Tải Source ZIP](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/latest/download/HOSTORA-source-2.2.0-r3-2026-11-02.zip) | README, tài liệu và cấu hình mẫu                                   |
| Source                 | [GitHub repository](https://github.com/minhnhatdepzai/HOSTORA-AI)                                                              | Nhánh `main`                                                       |

> URL `trycloudflare.com` là Quick Tunnel phục vụ vòng loại, mở được từ Internet khi máy demo và tunnel đang chạy nhưng có thể đổi sau khi tunnel khởi động lại. Link APK trên GitHub Release là link tải ổn định. Một URL web cố định cần named tunnel và tên miền Cloudflare riêng.

## Trạng thái bản 2.2.0

| Phần đã kiểm tra    | Kết quả gần nhất                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Web + admin         | Typecheck, lint và production build đạt                                                                   |
| Logic/API           | 273/273 test đạt trên 55 file                                                                             |
| AI local            | Ollama chat, Studio, embedding và smoke test chạy thật qua loopback; không dùng cloud fallback            |
| E2E + UI audit      | 51 lượt đạt, 1 mobile CRUD bỏ qua có chủ đích; 12 màn audit không có lỗi axe/page/overflow tự động      |
| Android             | `com.hostora.ai` 2.2.0, versionCode 23; APK universal cài đè bằng `adb install -r` và giữ hội thoại trên emulator |
| Bộ giám khảo mobile | 20/20 kiểm tra showcase và TC01–TC09 đều đạt                                                              |
| APK                 | 164.660.004 byte; đủ `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`; SHA-256 như bảng trên                 |

Intro cinematic chỉ phát ở lần mở đầu tiên; người dùng có thể bỏ qua và app ghi nhớ lựa chọn. App có chuyển cảnh theo tiến độ, phản hồi chạm/haptic, tôn trọng reduced motion, luồng tư vấn bốn bước, ba gói đề xuất, danh mục dịch vụ và chế độ trình diễn cho giám khảo.

## HOSTORA bán gì và mua như thế nào?

Danh mục gồm hosting dùng chung, WordPress, cloud, VPS, tên miền, SSL, email doanh nghiệp, công cụ tạo website và các dịch vụ vận hành website. Luồng chính:

1. Khách kể nhu cầu bằng tiếng Việt hoặc điền form bốn bước.
2. Code tính chi phí và xếp hạng; AI giải thích lý do bằng lời dễ hiểu.
3. Khách so sánh một gói chính và tối đa hai phương án thay thế.
4. Khách gửi yêu cầu mua; HOSTORA xác nhận nhà cung cấp, kỳ hạn và giá cuối.
5. Admin phát hành hóa đơn; thanh toán thật chỉ hoàn tất sau webhook/IPN hợp lệ.

Giá “từ” không tự trở thành số tiền phải thu. Dữ liệu chưa có được hiển thị “Chưa xác minh”, không để AI tự điền. Chế độ thanh toán mặc định là demo và không thu tiền thật.

## Ba bề mặt, một backend

| Bề mặt                    | Vai trò                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| Website Next.js           | Catalog, tư vấn AI, Website Studio, tài khoản, yêu cầu mua và tra cứu đơn    |
| Android Expo/React Native | Tư vấn, sản phẩm, kết quả gợi ý, Studio, cài đặt backend và chế độ giám khảo |
| Web admin                 | Catalog, hộp thư AI, phản hồi khách, yêu cầu mua, hóa đơn và doanh thu       |

Kiến trúc giữ ranh giới rõ ràng:

- `app/api/ai/*`: gọi Ollama local, kiểm tra input/output bằng schema;
- `app/api/admin/ai-conversations`: hộp thư quản trị, phân quyền và phản hồi người thật;
- `lib/recommendation.ts`, `lib/pricing.ts`, `lib/scenario.ts`: quyết định số học tất định;
- `data/hosting-catalog.ts`: dữ liệu hosting có nguồn và ngày xác minh;
- `data/knowledge.json`, `data/rag-index.json`: RAG local;
- `lib/payments/*`: SQLite, email, Stripe/VNPay và đối soát;
- `mobile/`: app Android dùng chung API HOSTORA.

Xem [sơ đồ hệ thống](docs/architecture/hostora-system.html), [luồng sản phẩm](docs/architecture/hostora-product-flow.html), [luồng RAG](docs/architecture/hostora-rag-flow.html) và [luồng Website Studio](docs/architecture/hostora-site-studio-flow.html).

## Chạy local

### Yêu cầu

- Node.js 22 trở lên;
- pnpm 12.15.0;
- Ollama chạy trên chính máy HOSTORA;
- khoảng trống phù hợp để tải model local.

### Cài và chạy development

```bash
git clone https://github.com/minhnhatdepzai/HOSTORA-AI.git
cd HOSTORA-AI
cp .env.example .env.local
corepack enable
pnpm install --frozen-lockfile
ollama pull qwen3.5:9b-q8_0
ollama pull qwen3-embedding:4b
ollama pull qwen3-vl:8b
pnpm rag:index
pnpm ai:check
pnpm dev
```

Mở <http://127.0.0.1:3000>. Các đường dẫn chính:

- `/` — website khách hàng;
- `/consultation` — tư vấn chọn gói;
- `/website-studio` — tạo website mẫu;
- `/admin` — web quản trị;
- `/api/health` — health check;
- `/downloads/android` — tải hoặc chuyển tới APK mới nhất.

### Chạy production

```bash
pnpm build
pnpm start
```

Server standalone dùng `PORT=3000` và `HOSTNAME=0.0.0.0` mặc định. Khi public ra Internet, đặt `HOSTORA_PUBLIC_BASE_URL` bằng origin HTTPS thật, dùng reverse proxy/WAF và cấu hình secret chỉ qua biến môi trường.

### Chạy bằng Docker

```bash
./scripts/docker-up.sh
```

Máy có NVIDIA Container Toolkit có thể dùng:

```bash
./scripts/docker-up.sh --gpu
```

Xem [hướng dẫn Docker](docs/DOCKER_DEPLOYMENT.md).

## Android

### Cài APK phát hành

Tải APK ở bảng “Truy cập nhanh”, sau đó mở trên điện thoại Android arm64 hoặc cài bằng ADB:

```bash
adb install -r HOSTORA-AI-2.2.0-universal.apk
```

`-r` cài đè và giữ dữ liệu app. APK 2.2.0 hiện dùng chữ ký debug cục bộ để chấm vòng loại, chưa phải bản ký production cho Google Play.

### Chạy app với backend qua USB

```bash
pnpm dev
adb reverse tcp:3000 tcp:3000
```

Trong app mở **Cài đặt → Kết nối local AI → USB localhost → Lưu và kiểm tra kết nối**.

### Chạy qua Wi-Fi/LAN

```bash
pnpm dev:lan
```

Trong app nhập `http://<IP-máy-HOSTORA>:3000`. Điện thoại và máy chủ phải cùng mạng; chỉ mở cổng 3000 trên mạng tin cậy.

### Build và cài lại APK

```bash
pnpm --dir mobile install --frozen-lockfile
pnpm --dir mobile typecheck
pnpm --dir mobile lint
pnpm android:update
```

`pnpm android:update` build arm64, kiểm tra package/version rồi cài bằng `adb install -r` mà không xóa dữ liệu app. Xem thêm [README mobile](mobile/README.md).

## Cấu hình

Sao chép `.env.example` thành `.env.local`. Nhóm biến chính:

- `OLLAMA_*`: model chat, Studio, embedding, context và timeout;
- `HOSTORA_PAYMENTS_*`: SQLite và chế độ `demo`/`sandbox`;
- `HOSTORA_STRIPE_*`, `HOSTORA_VNPAY_*`: cổng thanh toán tùy chọn;
- `HOSTORA_SMTP_*`, `HOSTORA_EMAIL_*`: email khách và quản trị;
- `HOSTORA_ADMIN_*`: phiên quản trị và mật khẩu dự phòng;
- `HOSTORA_PUBLIC_BASE_URL`: origin HTTPS công khai;
- `HOSTORA_STUDIO_GITHUB_*`: repo riêng cho website khách;
- `LANGFUSE_*`: quan sát metadata AI đã ẩn danh, mặc định tắt.

Không commit `.env.local`, API key, token, cookie, SQLite runtime, dữ liệu khách hoặc trace chứa PII.

## Kiểm thử và minh chứng

Chạy toàn bộ gate trước khi bàn giao:

```bash
pnpm agent:doctor
pnpm agent:verify
pnpm test:e2e:isolated
pnpm audit:ui
pnpm test:mobile:mcp
pnpm test:mobile:judge
pnpm report:mobile:judge
```

Các tài liệu dành cho vòng loại:

- [Báo cáo 9 ca mobile](docs/submission/HOSTORA_MOBILE_9_CASES.html);
- [Minh chứng 9 ca cho giám khảo](docs/submission/MINH_CHUNG_9_CA.html);
- [Ma trận kiểm thử Bảng A](docs/submission/TEST_MATRIX.md);
- [Minh chứng 6 ca dạng HTML](docs/submission/MINH_CHUNG_6_CA.html) và [PDF](docs/submission/MINH_CHUNG_6_CA.pdf);
- [Kịch bản video và demo vòng loại](docs/submission/KICH_BAN_VONG_LOAI_2026-11-01.md);
- [Nguồn dữ liệu và ngày xác minh](docs/DATA_SOURCES.md);
- [Kiến trúc AI](docs/AI_ARCHITECTURE.md);
- [Báo cáo bảo mật](docs/SECURITY_REVIEW.md).

HTTP 200, browser mobile viewport hoặc APK build thành công không thay thế kiểm thử luồng thật. Bằng chứng Android phải đến từ APK cài trên thiết bị; ca sự cố mô phỏng phải được ghi rõ là mô phỏng.

## Giới hạn hiện tại

- Web public đang dùng Quick Tunnel, không có cam kết uptime và URL sẽ đổi nếu tunnel khởi động lại.
- Chưa có giao dịch/hoàn tiền production đã kiểm chứng bằng tài khoản merchant HOSTORA; chế độ demo không thu tiền.
- SMTP cần domain có SPF, DKIM và DMARC trước khi đánh giá khả năng vào Inbox.
- Email chuyển hội thoại đã được kiểm thử bằng SMTP mock; chưa có bằng chứng độc lập email thật đã vào hộp thư quản trị.
- APK chưa ký bằng production keystore và chưa phát hành qua Google Play.
- Giá, ưu đãi và tình trạng tên miền thay đổi theo thời gian; phải kiểm tra lại nguồn trước khi bán.
- Kết quả test local và tự chấm không bảo đảm thứ hạng cuộc thi hoặc tải production.

## Cloudflare Quick Tunnel

Khi cần tạo URL HTTPS mới từ web local:

```bash
pnpm tunnel:cloudflare
```

Giữ tiến trình chạy trong suốt buổi demo. Dừng bằng:

```bash
pnpm tunnel:cloudflare:stop
```

Muốn URL cố định, cần tạo named tunnel trong tài khoản Cloudflare, trỏ DNS của tên miền riêng và cập nhật `HOSTORA_PUBLIC_BASE_URL` cùng callback thanh toán. Không đưa token Cloudflare vào Git.
