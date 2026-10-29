# Fine-tuning chatbot HOSTORA trong app

## Bộ nhớ hội thoại và đợt `chatbot-v7` ngày 29/10/2026

Chatbot không còn phụ thuộc vào 12 tin nhắn cuối. Web và mobile giữ các lượt
trao đổi cục bộ, đồng thời trích xuất một bộ nhớ nhỏ chỉ gồm nhu cầu đã nói:
loại trang, có bán hàng hay không, lượt truy cập, ngân sách, giới hạn trả trước
và tên miền. Mỗi lần gọi `/api/ai/chat`, server dựng lại bản tóm tắt từ các dữ
kiện này, gửi bản tóm tắt cùng 14 lượt gần nhất và bỏ email, số điện thoại, mã
đơn. Khi khách đổi ý, lượt mới nhất ghi đè dữ kiện cũ; giá, voucher, trạng thái
thanh toán và tình trạng tên miền không nằm trong bộ nhớ mà luôn đọc lại từ dữ
liệu hiện tại.

Các phần chính là `lib/chat-memory.ts`, `components/ai-assistant.tsx` và
`mobile/src/lib/chat-memory.ts`. Bộ nhớ bị giới hạn kích thước, có danh sách
điều còn thiếu và không nhận prose tự do làm chỉ dẫn hệ thống. Bộ test riêng
bao phủ hội thoại dài, sửa ý định, phủ định tên miền, blog không bán hàng, PII
và dữ liệu bộ nhớ sai.

Đợt `chatbot-v7` bổ sung 671 mẫu train và 146 holdout, trong đó có hội thoại
nhiều lượt, cách gọi lại “gói đó/ngân sách cũ”, đổi ý, giá cũ, nội dung chèn
lệnh, chưa có web, thanh toán và OCR. Lệnh chạy nền:

```bash
pnpm ai:train:chatbot:v7
pnpm ai:train:chatbot:v7:status
```

Ứng viên dùng base `unsloth/Qwen3.5-4B`, 8 epoch, context train 4096 và GGUF
`hostora-chatbot:4b-q8-v7`. Training/eval không tự thay model runtime; chỉ
được xem xét sau khi holdout, bộ đo long-context và kiểm tra thủ công đạt yêu
cầu. Trạng thái runtime hiện không được suy ra từ việc train đang chạy.

Đánh giá local ngày 29/10 đã hoàn tất 146/146 request và schema. V7 đạt
145/146 ngôn ngữ phổ thông, 146/146 không bịa số thương mại, 145/146 có bước
tiếp theo, 146/146 đúng hình thức hữu ích và 132/146 định tuyến đúng. Trên cùng
tập này, v6 đạt 134/146 định tuyến đúng và 146/146 ở bốn chỉ số còn lại. Vì v7
không cải thiện định tuyến và trượt một ca ngôn ngữ/bước tiếp theo, quyết định
là `keep_as_candidate`; không promote.

## Đợt `chatbot-v6` ngày 27/10/2026

Đã chuẩn bị 655 mẫu học và 142 ca kiểm tra, gồm 18 ca mới chỉ ở tập kiểm
tra. Các tình huống mới bao phủ khách chưa có web, sửa bản thử, chọn dịch vụ
lưu trữ, giờ cao điểm, chuyển trang, sao lưu, bảo vệ, giá/ưu đãi chưa xác
minh, đơn hàng, hủy/hoàn tiền, ảnh có thông tin nhạy cảm và chuyển sang người
tư vấn. Đây là ví dụ về **cách tư vấn**; giá, ưu đãi và trạng thái giao dịch vẫn
phải lấy từ dữ liệu đã xác minh lúc chạy ứng dụng.

Đợt v6 chạy độc lập bằng `hostora-chatbot-v6-finetune.service`. Lệnh
`pnpm ai:train:chatbot:status` xem từng pha, GPU và tiến độ. Dịch vụ sẽ train,
xuất/nạp model ứng viên và so sánh trên holdout với v5 và model 9B. Không có
bước tự đổi model đang phục vụ. Kết quả chất lượng chỉ có giá trị sau khi
`training/output-chatbot-v6/evaluation.json` được ghi và các lỗi được xem lại.

Đánh giá local đã hoàn tất 142/142 request và schema. V6 đạt 142/142 ngôn ngữ
phổ thông, không bịa số thương mại, có bước tiếp theo và hình thức hữu ích;
134/142 ca định tuyến đúng. Riêng 18 tình huống mới chỉ có ở holdout, định
tuyến đúng 14/18. Kết quả đủ điều kiện review thủ công nhưng vẫn là
`candidate_only`; artifact đánh giá và model nặng ở thư mục output bị Git
ignore, còn dataset/config/script tái lập được đưa lên GitHub.

