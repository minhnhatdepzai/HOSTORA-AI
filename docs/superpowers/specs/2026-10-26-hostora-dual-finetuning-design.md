# Thiết kế fine-tuning HOSTORA: chatbot-v3 và studio-v1

Ngày: 2026-10-26  
Trạng thái: chờ duyệt trước khi lập kế hoạch triển khai và chạy optimizer

## 1. Ý định

HOSTORA cần hai model chuyên biệt chạy hoàn toàn cục bộ:

- `chatbot-v3`: tư vấn hosting, domain, SEO và bước mua tiếp theo bằng tiếng Việt tự nhiên, có nguồn, không bịa dữ liệu thương mại.
- `studio-v1`: viết nội dung và lập kế hoạch thiết kế có cấu trúc để tạo website đa dạng, có chủ đích và không mang vẻ giao diện AI đại trà.

Ngoài luồng an toàn, Studio có một chế độ thử nghiệm sinh trọn bộ HTML/CSS/JS. Mã này chỉ được xem trong sandbox và không được thay thế, xuất bản hoặc đẩy GitHub thay cho bản renderer an toàn nếu chưa qua toàn bộ kiểm tra.

## 2. Bằng chứng hiện có

- Chatbot v2 đã được train thật trên `unsloth/Qwen3.5-4B`: 114 mẫu, 87 optimizer step, BF16 LoRA, adapter và GGUF Q8 có hash và reload được.
- `.env.local` đang dùng `hostora-chatbot:4b-q8-20261023-v2` cho cả chatbot và bản nháp Studio.
- Studio hiện chỉ yêu cầu model trả nội dung `SiteBrief`; HTML, Three.js, GSAP và bố cục do renderer tất định tạo.
- Kho phản hồi Studio hiện chỉ có 1 đánh giá `needs_work/copy` trên 9 project. Số này không đủ cho DPO hoặc tự học trực tiếp từ phản hồi khách.
- Máy có RTX 5060 Ti 16 GB, khoảng 15 GB VRAM trống lúc khảo sát; môi trường Unsloth/TRL hiện có thể chạy train Qwen3.5-4B.

## 3. Mục tiêu

1. Tạo hai adapter độc lập, hai GGUF độc lập và hai tên model Ollama độc lập.
2. Tăng khả năng hỏi lại đúng lúc, giải thích dễ hiểu, viện dẫn đúng nguồn và dẫn khách tới bước tiếp theo mà không ép mua.
3. Cho Studio lập kế hoạch về bố cục, mật độ, kiểu chữ, vai trò màu nhấn, mức chuyển động và motif 3D bằng schema chặt.
4. Tạo ít nhất bốn họ bố cục có khác biệt thật, không chỉ đổi màu trên cùng một template.
5. Cho phép thử nghiệm codegen HTML/CSS/JS nhưng cô lập khỏi luồng sản phẩm an toàn.
6. Chỉ promote model sau khi có checkpoint/hash, reload test và đánh giá trên holdout tách theo case/project.

## 4. Không làm và điều tuyệt đối tránh

- Không fine-tune giá, khuyến mại, availability domain, trạng thái đơn hoặc dữ liệu catalog biến động.
- Không dùng raw chat, lead, số điện thoại, email, nội dung project khách hoặc trace production làm train data tự động.
- Không coi loss thấp, HTTP 200, schema hợp lệ hoặc ảnh đẹp ở một case là bằng chứng chất lượng tổng thể.
- Không cho model shell, filesystem hoặc network tool.
- Không để mã sinh tự do chạy cùng origin với HOSTORA, đọc cookie/localStorage, gọi mạng hoặc tự đẩy GitHub.
- Không tự động train lại sau mỗi dislike. Phản hồi chỉ vào hàng chờ biên tập; dữ liệu chỉ được train khi đã duyệt và tạo phiên bản.

## 5. Các hướng đã xem xét

### A. Hai adapter chỉ học câu chữ

Ít rủi ro và nhanh, nhưng gần như không thay đổi độ đa dạng hình ảnh vì renderer vẫn nhận cùng một schema nội dung.

### B. Hai adapter + Visual Director + codegen sandbox — lựa chọn đã chốt

`chatbot-v3` học tư vấn; `studio-v1` học hai task có nhãn rõ ràng: `design_plan` và `code_package`. Luồng sản phẩm mặc định chỉ dùng `design_plan`. Codegen là thí nghiệm bị sandbox và có cổng kiểm tra riêng.

