# HOSTORA — kiểm định trước bàn giao

Ngày: 29/10/2026. Phạm vi: web, web quản trị, AI local, thanh toán kiểm thử
và kiểm tra khả năng chạy Android. Đây là bằng chứng local hiện tại, không phải
cam kết không bao giờ xảy ra lỗi trong mọi môi trường.

## Kết quả đã xác minh

| Hạng mục | Kết quả |
|---|---|
| TypeScript, ESLint, Expo lint | Pass |
| Unit/integration | **243/243** |
| Production build Webpack | Pass; có cảnh báo đóng gói OpenTelemetry `require-in-the-middle` |
| `pnpm ai:check` | Pass với Ollama loopback: analyzer `qwen3.5:9b-q8_0`, chatbot/studio `hostora-chatbot:4b-q8-20261023-v2` |
| Playwright production cách ly | **47 pass, 1 skip có chủ đích** trên desktop/mobile |
| UI/axe audit | **12/12 trạng thái**, 0 accessibility findings, 0 page errors |
| Thanh toán demo | Pass trên desktop/mobile; không thu tiền thật |
| Thanh toán gateway sandbox | Callback Stripe/VNPay ký đúng, số tiền đúng, replay được chống trong unit test |
| Android qua ADB Wi-Fi | Redmi Note 8 Pro `192.168.100.26:34763`, `com.hostora.ai` 2.1.0/versionCode 22; Mobile MCP consultation pass, logcat không có FATAL/AndroidRuntime |
| AI load test local | concurrency 1/2/4: 0 lỗi, 0 timeout; throughput bão hòa khoảng 0,348 req/s |

Bằng chứng:

- E2E: `output/playwright/agent-2026-10-29T15-47-09-363Z/`
- UI audit: `output/playwright/agent-2026-10-29T15-48-25-240Z/`
- AI load: `output/ai-load/2026-10-29-handoff/`
- AI hard-case: `output/ai-hard-eval-2026-10-29-fixed2/summary.json`
- Advisor 50/50: `output/advisor-quality/2026-10-29-hard-2x-fixed/summary.json`
- Account memory/source 9/9: `output/account-ai-quality/2026-10-29-hard-repeat-fixed2/summary.json`

## Logic đã kiểm tra và chỉnh

- Giá, xếp hạng và điều kiện đủ ngân sách vẫn do logic tất định; model không ghi
  đè kết quả.
- Prompt injection không được biến thành ngân sách, claim SEO, giá hoặc dữ kiện
  thương mại.
- Website chỉ xem menu/gửi yêu cầu không bị nhầm thành ecommerce có checkout.
- Sửa ngân sách được xác nhận lại bằng đúng số mới; memory và nguồn riêng có
  citation và phạm vi riêng tài khoản.
- Fallback Studio lọc chỉ dẫn không tin cậy; chỉnh tiêu đề/CTA đơn giản không bị
  audit AI từ chối nhầm.
- `HOSTORA_PAYMENTS_MODE` chỉ nhận `demo` hoặc `sandbox`; mode `live`/không hợp
  lệ trả `disabled`, không mở gateway.
- Môi trường hiện tại đang dùng `HOSTORA_PAYMENTS_MODE=demo`, tức mô phỏng nội
  bộ và không thu tiền. Khi dùng gateway, code chỉ chấp nhận Stripe test key và
  hostname VNPay sandbox.

## Chưa thể xác minh

- Maestro chưa chạy được vì Redmi chặn cài driver với
  `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`; Mobile MCP đã
  chạy được native consultation qua ADB Wi-Fi. Không dùng browser mobile để
  thay thế bằng chứng APK.
- Chưa chạy giao dịch merchant Stripe/VNPay sandbox thật vì chưa có khóa thử
  nghiệm; callback và chữ ký được kiểm thử bằng fixture.
- Load test là local tuần tự/đồng thời nhẹ trên một máy, không phải SLA hoặc
  năng lực production nhiều node.
- Build còn cảnh báo phụ thuộc OpenTelemetry, không làm build thất bại.

## Điều kiện bàn giao an toàn

Chỉ bàn giao demo với mode `demo`, hoặc cấp riêng test keys rồi đặt mode
`sandbox`. Không bật mode khác. Trước khi khách dùng APK, cần kết nối lại đúng
thiết bị, chạy `pnpm android:update`, kiểm tra version/package và đi lại luồng
native bằng Mobile MCP/Maestro mà không xóa dữ liệu app.