Bộ đo v5 ban đầu chỉ nhận vài động từ ra lệnh nên bỏ sót câu kiểu “cần kiểm
tra” hoặc “nên thử”. Khi chấm lại **cùng 124 câu trả lời đã lưu** bằng bộ đo
mở rộng, chỉ số bước tiếp theo là 121/124 thay cho 62/124. Đây là sửa bộ đo,
không phải hiệu quả huấn luyện mới; năm ca định tuyến sai của v5 vẫn còn.

## Cập nhật `chatbot-v5` ngày 27/10/2026

Lần chạy tự động `chatbot-v5` đã hoàn tất đủ các bước tạo dữ liệu, snapshot,
train, export GGUF, import Ollama, đánh giá, unload và tổng kết. Bằng chứng cục
bộ nằm tại `training/runs/chatbot-v5/` và `training/output-chatbot-v5/`; hai thư
mục chứa artifact lớn nên bị Git ignore.

| Thuộc tính       | Kết quả đã quan sát                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Base             | `unsloth/Qwen3.5-4B`                                                                                                      |
| Dữ liệu          | 543 train, 124 holdout; file có SHA-256 trong manifest                                                                    |
| Huấn luyện       | 6 epoch, 1.086 optimizer step, loss 0,3769166, VRAM đỉnh 9,72 GB                                                          |
| Reload/export    | Adapter nạp lại được; GGUF Q8 4.610.580.288 byte                                                                          |
| Holdout kỹ thuật | 124/124 HTTP thành công và 124/124 đúng schema                                                                            |
| Rubric ban đầu   | 124/124 ngôn ngữ phổ thông; 124/124 không bịa số thương mại; 119/124 định tuyến đúng; 62/124 bước tiếp theo theo bộ đo cũ |
| Quyết định       | `candidate_only`; không tự động thay model runtime                                                                        |

Năm lỗi định tuyến còn lại gồm tình huống chưa có website/sản phẩm, thanh toán,
lưu lượng và quyền riêng tư. Bộ đo cũ chỉ nhận ra 50% câu có bước tiếp theo;
chấm lại các câu đã lưu bằng bộ đo mở rộng là 121/124. Vì vậy v5 chưa được
gọi là tốt hơn model đang phục vụ và không được promote chỉ dựa vào loss hoặc
124 phản hồi HTTP thành công. Giá, khuyến mại, tên miền và dữ liệu khách vẫn
không được đưa vào trọng số.

Lệnh kiểm tra trạng thái mà không chạy lại training:

```bash
pnpm ai:train:chatbot:status
```

Ngày train và kiểm thử: 2026-10-23–24. Phạm vi là `/api/ai/chat`, dùng chung cho
web và React Native. Các API AI trích xuất/cấu trúc khác vẫn dùng
`OLLAMA_CHAT_MODEL=qwen3.5:9b-q8_0`; không có cloud fallback hay chatbot ngoài app.
Đây là phạm vi tích hợp, chưa phải cơ chế chứng thực: nếu Next server được mở
trên LAN, client khác cùng mạng vẫn có thể gọi endpoint; trước khi triển khai
công khai cần thêm xác thực và rate limit.

## Dữ liệu, quyền sử dụng và tách tập