### C. Codegen tự do làm luồng mặc định

Đa dạng nhất nhưng khó bảo đảm an toàn, responsive, accessibility và khả năng chạy của ZIP. Không dùng làm luồng mặc định.

## 6. Kiến trúc model và dữ liệu

### 6.1 Chatbot-v3

- Base: `unsloth/Qwen3.5-4B`, giữ giấy phép và provenance hiện có.
- Candidate: BF16 LoRA; rank/alpha là tham số thực nghiệm, không mặc định rằng rank cao hơn sẽ tốt hơn.
- Output: `training/output-chatbot-v3/`.
- Ollama candidate: `hostora-chatbot:4b-q8-v3`.
- Dữ liệu mục tiêu ban đầu: tối thiểu 180 train item và 40 holdout/challenge item, tách theo case trước khi tạo biến thể câu hỏi.
- Nhóm case: discovery nhu cầu, giải thích hosting/domain/SEO, grounded RAG, thiếu dữ liệu, prompt injection, PII, nguồn giả, so sánh có điều kiện, hoàn tiền/trả hàng, bước mua tiếp theo và chuyển đổi không gây áp lực.
- Dynamic facts chỉ xuất hiện trong context runtime của bài đánh giá, không nằm trong completion dùng để cập nhật trọng số.

### 6.2 Studio-v1

- Base: `unsloth/Qwen3.5-4B`.
- Output: `training/output-studio-v1/`.
- Ollama candidate: `hostora-studio:4b-q8-v1`.
- Dataset tách thành hai task bằng trường `task` bắt buộc:
  - `design_plan`: đầu vào là brief doanh nghiệp đã khử PII; đầu ra là `SiteBrief` và `VisualPlan` theo JSON Schema.
  - `code_package`: đầu vào là brief + visual plan; đầu ra là JSON chứa đúng ba file `index.html`, `styles.css`, `app.js` và manifest tài nguyên.
- Tập ban đầu: tối thiểu 120 `design_plan` train, 30 holdout; tối thiểu 30 `code_package` train, 10 holdout. Codegen nhỏ vẫn được gắn nhãn `experimental`, không được suy diễn là chất lượng production.
- Các ngành phải được phân tầng: dịch vụ địa phương, bán lẻ, F&B, portfolio/sáng tạo, B2B, giáo dục, sức khỏe không chẩn đoán và sự kiện.
- Mỗi split chứa đủ phong cách `editorial`, `bold`, `warm`, `minimal`; không để cùng thương hiệu hoặc cùng nội dung đổi từ nằm ở cả train và holdout.

## 7. VisualPlan và renderer an toàn

`VisualPlan` được Zod/JSON Schema kiểm tra, chỉ nhận enum và giới hạn số:

- `layoutFamily`: `editorial_split`, `cinematic_story`, `product_gallery`, `service_journey`.
- `density`: `airy`, `balanced`, `compact`.
- `typeMood`: `editorial_serif`, `modern_grotesk`, `technical_mono`, `warm_humanist`.
- `accentRole`: `cta_only`, `section_marker`, `product_highlight`.
- `motionLevel`: `quiet`, `expressive`, `cinematic`.
- `threeMotif`: `orbital_mark`, `ribbon_form`, `particle_field`, `architectural_grid`.
- `sectionOrder`: allowlist các section đã có.
- `heroComposition`, `imageTreatment`, `cornerLanguage` và các token giới hạn khác nếu cần sau khi prototype.

Model không trả component React, import hoặc mã cho luồng này. Renderer ánh xạ enum sang block đã kiểm thử, giữ `prefers-reduced-motion`, semantic HTML, focus-visible, touch target và responsive. Màu khách chọn vẫn là đầu vào; model chỉ quyết định vai trò của màu, không khóa palette.

## 8. Codegen sandbox

### 8.1 Cách ly

- Feature flag mặc định: `HOSTORA_STUDIO_CODEGEN_EXPERIMENTAL=false`.
- Không ghi đè project an toàn; lưu thành artifact candidate riêng.
- Preview trong iframe sandbox không có `allow-same-origin`, không có form submission và dùng CSP `default-src 'none'`.
- Chỉ cho phép asset cục bộ đã đóng gói: Three.js, GSAP, ScrollTrigger và asset do HOSTORA cấp.

### 8.2 Kiểm tra tĩnh bắt buộc

