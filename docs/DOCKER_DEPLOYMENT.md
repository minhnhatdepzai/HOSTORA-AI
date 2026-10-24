# Chạy HOSTORA AI bằng Docker

## Phạm vi

Stack Docker gồm Next.js web/API và Ollama local. Lead, wizard và lịch sử chat vẫn nằm trong `localStorage` của trình duyệt; Compose không tạo cloud database và không gửi prompt sang nhà cung cấp AI bên ngoài.

Ollama và web dùng chung network namespace. Vì vậy web luôn gọi `http://127.0.0.1:11434`, đúng ranh giới local-first. Cổng Ollama trên host cũng chỉ bind `127.0.0.1`; cổng web mặc định là `3000` để điện thoại cùng Wi-Fi có thể truy cập.

## Chạy nhanh trên CPU

Yêu cầu Docker Engine và Docker Compose mới.

Cấu hình mặc định tải Qwen 3.5 9B Q8 và embedding 4B, phù hợp máy có RAM/VRAM và dung lượng trống tương đối lớn. Máy yếu hơn có thể tạo `.env.docker` rồi dùng `qwen3.5:4b-q4_K_M` cùng `qwen3-embedding:0.6b`; cần đánh giá lại chất lượng trước khi demo.

```bash
git clone https://github.com/minhnhatdepzai/HOSTORA-AI.git
cd HOSTORA-AI
./scripts/docker-up.sh
```

Theo dõi lần khởi tạo đầu:

```bash
docker compose logs -f model-init web
```

Model được lưu trong volume `hostora-ai_ollama_data`; RAG index nằm trong `hostora-ai_rag_data`. Những lần chạy sau sẽ tái sử dụng dữ liệu nếu model và knowledge chưa đổi.

Kiểm tra:

```bash
curl http://127.0.0.1:3000/api/health
docker compose ps
```

## NVIDIA GPU

Chỉ bật profile GPU khi máy đã có NVIDIA driver và NVIDIA Container Toolkit hoạt động với Docker:

```bash
./scripts/docker-up.sh --gpu
```

HOSTORA không tự sửa driver, kernel hoặc Docker runtime. Nếu Docker báo không tìm thấy GPU runtime, dùng bản CPU hoặc cài NVIDIA Container Toolkit theo tài liệu chính thức của NVIDIA.

## Chọn model và cổng

```bash
cp .env.docker.example .env.docker
```

Sau đó chỉnh `.env.docker`. Các giá trị chính:

- `HOSTORA_PORT`: cổng web trên máy chủ.
- `HOSTORA_CHAT_MODEL`: model cho structured AI.
- `HOSTORA_CHATBOT_MODEL`: model riêng cho chatbot; mặc định dùng cùng model nền để clone mới chạy được.
- `HOSTORA_EMBED_MODEL`: model embedding cho RAG.
- `HOSTORA_CONTEXT_LENGTH`: mặc định 16K.

Không commit `.env.docker`. Khi đổi embedding model, xóa riêng RAG volume hoặc để script phát hiện index không tương thích và tạo lại.

## Điện thoại Android cùng Wi-Fi

1. Mở `http://<IP-máy-chạy-Docker>:3000` trên điện thoại để kiểm tra kết nối.
2. Cài APK ở [GitHub Releases](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/tag/v1.4.0).
3. Trong app mở **Công cụ → Kết nối local AI**, nhập `http://<IP-máy>:3000`, lưu và kiểm tra kết nối.

Nếu firewall của máy chủ chặn cổng 3000, chỉ mở cổng cho mạng LAN tin cậy. Không công khai thẳng Next.js/Ollama ra Internet; production cần reverse proxy, TLS, authentication và rate limiting.

## Dừng và cập nhật

```bash
./scripts/docker-down.sh
git pull --ff-only
./scripts/docker-up.sh
```

Lệnh sau xóa cả model và RAG index, chỉ dùng khi thực sự muốn tải lại từ đầu:

```bash
docker compose down -v
```

## Giới hạn

- Lần chạy đầu phải tải model, có thể tốn nhiều GB và phụ thuộc tốc độ mạng.
- Chatbot LoRA riêng của máy demo không nằm trong repo public; clone mới dùng model nền được khai báo trong `.env.docker`.
- Nếu embedding tạm thời lỗi, app vẫn chạy với lexical RAG fallback và phải hiển thị đúng trạng thái đó.
- APK phát hành trực tiếp hiện ký bằng debug certificate, chưa phải bản Google Play production.

## Nguồn triển khai

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Ollama Docker](https://docs.ollama.com/docker)
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/)
