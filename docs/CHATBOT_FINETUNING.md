# Fine-tuning chatbot HOSTORA trong app

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
