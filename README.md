# HOSTORA AI

HOSTORA AI là ứng dụng React Native tư vấn hosting/domain cho chủ shop Việt Nam, xây theo hướng **local AI first**. App Android được cài trực tiếp bằng APK, không cần Expo Go; Qwen và RAG chạy bằng Ollama trên máy HOSTORA.

Website Studio dùng LangGraph điều phối Ollama local để soạn nội dung và bộ gợi ý hosting tất định. Langfuse là tùy chọn, tắt cho tới khi cấu hình đủ ba biến `LANGFUSE_*`; nếu bật, chỉ gửi metadata tính năng/chế độ/độ trễ và mã phiên ngẫu nhiên, không gửi prompt, nội dung demo, thông tin liên hệ hay mã đơn. Xem [rubric đánh giá AI và phễu chuyển đổi](docs/AI_EVALUATION.md) để biết bốn chỉ số và giới hạn đo lường hiện tại.

## Tải app Android

- Bản 2.0.4 arm64 đã build và cài trên Redmi: `mobile/releases/HOSTORA-AI-2.0.4-arm64.apk`. Bản universal hiện vẫn là 2.0.3. Chạy web trên máy HOSTORA rồi mở `/downloads/android` hoặc `/downloads/android-universal` để tải APK cục bộ.
- [Bản công khai 1.5.0 trên GitHub](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/tag/v1.5.0) vẫn là bản đã phát hành trước đó.
- Checksum của các APK cục bộ: `mobile/releases/SHA256SUMS.txt`.

Bản 2.0.4 thêm khung xem nhanh website có thể bấm Trang đầu/Giới thiệu/Liên hệ trong app. Bản 2.0.3 gom thao tác chọn màu vào một ô mở bảng màu đầy đủ, đồng thời bổ sung chuyển động quỹ đạo. Bản 2.0.2 cho phép nhập lượng khách/ngân sách tùy ý; merchant vẫn để sandbox. Xem [hướng dẫn mobile](mobile/README.md), [audit giao diện](docs/MOBILE_UI_AUDIT.md), [thiết lập thanh toán](docs/PAYMENTS_SETUP.md) và [hồ sơ đối chiếu tiêu chí](docs/JUDGING_READINESS.md).

## Các khả năng thông minh dành cho khách hàng

- Hỏi khách muốn phục vụ ai và website cần làm gì, tạo bản demo tải được rồi mới gợi ý hosting phù hợp.
- Hiểu phần mô tả nhu cầu bằng lời và tự điền biểu mẫu để khách sửa lại trước khi gửi.
- Gợi ý một gói phù hợp nhất và hai lựa chọn thay thế; giá và thứ tự gói vẫn do công thức kiểm soát, trợ lý chỉ giải thích.
- Trả lời câu hỏi về hosting, tên miền, chi phí và rủi ro bằng tài liệu có nguồn.
- Gợi ý tên miền nhưng luôn nói rõ tình trạng còn trống cần được kiểm tra trước khi mua.
- Chấm mức sẵn sàng trước ngày mở website và đưa ra việc cần làm tiếp theo.
- Kiểm tra khả năng xuất hiện trên Google, sắp xếp việc cần cải thiện và tạo nội dung nháp để người dùng duyệt.

Website và app cùng hiển thị danh mục dịch vụ HOSTORA. Khách gửi yêu cầu mua trong nền tảng; HOSTORA xác nhận giá cuối và điều kiện trước khi phát hành hóa đơn. Khách xem hóa đơn và bắt đầu thanh toán tại web/app HOSTORA. Khi chạy `pnpm dev:lan`, điện thoại cùng Wi-Fi có thể mở `http://<IP-máy-HOSTORA>:3000/downloads/android` (bản universal: `/downloads/android-universal`).

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
- Lead form và trung tâm quản trị dùng `localStorage`, có xác nhận trước khi xóa.
- Hóa đơn dịch vụ HOSTORA/đối tác, thanh toán Stripe/VNPay sandbox, hủy và yêu cầu hoàn tiền qua sổ SQLite riêng; cổng tắt khi thiếu tài khoản merchant HOSTORA.

## Trung tâm quản trị

Mở <http://127.0.0.1:3000/admin> sau khi chạy web. Trang này cho phép người vận hành:

- Xem tổng số đăng ký, tiến độ xử lý, gói được quan tâm và tình trạng các chức năng chính.
- Tìm kiếm, lọc, đổi trạng thái hoặc xóa từng đăng ký; xuất CSV và sao lưu JSON.
- Phân nhóm nhu cầu bằng trợ lý chạy trên máy mà không gửi tên hay số điện thoại vào mô hình.
- Theo dõi độ phủ bảng giá, ngày đối chiếu dữ liệu và các gói còn thiếu giá gia hạn.

Đây là bảng quản trị đăng ký cục bộ: dữ liệu đăng ký chỉ nằm trong trình duyệt đang mở. Trang `/admin` được chặn lập chỉ mục nhưng **chưa phải hệ thống đăng nhập/phân quyền**; đăng ký trong APK không tự đồng bộ lên web. Muốn dùng cho nhiều nhân viên hoặc đưa lên Internet cần bổ sung đăng nhập và kho dữ liệu chung có phân quyền.

Quản lý yêu cầu mua, hóa đơn và hoàn tiền nằm tại `/admin/orders`, có phiên quản trị bảo vệ API. Admin xác nhận báo giá, kỳ hạn/thuế/điều kiện rồi tạo hóa đơn; khách xem đơn tại `/orders` hoặc trong app bằng mã đơn và mã truy cập riêng. Xem [thiết lập thanh toán sandbox](docs/PAYMENTS_SETUP.md); chưa có merchant HOSTORA nên các cổng hiện tắt và chưa thể thử giao dịch thật. Stripe Checkout/VNPay có thể mở giao diện xử lý của gateway sau khi khách bắt đầu trả tiền từ hóa đơn HOSTORA.

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
- [Rubric đánh giá AI và phễu](docs/AI_EVALUATION.md)
- [Báo cáo kiểm tra bảo mật](docs/SECURITY_REVIEW.md)
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
