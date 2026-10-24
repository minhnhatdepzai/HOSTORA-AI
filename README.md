# HOSTORA AI

HOSTORA AI là ứng dụng React Native tư vấn hosting/domain cho chủ shop Việt Nam, xây theo hướng **local AI first**. App Android được cài trực tiếp bằng APK, không cần Expo Go; Qwen và RAG chạy bằng Ollama trên máy HOSTORA.

## Tải app Android

- [Tải HOSTORA AI 1.4.0 — arm64, khuyến nghị](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v1.4.0/HOSTORA-AI-1.4.0.apk)
- [Tải bản universal 1.4.0 dự phòng](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/download/v1.4.0/HOSTORA-AI-1.4.0-universal.apk)
- [Kiểm tra SHA-256](mobile/releases/SHA256SUMS.txt)

Bản 1.4.0 là APK cài trực tiếp, không cần Expo Go; bổ sung Launch Score hard-gate và SEO Mission Board có bản nháp/tiêu chí nghiệm thu. Bản 1.3.0 đã được thử lại trên Redmi Note 8 Pro: đi hết wizard, so sánh 3 gói, chọn gói thay thế, lưu/xóa lead đúng gói; phần chat từ 1.3.1 tách lịch sử cũ để giá/gói lỗi thời không quay lại ngữ cảnh AI. Lịch sử cũ vẫn ở local storage của thiết bị, không được tự đưa sang hội thoại mới. Xem [hướng dẫn mobile](mobile/README.md), [audit giao diện](docs/MOBILE_UI_AUDIT.md) và [hồ sơ đối chiếu tiêu chí](docs/JUDGING_READINESS.md).

Khi chạy `pnpm dev:lan`, trang chủ web có nút tải APK. Điện thoại cùng Wi-Fi có thể mở `http://<IP-máy-HOSTORA>:3000/downloads/android` (bản universal: `/downloads/android-universal`). Trong QA, URL LAN đã trả HTTP 200 và file tải về khớp SHA-256; IP cụ thể có thể thay đổi theo mạng.

## Điểm nổi bật

- Wizard nhu cầu có lưu trạng thái, kèm Natural Language Onboarding bằng Qwen.
- Một gói phù hợp nhất và hai lựa chọn thay thế từ scoring engine trên 13 gói có thể kiểm tra.
- Kho 26 sản phẩm thuộc 6 nhà cung cấp: hosting, WordPress, VPS, cloud, domain, email, SSL, automation và workspace.
- So sánh giá ưu đãi/gia hạn, dung lượng, băng thông, SSL, backup, CDN và kỳ hạn.
- True Cost Calculator, Flash Sale Simulator và Growth Planner tính bằng code.
- Chat streaming và Knowledge Assistant dùng hybrid local RAG 23 tài liệu, có URL nguồn/ngày xác minh.
- SEO Intelligence audit title, description, indexability, canonical, robots, sitemap, structured data, ảnh và internal link; AI local chỉ diễn giải audit cùng nguồn.
- Domain Advisor không giả tình trạng availability.
- Website Analyzer chặn SSRF và chỉ kết luận từ HTML công khai.
- Lead form và dashboard dùng `localStorage`, có xác nhận trước khi xóa.

## Stack

React Native 0.88, Expo SDK 58 native toolchain, Expo Router, TypeScript 6; backend Next.js 16, React 19, Vitest, Playwright; Ollama với `qwen3.5:9b-q8_0`, chatbot LoRA local `hostora-chatbot:4b-q8-20261023-v2` trên máy demo và `qwen3-embedding:4b`.

## Chạy bằng Docker

Yêu cầu Docker Engine và Docker Compose. Một lệnh sẽ build web, khởi động Ollama, tải model vào volume và tạo RAG index local:

```bash
git clone https://github.com/minhnhatdepzai/HOSTORA-AI.git
cd HOSTORA-AI
./scripts/docker-up.sh
```

Mở <http://127.0.0.1:3000>. Lần đầu sẽ lâu và dùng nhiều dung lượng vì phải tải model. Với NVIDIA GPU đã cài NVIDIA Container Toolkit, dùng `./scripts/docker-up.sh --gpu`. Cấu hình tùy chọn nằm trong `.env.docker.example`; xem [hướng dẫn Docker](docs/DOCKER_DEPLOYMENT.md).

## Chạy local

Yêu cầu Node 22+, pnpm và Ollama chỉ lắng nghe loopback.

```bash
cp .env.example .env.local
ollama pull qwen3.5:9b-q8_0
ollama pull qwen3-embedding:4b
pnpm install
pnpm rag:index
pnpm ai:check
pnpm rag:evaluate
pnpm dev
```

Mở <http://127.0.0.1:3000> cho web. Để app điện thoại truy cập cùng Wi-Fi, chạy `pnpm dev:lan`, sau đó cấu hình địa chỉ server trong app.

## Kiểm tra

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm ai:check` là kiểm tra inference thật; unit test không chứng minh model đang hoạt động. Giá catalog là snapshot ngày 2026-10-23 và phải được xác minh lại trước quyết định mua.

## Tài liệu

- [Nghiên cứu](docs/RESEARCH.md)
- [Kiến trúc AI](docs/AI_ARCHITECTURE.md)
- [Nguồn dữ liệu](docs/DATA_SOURCES.md)
- [Báo cáo QA](docs/QA_REPORT.md)
- [Kịch bản demo](docs/DEMO_SCRIPT.md)
- [Môi trường](docs/ENVIRONMENT_SETUP.md)
- [Docker deployment](docs/DOCKER_DEPLOYMENT.md)
- [Audit giao diện mobile](docs/MOBILE_UI_AUDIT.md)
- [Android app](mobile/README.md)
- [Đối chiếu tiêu chí A/B và hồ sơ nộp](docs/JUDGING_READINESS.md)
- [Bằng chứng fine-tuning](docs/CHATBOT_FINETUNING.md)
- [Video demo 34 giây](docs/submission/HOSTORA-demo-2026-10-24.webm), [ma trận 6 case](docs/submission/TEST_MATRIX.md), [minh chứng dùng AI](docs/submission/AI_EVIDENCE.md)

## Giới hạn trung thực

- Lượt truy cập tháng không đủ để cam kết năng lực chịu tải; cần benchmark workload thật.
- Website Analyzer chưa chụp/diễn giải screenshot bằng vision trong bản hiện tại.
- LoRA chatbot đã train và thử trên máy demo; GGUF 4,6 GB không đóng gói trong source ZIP. Khi chạy từ source ở máy khác, dùng model 9B mặc định hoặc tự nạp lại adapter theo tài liệu fine-tuning; dữ liệu giá biến động không nằm trong trọng số.
- Giá là snapshot và nhiều nhà cung cấp không công bố giá gia hạn; các trường đó giữ `null`/“Chưa xác minh”, không được model tự điền.
- Recall@5 100% và MRR@5 0,95 là kết quả trên 10 câu eval nội bộ, không chứng minh faithfulness của mọi câu trả lời hoặc hiệu quả SEO.
- Link tải APK ở máy chạy local/LAN không phải link demo công khai. Backend local-first cần cấu hình máy phục vụ và kiểm soát truy cập trước khi đưa lên Internet.
