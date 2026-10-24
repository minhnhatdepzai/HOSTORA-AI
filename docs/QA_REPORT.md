# Báo cáo QA

Ngày cập nhật: **2026-10-24**.

Các bảng cũ bên dưới ghi lại kiểm tra theo phiên bản tại thời điểm đó. Kết quả mới nhất nằm ở mục kế tiếp; không suy diễn kiểm tra của 1.2.0 sang 1.3.0.

## Đợt kiểm tra 24/10/2026 — bản 1.4.0

- Launch Score mới dùng điểm số tất định và hard gate: hồ sơ còn blocker không thể mang nhãn “Sẵn sàng triển khai” dù tổng điểm trên 80. Test đơn vị có case 93/100 thiếu analytics vẫn là “Gần sẵn sàng” và kiểm tra đơn điệu khi tắt từng checklist.
- Ollama local chỉ viết headline/summary từ báo cáo đã khóa; strengths, kế hoạch hành động và câu hỏi phản biện do code tạo. Kiểm tra API thật trả `aiMode=local-ai`, hybrid retrieval và giữ đúng nhãn hard gate.
- SEO Mission Board xếp nhiệm vụ P0/P1/P2 từ finding thật, tách bản nháp với bước phải xác minh và nêu điều kiện nghiệm thu. Audit thật `example.com` đạt 40/100, tạo 10 task; app không tự sửa website ngoài phạm vi kiểm soát.
- APK arm64 1.4.0 đã build, ký v2, cài đè và mở thành công trên Redmi Note 8 Pro qua ADB Wi-Fi; `com.hostora.ai`, versionCode 6, min SDK 24, target SDK 36. Trên thiết bị thật đã chạy Launch Score tới báo cáo 47/100 “Rủi ro khi launch” và SEO audit tới SEO Mission Board có task P0/bản nháp.
- APK universal 1.4.0 đã build, ký v2 và chứa `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`. SHA-256: arm64 `d63e9e7658acb5f0057d7c8812a085aad4e07ee4ec9f4519cb9a24a2d15b6b68`; universal `aeb1716c4092c823f6c58fd3d520e72f770c31fc134dbbf68d4cf3f2286d11c9`.
- Ảnh thiết bị thật: `mobile/test-results/hostora-1.4.0-home.png`, `hostora-1.4.0-launch-result.png`, `hostora-1.4.0-seo-result.png`.
- Cổng chất lượng cuối: web TypeScript/ESLint/build pass, Vitest 44/44, Playwright 20/20 trên Chromium desktop/mobile, format pass; mobile TypeScript/ESLint pass; `pnpm ai:check` pass 10 eval với chat 9B và embedding 4B.
- Docker: standalone image build thành công; smoke image gọi Ollama loopback thật và trả health/recommendation. Full Compose CPU với project tạm đã kéo model, tạo volume, index 23 tài liệu, báo Ollama/web healthy và retrieval `hybrid`; cổng Ollama chỉ bind `127.0.0.1`. Container/volume smoke đã được xóa sau kiểm tra.

## Đợt kiểm tra 24/10/2026 — bản 1.3.0 và 1.3.1

