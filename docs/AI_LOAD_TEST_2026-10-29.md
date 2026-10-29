# HOSTORA — load/stress test AI staging

Ngày chạy: 29/10/2026. Revision ứng dụng: `200e27e`. Endpoint: `POST /api/ai/analyze`.

## Kết luận

AI structured của HOSTORA ổn định đến 16 request đồng thời trong phép đo này: tất cả response đúng schema, không timeout và không OOM. Tuy nhiên throughput bão hòa ngay khoảng **0,34–0,35 request/giây**; tăng concurrency không tăng công suất mà làm thời gian chờ tăng gần tuyến tính.

Ngưỡng lỗi quan sát được là 32 request đồng thời: 31/32 response hợp lệ, một request trả HTTP 503 sau **90.108 ms**, khớp với `OLLAMA_TIMEOUT_MS=90000`. p95 của 31 response thành công ở pha này là **85.417 ms**. Vì vậy cấu hình hiện tại không nên nhận hàng đợi dài mà không có admission control/giới hạn queue.

## Môi trường và phương pháp

- Next.js production standalone, loopback `127.0.0.1:3199`, database test tách riêng trong `/tmp`.
- Không đi qua Internet, Quick Tunnel, Cloudflare, WAF hoặc load balancer.
- Model: `qwen3.5:9b-q8_0`, context cấu hình 16K, timeout server 90 giây.
- GPU: NVIDIA GeForce RTX 5060 Ti 16 GB.
- Client timeout: 100 giây, lớn hơn timeout server để ghi nhận response 503 thay vì tự hủy trước.
- Sáu prompt tiếng Việt giả lập cửa hàng, công ty và blog; không có PII.
- Mỗi response phải HTTP 200 và đúng schema phân tích nhu cầu mới được tính thành công.
- Latency là end-to-end từ client staging đến JSON hợp lệ; throughput chỉ tính response thành công.
- Langfuse không được cấu hình trong lượt chạy; prompt và kết quả chỉ lưu local trong artifact bị Git ignore.

## Kết quả

| Đồng thời | Request | Thành công | HTTP 503 | Client timeout | Throughput thành công | p50 | p95 | max |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6 | 6 | 0 | 0 | 0,340 req/s | 2.914 ms | 3.161 ms | 3.161 ms |
| 2 | 8 | 8 | 0 | 0 | 0,348 req/s | 5.631 ms | 5.932 ms | 5.932 ms |
| 4 | 12 | 12 | 0 | 0 | 0,350 req/s | 11.331 ms | 11.634 ms | 11.634 ms |
| 8 | 16 | 16 | 0 | 0 | 0,350 req/s | 22.684 ms | 23.087 ms | 23.087 ms |
| 16 | 32 | 32 | 0 | 0 | 0,350 req/s | 45.500 ms | 45.889 ms | 45.904 ms |
| 32 | 32 | 31 | 1 | 0 | 0,344 req/s | 45.743 ms | 85.417 ms | 88.242 ms |

Tổng pha đo: **106 request**, 105 thành công, 1 HTTP 503, 0 client timeout. Ngoài ra có 6 warm-up thành công. Pha 32 đồng thời kết thúc ở 90,117 giây; request lỗi nhận response 503 ở 90,108 giây.

Log server của các response thành công ghi trung bình khoảng 183 input token và 105 output token. Trong 254 mẫu GPU của các pha 1–16: utilization trung bình khi hoạt động 81,8%, đỉnh 100%; VRAM cao nhất 10.776 MiB; nhiệt độ cao nhất 62°C; công suất cao nhất 124,02 W. Không thấy OOM hoặc crash.

## Diễn giải

1. **Nút thắt là model/queue, không phải HTTP.** Throughput không tăng khi concurrency tăng từ 1 lên 16, trong khi p95 tăng từ 3,16 lên 45,89 giây.
2. **Timeout hiện có hoạt động nhưng quá muộn cho UX.** Ở concurrency 32, người dùng có thể chờ gần 90 giây rồi mới nhận 503.
3. **Ngưỡng vận hành hợp lý hiện tại là tối đa khoảng 2 tác vụ AI đang chạy** nếu mục tiêu p95 dưới 10 giây. Concurrency 4 đã có p95 11,63 giây.
4. **Không có dấu hiệu thiếu VRAM.** GPU đạt tải cao nhưng VRAM còn khoảng trống; tăng request song song không làm tăng throughput, nên chỉ tăng concurrency không giải quyết vấn đề.

## Khắc phục ưu tiên

### P0 — admission control và hàng đợi hữu hạn

- Dùng semaphore dùng chung cho các route AI, thực thi tối đa 1–2 structured generation cùng lúc.
- Giới hạn chiều dài queue và thời gian chờ. Khi quá tải, trả `429` hoặc `503` sớm cùng `Retry-After`, không để người dùng chờ 90 giây.
- Hiển thị trạng thái “AI đang bận” và cho người dùng tiếp tục wizard tất định; không để AI chặn việc nhận đề xuất hosting.

### P1 — benchmark model ứng viên

- So sánh model 9B hiện tại với model 4B đã tinh chỉnh trên cùng tập chất lượng độc lập.
- Chỉ đổi model khi đồng thời đạt schema, độ đúng ngôn ngữ, phủ định/paraphrase và latency. Model nhanh hơn nhưng hiểu sai không được coi là cải thiện.
- Đo riêng cold start, warm latency và streaming time-to-first-token của chatbot; báo cáo này chỉ đo structured endpoint.

### P1 — quan sát production

- Ghi feature, model, queue wait, generation latency, token usage và status; không ghi prompt/PII.
- Khi Langfuse self-host/project được cấu hình và trace end-to-end đã kiểm chứng, gửi metadata/timing theo nguyên tắc content capture tắt.
- Đặt cảnh báo cho p95, error rate và queue depth; không suy ra SLA production từ loopback benchmark.

## Chạy lại

```bash
HOSTORA_LOAD_BASE_URL=http://127.0.0.1:3199 \
HOSTORA_LOAD_LEVELS=1:6,2:8,4:12,8:16 \
HOSTORA_LOAD_TIMEOUT_MS=100000 \
pnpm ai:load-test
```

Script mặc định từ chối target ngoài loopback. Chỉ đặt `HOSTORA_LOAD_ALLOW_REMOTE=true` sau khi xác nhận staging từ xa, giới hạn tải và được phép tác động lên hạ tầng đó.

## Artifact local

- `output/ai-load/staging-2026-10-29-run1/results.json`
- `output/ai-load/staging-2026-10-29-stress/results.json`
- `output/ai-load/staging-2026-10-29-timeout-boundary/results.json`
- `output/ai-load/staging-2026-10-29-run1/server.log`
- `output/ai-load/staging-2026-10-29-run1/server-boundary.log`
- `output/ai-load/staging-2026-10-29-run1/gpu.csv`

Các artifact này bị Git ignore vì có log runtime. Báo cáo không phải load test mạng ngoài, multi-node, soak test dài hạn, benchmark chat streaming hoặc kiểm định chất lượng câu trả lời đầy đủ.
