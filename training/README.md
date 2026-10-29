# HOSTORA local chatbot LoRA

Module này train cách tư vấn tiếng Việt cho `/api/ai/chat`; không train giá,
khuyến mại, availability hay dữ liệu khách hàng. Chi tiết nguồn, kết quả và
giới hạn ở [`docs/CHATBOT_FINETUNING.md`](../docs/CHATBOT_FINETUNING.md).

Đợt `chatbot-v7` tập trung vào hội thoại nhiều lượt và đã có script chạy nền
riêng (`scripts/start-chatbot-v7-finetune.sh`). Bộ nhớ hội thoại ở runtime là
logic tất định trong `lib/chat-memory.ts`, không phải lời hứa nhớ vô hạn của
trọng số model. Luôn đánh giá candidate với holdout và ca sửa ý định trước khi
đưa vào runtime.

Model base là `unsloth/Qwen3.5-4B` (Apache-2.0 theo model card), BF16 LoRA.
RTX 5060 Ti 16 GB đã chạy v2 với 114 ví dụ, 87 optimizer step và 9,22 GB VRAM
đỉnh. Artifact adapter, GGUF và eval bị Git ignore. `train_smoke.py` trước đó
chỉ xác nhận load/backprop/save; không phải bằng chứng chất lượng.

```bash
uv sync --project training
training/.venv/bin/python training/build_chat_dataset.py
# Giải phóng VRAM model Ollama trước bước này.
HOSTORA_TRAIN_OUTPUT=output-chatbot-v2 training/.venv/bin/python training/train_chatbot.py
HOSTORA_TRAIN_OUTPUT=output-chatbot-v2 training/.venv/bin/python training/export_chatbot.py
node training/evaluate_chatbot.mjs holdout 12
node training/evaluate_chatbot.mjs challenge 6 challenge_cases.jsonl
```

Việc import GGUF vào Ollama dùng `training/Modelfile.chatbot-v2`; xem README
chính và tài liệu fine-tuning trước khi thay model đang phục vụ. Khi chạy
`evaluate_chatbot.mjs`, endpoint app phải mở ở `127.0.0.1:3000`. Không lấy
HTTP 200, loss train hoặc citation ID hợp lệ làm bằng chứng câu trả lời đúng.