Từ chối nếu có:

- `eval`, `Function`, dynamic import, WebSocket, Worker, service worker.
- `fetch`, XMLHttpRequest, beacon, URL ngoài, iframe/object/embed.
- cookie, localStorage, sessionStorage, clipboard hoặc truy cập parent/top/opener.
- script/style/link từ CDN, data exfiltration hoặc event handler HTML inline ngoài allowlist.
- file ngoài ba tên đã định, đường dẫn tuyệt đối, traversal hoặc payload vượt giới hạn.

HTML được parse, CSS được parse và JS được parse AST; không kiểm tra bằng regex đơn thuần. Sau static gate, Playwright chạy smoke test ở desktop/mobile, thu console error, request mạng, overflow và accessibility cơ bản. Chỉ artifact đạt mới hiện nút tải thử nghiệm; vẫn không tự publish.

## 9. Đánh giá và cổng promote

### 9.1 Bốn chỉ số đã chốt

1. Đúng dữ liệu giá/nguồn.
2. An toàn, không bịa.
3. Hữu ích với nhu cầu.
4. Chuyển bước từ xem demo tới mở gói/tạo đơn.

### 9.2 Chỉ số bổ sung cho Studio

- Schema validity và unsupported-claim rate.
- Style adherence theo visual plan.
- Visual diversity giữa các layout family, không tính đổi màu là một layout mới.
- Không mang dấu hiệu UI AI đại trà: gradient tím-xanh mặc định, glass card hàng loạt, mọi section đều căn giữa, card bo tròn lặp lại.
- Không overflow ở 390×844 và 1440×900; không console error; reduced motion hoạt động.
- Codegen: zero external request, zero forbidden AST construct, ZIP mở được và điều hướng/CTA bấm được.

### 9.3 Quyết định promote

- Chạy baseline v2/9B và candidate trên cùng dataset version.
- Candidate không được giảm chỉ số nguồn/an toàn so với baseline.
- Các chỉ số chủ quan phải có rubric và lưu đánh giá theo từng item; không chỉ báo trung bình.
- Nếu chatbot đạt nhưng Studio không đạt, chỉ promote chatbot. Hai model không bị buộc release cùng nhau.
- Codegen vẫn ở trạng thái experimental dù đạt smoke test; cần vòng review người thật riêng trước khi cân nhắc mặc định.

## 10. Langfuse và local-first

- Offline evaluation chạy được hoàn toàn bằng JSONL/report cục bộ khi chưa có Langfuse project.
- Dataset có schema `input`, `expectedOutput`, `metadata` tách biệt và có version/hash.
- Khi có Langfuse, dùng SDK hiện hành và Experiments API mới; không viết tích hợp mới vào endpoint public v3 đã có lịch sunset.
- Chỉ upload dataset đã khử PII và được duyệt. Runtime vẫn mặc định không gửi prompt/nội dung website lên Langfuse; chỉ metadata ẩn danh trừ khi chủ dự án chủ động thay đổi chính sách.

## 11. Artifact và rollback

Mỗi model phải có:

- manifest nguồn dữ liệu và license/provenance;
- dataset hash và split manifest;
- training config, optimizer steps, loss log và VRAM đỉnh;
- adapter `.safetensors` + SHA-256;
- GGUF + SHA-256;
- reload test;
- raw evaluation report và promotion decision.

Model hiện hành không bị ghi đè. Chuyển model bằng `OLLAMA_CHATBOT_MODEL` và `OLLAMA_STUDIO_MODEL`; rollback chỉ cần đổi lại biến môi trường và restart service. Dataset, checkpoint và raw eval tiếp tục bị Git ignore; code, schema, manifest mẫu và tài liệu được version-control.

## 12. Thứ tự triển khai sau khi duyệt

1. Chốt schema/rubric và tạo baseline eval.
2. Mở rộng pipeline dataset có provenance và PII/dynamic-fact gate.
3. Train, export, reload và đánh giá `chatbot-v3`.
4. Thêm `VisualPlan`, bốn layout family và dataset `studio-v1`.
5. Train, export, reload và đánh giá `studio-v1` ở chế độ `design_plan`.
6. Thêm codegen sandbox/AST gate/Playwright smoke.
7. Đánh giá task `code_package`, giữ sau feature flag.
8. Promote độc lập từng model nếu qua cổng; giữ candidate nếu chưa đạt.