- Web: 5 chức năng đề 01 được ghép trong một luồng Playwright: FAQ, form nhu cầu, một gói chính + hai thay thế, bảng so sánh và chọn gói để lưu lead. Có thêm kiểm tra input sai, nguồn dẫn chatbot và lỗi API catalog. Kết quả chạy cuối cùng được ghi trong `docs/submission/TEST_MATRIX.md`.
- RAG live: 12/12 câu khó do nhóm tự soạn có nguồn đúng trong top 5, MRR@5 = 1,00, 12 lần hybrid/0 lexical fallback. Tập 10 câu cũ: Recall@5 = 1,00, MRR@5 = 0,95. Đây là retrieval nội bộ, không phải đo faithfulness của toàn câu trả lời.
- Lighthouse mobile trang đề xuất sau chỉnh UI: Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100; 52 pass/0 fail. Điểm Lighthouse chỉ áp dụng cho trang/trạng thái đã đo, không thay thế review toàn app.
- APK 1.3.0: build arm64 và universal thành công, chữ ký APK v2 hợp lệ. Đã cài/mở arm64 trên Redmi Note 8 Pro; `com.hostora.ai`, versionCode 4, min SDK 24, target SDK 36. Ảnh mở app ở `mobile/test-results/hostora-1.3.0-home.png`.
- QA native 1.3.0 sau build: đi hết wizard với shop bán hàng, 50.000 lượt/tháng, 600.000đ/tháng, cần domain; nhận 3 gói từ catalog 13 gói, bảng so sánh, chọn gói thứ hai Hostinger Không giới hạn, lưu lead giả vào máy, xác nhận tab Leads đúng gói, rồi xóa lead giả (còn 0 mục). Mục FAQ hiện accordion; 5 câu đã thử đầy đủ ở bản 1.2.0.
- Phát hiện khi mở chat: lịch sử từ bản cũ vẫn chứa câu trả lời có giá/gói lỗi thời và có thể đi vào context model. Đã tách khóa chat v2 ở web và native, giữ nguyên dữ liệu cũ nhưng không nạp lại. Playwright desktop/mobile xác nhận câu cũ không hiển thị và không nằm trong request mới. APK 1.3.1 arm64 đã qua `apksigner verify` v2, cài đè và mở trên Redmi (versionCode 5); lịch sử giá cũ không hiển thị. Chat mới hỏi chung “Shop mới nên chọn gói nào?” chỉ yêu cầu 4 đầu vào nghiệp vụ, không tự chọn gói. Hỏi CDN/flash sale nhận câu trả lời qua local AI với hai nguồn có link và ngày; chạm nguồn đầu tiên đã mở trình duyệt trên điện thoại, quay lại app được. Ảnh `mobile/test-results/hostora-1.3.1-chat-sources.png`.
- APK 1.3.1 universal cũng build thành công, ký v2, chứa 4 ABI (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`). Bản arm64 tải thật qua `/downloads/android` khớp SHA-256 `ed771fc21cee685e0ed2d278042e1c306664e151992e9636c3cbf5c92c8ebdb3`; HEAD universal trả HTTP 200, tên file và `content-length` 103.899.948 byte.
- Chatbot LoRA v2 đã thực sự train và tích hợp qua `/api/ai/chat`; các bài holdout/challenge chỉ xác nhận endpoint và các lỗi đã nhận biết, chưa đủ để kết luận chất lượng production.
- Video browser demo 34,4 giây ở `docs/submission/HOSTORA-demo-2026-10-24.mp4`, quay bằng profile riêng với lead giả. Video không có thuyết minh và cần nhóm xem lại trước khi nộp.
- Cổng chất lượng chạy lại: `pnpm typecheck`, `pnpm lint`, `pnpm test` = 39/39; `pnpm test:e2e` = 18/18 desktop/mobile; `pnpm build` và `pnpm format:check` = pass; `pnpm ai:check` sau guard cuối = pass (chat 9B, chatbot LoRA 4B, embedding 4B; 10 eval); holdout 12/12 HTTP 200. Cần đọc nội dung câu trả lời để chấm chất lượng, không lấy HTTP 200 làm chứng nhận.

## Đã xác minh trước UI QA

- Qwen 9.7B structured JSON tiếng Việt: pass; cold 12.6s, warm ~41.5 token/s.
- VRAM chat context 16K: khoảng 10,238 MiB.
- RAG indexing: 23 documents, Qwen embedding 4B, 2560 dimensions.
- Retrieval eval: 10 cases, Recall@5 = 1,00, MRR@5 = 0,95.
- `pnpm ai:check`: pass structured output với đúng hai model local.
- TypeScript: pass sau khi tạo index.

## QA cuối đã chạy

| Kiểm tra                             | Kết quả                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| TypeScript strict                    | Pass                                                                        |
| ESLint                               | Pass                                                                        |
| Prettier                             | Pass                                                                        |
| Vitest                               | 7 files, 15/15 tests pass                                                   |
| Next.js production build             | Pass, 23 routes gồm product, retrieval và SEO API                           |
| Playwright Chromium desktop + mobile | 6/6 tests pass                                                              |
| Wizard → top 3 recommendations       | Pass trên desktop/mobile                                                    |
| Lead localStorage + confirm delete   | Pass trên desktop/mobile                                                    |
| Mobile horizontal overflow           | Không phát hiện                                                             |
| Browser console trang chủ            | Không có error                                                              |
| Natural-language analyzer            | Pass; đúng `store`, 50.000 visits, 600.000đ, domain, e-commerce; 3,68s warm |
| Deterministic recommendation API     | Pass; 3 gói, Cloud Startup đứng đầu case demo; 0,01s                        |
| Knowledge RAG                        | Pass; 3 key points, 3 nguồn; 9,52s                                          |
| Domain Advisor                       | Pass; 5 gợi ý, `availability=not-checked`; 10,04s                           |
| Chat streaming                       | Pass; 1.835 ký tự grounded; 13,86s                                          |
| AI giải thích recommendation         | Pass; phản hồi grounded từ top 3; 5,14s                                     |
| AI phân loại lead                    | Pass; không nhận PII trong schema; 4,72s                                    |
| Website Analyzer `example.com`       | Pass; đọc title và checklist HTML                                           |
| Product catalog API                  | Pass; 26 sản phẩm, 6 nhà cung cấp, 9 category                               |
| Recommendation mở rộng               | Pass; top 3 được tính từ 13 gói, không do LLM xếp hạng                      |
| SEO Intelligence API                 | Pass; `example.com` 40/100, trả findings, ưu tiên, ý tưởng và 5 nguồn RAG   |
| RAG retrieval eval                   | Pass; Recall@5 100%, MRR@5 0,95 trên 10 câu nội bộ                          |
| SSRF `127.0.0.1`                     | Pass; HTTP 400 JSON sau khi sửa error handler                               |
| Chrome DevTools MCP                  | Pass; DOM/network/console đều đọc được trên app thật                        |
| Lighthouse desktop                   | 100 Accessibility, Best Practices, SEO và Agentic Browsing; 47/47 pass      |
| Unsloth LoRA smoke                   | Pass; Qwen3.5-4B BF16, 1 step/64,24s, max 8,81 GB VRAM, adapter đã lưu      |
| Production dependency audit          | Pass, không có known vulnerability                                          |

## React Native / Android APK 1.2.0

| Kiểm tra                         | Kết quả                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| Mobile TypeScript + ESLint       | Pass                                                                                       |
| Gradle release arm64 + universal | Pass                                                                                       |
| APK signature/metadata           | Pass `apksigner verify`; `com.hostora.ai`, 1.2.0, versionCode 3, min SDK 24, target SDK 36 |
| Cài và mở trên Redmi Note 8 Pro  | Pass `adb install -r`; cold launch 2.518 giây                                              |
| Catalog online                   | Pass; màn đề xuất hiện 13 gói đã đối chiếu nguồn                                           |
| Bảng so sánh 3 gói               | Pass; hiện 10 tiêu chí, cuộn ngang và cố định cột nhãn                                     |
| FAQ 5 câu                        | Pass; mở câu thứ hai, câu đầu đóng                                                         |
| Lead theo gói đã chọn            | Pass; chọn Hostinger Premium, lưu lead QA, xác nhận tab Leads hiện đúng gói, xóa lead QA   |
| Tổng chi phí                     | Pass; 48 tháng Hostinger Không giới hạn = 2.683.200đ; 12 tháng = Chưa đủ dữ liệu           |
| Web typecheck/lint/tests/build   | Pass; 20/20 Vitest gồm 5 case mới về giá thiếu dữ liệu                                     |
| Playwright web desktop/mobile    | Pass 8/8, gồm kiểm tra link tải APK, sau khi sửa `allowedDevOrigins` loopback              |
| Local AI check                   | Pass; Qwen chat và embedding local                                                         |
| Link tải APK từ web              | Pass HTTP 200 cho arm64 + universal; tải GET arm64 khớp SHA-256 artifact                   |

APK tải về: `mobile/releases/HOSTORA-AI-1.2.0.apk` (arm64, 37.843.942 bytes) và `HOSTORA-AI-1.2.0-universal.apk` (103.896.952 bytes). SHA-256 ở `mobile/releases/SHA256SUMS.txt`. Ảnh kiểm tra ở `mobile/test-results/hostora-1.2.0-{comparison,comparison-third,faq,lead,cost}.png`. Đã thử GET endpoint tải trên Next dev và Next production: SHA-256 file nhận đúng với artifact arm64. Bản phát hành vẫn dùng debug certificate, chưa phù hợp Google Play.

pnpm 12 trên máy này chặn bước tự xác minh lại dependency do build script `unrs-resolver` chưa được phê duyệt. Các lệnh kiểm tra đã chạy thành công với `pnpm --config.verify-deps-before-run=false <script>` trên `node_modules` hiện có; không tự phê duyệt script mới. Nếu cài lại dependency, cần kiểm tra và phê duyệt build script một cách có chủ đích trước khi bật lại xác minh mặc định.

## React Native / Android APK 1.1.0 (lịch sử)

| Kiểm tra                   | Kết quả                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Mobile TypeScript + ESLint | Pass                                                                                |
| Expo Doctor                | 20/20 checks pass                                                                   |
| Gradle `assembleRelease`   | Pass cho universal và arm64                                                         |
| APK signature              | Pass APK Signature Scheme v2                                                        |
| APK metadata               | `com.hostora.ai`, 1.1.0, versionCode 2, min SDK 24, target SDK 36                   |
| Quyền APK                  | Internet, network state và vibrate; overlay/storage đã bị loại                      |
| Cài trên Redmi Note 8 Pro  | Pass bản 1.1.0 qua `adb install -r`                                                 |
| Cold launch bản cuối       | Pass; process sống, không thấy fatal exception trong logcat đã lọc                  |
| Kho sản phẩm mobile        | Pass trên thiết bị thật; hiển thị 26 sản phẩm/6 nhà cung cấp/9 nhóm và card nguồn   |
| SEO Intelligence mobile    | Pass end-to-end trên thiết bị; audit `example.com` trả 40/100 và nhận định có nguồn |
| Recommendation mobile      | Pass; UI xác nhận “Xếp hạng từ 13 gói đã đối chiếu nguồn”                           |
| Local AI health            | Pass; hiển thị đúng chat + embedding model và trạng thái `READY`                    |
| Local RAG chat từ app      | Pass; nhận câu trả lời grounded thật                                                |
| Markdown AI                | Pass sau khi sửa renderer heading/list/bold/table                                   |

Artifact tải về: `mobile/releases/HOSTORA-AI-1.1.0.apk` (arm64, 37.829.290 bytes) và `HOSTORA-AI-1.1.0-universal.apk` (103.882.300 bytes). SHA-256 được lưu tại `mobile/releases/SHA256SUMS.txt`.

Full dependency audit còn một advisory high ở `braces@3.0.3`, đường dẫn chỉ thuộc `eslint-config-next → fast-glob → micromatch`; registry ghi chưa có patched version. Đây là tool build/dev, không nằm trong production dependency graph. Peer dependencies đã được làm sạch bằng ESLint 9.39.5.

## Giới hạn đã biết

- Screenshot vision trong Website Analyzer chưa triển khai; analyzer hiện chỉ đọc HTML công khai.
- Chatbot LoRA v2 đã train và có holdout/challenge qua endpoint; chưa có đánh giá độc lập, chấm độ đúng theo nguồn ở mức từng mệnh đề, p95 latency hay đo chất lượng trên người dùng thật. Không suy ra nó vượt model nền trong mọi tình huống.
- Langfuse project tracing chưa cấu hình vì chưa có local instance/project; không có trace giả.
- SEO score chỉ là checklist HTML/robots/sitemap tại thời điểm quét; không đo Search Console, backlink, thứ hạng hoặc Core Web Vitals field data.
- Retrieval eval là tập nội bộ nhỏ; chưa có human evaluation cho faithfulness/answer relevance trên toàn bộ câu trả lời.
