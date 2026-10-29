# Báo cáo kiểm tra bảo mật HOSTORA

## Hardening ứng dụng và Cloudflare — 2026-10-29

- Báo cáo hiện hành: [SECURITY_HARDENING_2026-10-29.md](SECURITY_HARDENING_2026-10-29.md).
- Đã triển khai security headers/CSP, giới hạn body theo stream, quota SQLite cho auth nhạy cảm, `429` + `Retry-After`, canonical origin, proxy trust opt-in và Turnstile thích ứng được xác minh phía server.
- `pnpm audit --prod` không báo advisory đã biết tại thời điểm chạy; 220/220 unit, 47/47 E2E thực thi đạt (1 ca mobile skip có chủ đích), audit giao diện 12/12 trạng thái không có axe finding/page error.
- Runtime local production đã trả CSP, `nosniff`, `DENY`, Referrer/Permissions/CORP; body 20 KiB tới `/api/recommend` trả `413`.
- Đây chưa phải bằng chứng Cloudflare production hoặc chống DDoS tuyệt đối. Vẫn cần proxy/WAF/rate-limit ở edge, khóa origin và kiểm tra từ mạng ngoài.

## Strix source scan — 2026-10-26

- Công cụ: Strix 1.7.0, checkout `usestrix/strix` tại commit `200a501`.
- Phạm vi: bản sao cô lập của `app/`, `lib/`, `components/`, `data/`, `tests/`, `scripts/` và `mobile/src/`. Không đưa `.env.local`, khóa, APK, model hoặc thư mục training vào bản sao.
- Chế độ: `quick`; local Ollama `hostora-strix-64ki` (tag riêng, context 65.536); giới hạn 5 lượt/agent. Không chỉ định URL ngoài và yêu cầu không thay đổi mã.
- Kết quả công cụ: Semgrep 219 rules, ast-grep, Gitleaks và Trivy filesystem báo 0 finding trong 157 tệp. SARIF không có finding.
- Giới hạn của chính báo cáo: `coverage.json` ghi `surfaces_reviewed: 0`, `findings_filed: 0`, `gaps: 1` (agent không ghi nhận vùng đã khảo sát). Vì thế kết quả này chỉ là một lượt quét tĩnh nhanh có giới hạn; không chứng minh ứng dụng không có lỗ hổng. Chưa có pentest động, kiểm thử xác thực/ủy quyền trên staging, hay review độc lập.
- Artifact đầy đủ được giữ ngoài repo tại `/tmp/hostora-strix/strix_runs/hostora-source-only_9de6/`.

## Artemis Android run — 2026-10-26

- Cài Artemis từ `google/artemis` commit `351ca84` trong `/home/admin123/.local/share/hostora-tools/artemis`; Python dependencies nằm trong virtualenv riêng của repo đó.
- `artemis doctor` xác nhận ADB và Redmi Note 8 Pro (`ylbilfx8ors475kf`) được nhận diện. Cấu hình thử dùng Ollama local; không ghi API key thật.
- Một lần chạy kiểm tra chỉ đọc được khởi động app `com.hostora.ai` 2.0.0 và kết nối UIAutomator2, sau đó thất bại khi khởi tạo `ChatGoogleGenerativeAI` do thiếu Gemini API key. Không bật cài helper, không đổi cấu hình MCP toàn cục. Artemis daemon được dừng sau lượt thử.
- Vì vậy Artemis **đã cài nhưng chưa hoàn tất kiểm thử tự động** với app. Ảnh ADB độc lập của Redmi: `output/hostora-redmi-current.png`.

## Dependency audit — 2026-10-26

- Web production dependencies: `pnpm audit --prod` không báo lỗ hổng đã biết.
- Mobile: nâng `markdown-it` lên `14.3.3`, `linkify-it` lên `5.0.2` bằng `mobile/pnpm-workspace.yaml`; nâng Zod transitive lên `4.6.7`. `pnpm --dir mobile audit --prod` còn một cảnh báo high cho `node-forge@1.4.0` trong chuỗi phụ thuộc build/signing của Expo CLI. Advisory hiện không liệt kê phiên bản đã vá; chưa ép phiên bản không được upstream hỗ trợ.
- Các kết quả audit phụ thuộc thời điểm registry/advisory được truy vấn.