- Base: [`unsloth/Qwen3.5-4B`](https://huggingface.co/unsloth/Qwen3.5-4B/tree/main),
  model card ghi Apache-2.0. Adapter được train cục bộ bằng BF16 LoRA.
- `training/chatbot_cases.json`: 49 case do dự án tự viết từ kiến thức đã có;
  37 case train có 74 cách hỏi, 12 case holdout có 12 câu hỏi.
- `training/grounded_cases.json`: 20 case nguồn-ngữ-cảnh, 40 cách hỏi train
  bổ sung. Tổng cộng 114 train và 12 holdout. Mỗi case chỉ tới ID trong
  `data/knowledge.json`, nơi lưu URL nguồn và ngày xác minh. Không sao chép
  hội thoại khách hàng, lead, lịch sử chat, token hoặc dữ liệu cá nhân.
- Giá, khuyến mại, thông số gói và tình trạng tên miền biến động không đi vào
  trọng số model; script tạo tập dữ liệu kiểm tra và từ chối nhiều dạng số liệu
  động. Giá vẫn chỉ lấy từ catalog có nguồn/snapshot.
- `training/challenge_cases.jsonl` gồm 6 câu hỏi thêm sau train, để thử lỗi
  số học, nguồn giả, prompt injection, domain và SEO. Tập này không tham gia
  optimizer.

Tách theo case giúp tránh lặp nguyên câu hỏi, nhưng tập nhỏ và tự biên soạn;
chưa phải đánh giá mù bởi chuyên gia hay khách hàng thật. Model base 4B chưa
được đo đối chứng độc lập; không thể kết luận LoRA đã tốt hơn base 4B.

## Bằng chứng train và nạp lại

| Mốc           | Kết quả quan sát được                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Train v1      | 74 dòng, 57 optimizer step, loss train 2,076, VRAM đỉnh 8,91 GB                                                              |
| Train v2      | 114 dòng, 87 optimizer step, loss train 1,639, VRAM đỉnh 9,22 GB                                                             |
| Adapter v2    | `c41f0db7ddd66393d1a830282f6109095583762b2e70d0545147d69aeb096ce1` (SHA-256)                                                 |
| Reload/export | Adapter nạp lại được; GGUF Q8 4.610.580.288 byte, SHA-256 `033523b3dfb9722d92217236b009e71af01a5e4ac0f1541575977de7edf96c4e` |
| Ollama        | `hostora-chatbot:4b-q8-20261023-v2` đã nạp và trả lời qua `/api/ai/chat`                                                     |

Artifact lớn nằm trong `training/output-chatbot-v2/` và bị Git ignore; manifest
và log chi tiết ở đó. Trường `status: trained_not_evaluated` trong manifest là
trạng thái **lúc train xong**; kết quả đánh giá lưu ở các file eval riêng, không
được cập nhật ngược vào manifest. Loss chỉ chứng minh optimizer chạy, không
chứng minh chất lượng tư vấn.

## Kiểm thử endpoint và vấn đề đã xử lý

- Baseline 9B của app chạy 12/12 HTTP 200. Bản v2 cuối chạy 12/12 holdout và
  6/6 challenge qua endpoint thật. Kết quả raw ở
  `training/output-chatbot/eval-holdout-final.json` và `eval-challenge-final.json`.
  HTTP 200 không phải thước đo đúng nguồn hay hài lòng người dùng.
- Challenge trước khi thêm guard đã lộ lỗi tính 29.000 × 24, citation giả,
  lời hứa thời gian chuyển DNS và diễn giải SEO quá mức. Vì vậy những câu hỏi
  về giá gia hạn chưa rõ, nhu cầu mua gói đủ dữ kiện, trạng thái domain,
  structured data penalty, DNS và robots privacy nay dùng logic tất định;
  model không được tự quyết định số học/thương mại.
- Model v2 có lúc lặp đoạn SEO dài; đã giới hạn output và đặt repeat penalty.
  Thử lại cùng câu 4 lần không tái hiện lặp; mẫu nhỏ không bảo đảm loại trừ
  lỗi này hoàn toàn.
- Citation hậu xử lý chỉ chấp nhận ID có trong context; điều đó **không chứng
  minh** câu chứa citation được nguồn hỗ trợ. Có vài câu holdout còn thiếu mượt
  về trình bày nguồn, nên chưa gọi là chất lượng production.
- So thời gian giữa baseline 9B và v2 sau guard **không công bằng** vì nhiều
  câu cuối được trả lời tất định mà không gọi model. Không đưa ra tuyên bố tăng
  tốc hay tăng độ chính xác từ số liệu đó.

Email/số điện thoại trong chat được che trước retrieval/inference bằng quy tắc
best-effort; không thể bảo đảm phát hiện mọi PII trong văn bản tự do. Log local
chỉ ghi model, latency, token usage và số nguồn, không ghi câu hỏi/PII.

## Vận hành và bước cần làm trước sản phẩm thật

`.env.local` chọn riêng `OLLAMA_CHATBOT_MODEL=hostora-chatbot:4b-q8-20261023-v2`.
Muốn quay về model 9B, bỏ biến đó và khởi động lại Next.js. Bộ test nhỏ hỗ trợ
demo, không thay đánh giá 100+ câu thật đã ẩn PII, chấm điểm faithfulness bởi
người có chuyên môn, thử prompt injection, đo p95 trên máy đích và giám sát lỗi
liên tục. Chưa có Langfuse self-host/project nên chưa có trace production.

Lặp lại training có kiểm soát:

```bash
training/.venv/bin/python training/build_chat_dataset.py
# Dừng model Ollama đang chiếm VRAM trước khi train; không dừng service.
HOSTORA_TRAIN_OUTPUT=output-chatbot-v2 training/.venv/bin/python training/train_chatbot.py
HOSTORA_TRAIN_OUTPUT=output-chatbot-v2 training/.venv/bin/python training/export_chatbot.py
node training/evaluate_chatbot.mjs holdout 12
node training/evaluate_chatbot.mjs challenge 6 challenge_cases.jsonl
```

Không ghi đè adapter/Modelfile đang phục vụ mà chưa lưu bản cũ và đánh giá lại.
