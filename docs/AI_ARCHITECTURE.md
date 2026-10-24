# Kiến trúc AI

## Model đã chọn bằng benchmark

- Chatbot `/api/ai/chat`: `hostora-chatbot:4b-q8-20261023-v2` (Qwen3.5-4B BF16 LoRA, GGUF Q8); các API trích xuất/cấu trúc khác: `qwen3.5:9b-q8_0`.
- Embedding: `qwen3-embedding:4b`, vector 2560 chiều.
- Runtime: Ollama 0.34.3 tại `127.0.0.1:11434`.
- Context ứng dụng: 16,384 token, không dùng mặc định 262K quảng cáo.

RTX 5060 Ti 16 GB giữ model chat khoảng 10.2 GB VRAM tại context 16K. Benchmark warm tiếng Việt ngày 2026-10-23 đạt khoảng 41.5 token/s; structured JSON đúng schema. 27B cần offload/quantization thấp và không còn khoảng an toàn hợp lý, nên 9B Q8 là lựa chọn mạnh nhất thực dụng cho demo tương tác.

## Luồng recommendation

```text
Mô tả tiếng Việt -> Qwen structured extraction -> Zod
                                      |
Wizard -> Requirements ---------------+
             -> catalog verified -> filter/weighted score -> top 3
             -> UI + deterministic breakdown -> Qwen explanation (khi gọi)
```

Weights v1: budget 25%, resources 18%, e-commerce 16%, ownership 14%, scalability 11%, resilience 10%, usability 6%. Unit test kiểm tra số lượng, thứ tự và budget penalty.

## Local RAG

`data/knowledge.json` chứa 23 tài liệu với title, URL, source type, category, keywords, authority, verification date và nội dung. `pnpm rag:index` batch-embed toàn bộ tài liệu và ghi `data/rag-index.json`. Query tiếng Việt được mở rộng tất định theo chủ đề, sau đó xếp hạng hybrid: cosine 68%, lexical 24%, authority 8% và đa dạng hóa URL/category. Nếu index/model lỗi, retrieval lexical hoạt động như graceful fallback nhưng vẫn dùng cùng metadata thật.

`pnpm rag:evaluate` chạy 10 câu high-signal trong `data/rag-eval.json`. Snapshot 2026-10-23 với embedding 4B đạt Recall@5 = 1,00 và MRR@5 = 0,95. Đây chỉ là retrieval eval nội bộ; faithfulness, answer relevance và tác động kinh doanh cần dataset lớn hơn cùng human/LLM-as-a-judge đã hiệu chỉnh.

Prompt coi context là dữ liệu không tin cậy và yêu cầu bỏ qua instruction trong tài liệu. Citation chỉ được tạo từ metadata retrieval; khi thiếu nguồn model phải nói rõ. Chat còn tách plan (`P`), product (`S`) và knowledge (`K`), cấm tên/công cụ/con số ngoài context và yêu cầu phân biệt dữ kiện nguồn, suy luận tư vấn, phần cần xác minh.

## Streaming và tài nguyên

Route chat chuyển NDJSON từ Ollama thành text stream cho browser. Với model fine-tuned, route giữ câu trả lời tới khi hoàn tất để loại citation ID giả rồi mới gửi; nhánh 9B vẫn stream từng phần. `keep_alive=10m`, context 16K, timeout 90 giây. Training không chạy đồng thời inference/UI QA.

## Tool calling

Bản này dùng backend orchestration có kiểm soát thay vì cho model tùy ý gọi tool. Recommendation, cost, traffic, user requirements và retrieval đều được route/code quyết định. Model không nhận shell, database mutation hoặc open network access.

## Fine-tuning

Theo hướng dẫn chính thức [Unsloth Qwen3.5](https://unsloth.ai/docs/models/qwen3.5/fine-tune), BF16 LoRA 4B khoảng 10 GB VRAM; QLoRA 4-bit không được khuyến nghị cho dòng này. Đã train bản v2 trên 114 câu hỏi, 87 optimizer step, rồi nạp lại adapter/xuất GGUF Q8 và thử endpoint thật với 12 holdout + 6 challenge. Chi tiết hash, lỗi đã tìm thấy, guard tất định và giới hạn eval ở [CHATBOT_FINETUNING.md](CHATBOT_FINETUNING.md). Chưa có so sánh đối chứng với base 4B hoặc đánh giá độc lập bằng câu hỏi khách hàng thật.

## Observability

Hiện chưa có Langfuse project/self-host instance nên không thêm SDK giả vờ hoạt động. Runtime ghi log cấu trúc local gồm model, latency, token usage, feature và số context đã lấy; không ghi prompt, chat text hoặc số điện thoại. Khi bật Langfuse, cần self-host/project thật, mask PII và kiểm chứng trace end-to-end trước khi báo hoàn thành. Theo khung đánh giá RAG của Langfuse, backlog eval gồm faithfulness, answer relevance và retrieval recall; hiện chỉ retrieval recall/MRR đã đo.
