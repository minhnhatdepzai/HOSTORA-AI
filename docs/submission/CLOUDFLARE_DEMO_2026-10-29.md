# HOSTORA public demo qua Cloudflare

## URL đã kiểm tra

- Web: https://consultation-directory-budgets-plus.trycloudflare.com/
- Tư vấn: https://consultation-directory-budgets-plus.trycloudflare.com/consultation
- Trợ lý AI: https://consultation-directory-budgets-plus.trycloudflare.com/ai-assistant
- Web admin: https://consultation-directory-budgets-plus.trycloudflare.com/admin
- Tải APK: https://consultation-directory-budgets-plus.trycloudflare.com/downloads/android
- Health: https://consultation-directory-budgets-plus.trycloudflare.com/api/health

Lượt kiểm tra ngày 29/10/2026: trang chủ HTTP 200, health HTTP 200, `/api/recommend` trả đề xuất, `/downloads/android` trả APK, `/admin` chuyển tới `/admin/login`, và hai câu phân tích AI thật qua URL public giữ đúng `blog`, `ecommerce:false`, `needsDomain:false`.

## Giới hạn của URL này

Đây là Cloudflare **Quick Tunnel không cần tài khoản**, chạy từ máy phát triển. URL chỉ tồn tại khi tiến trình `pnpm tunnel:cloudflare` còn chạy và có thể đổi sau lần dừng. Không dùng URL này làm địa chỉ production hoặc callback thanh toán lâu dài.

Chạy lại:

```bash
pnpm tunnel:cloudflare
```

Dừng:

```bash
pnpm tunnel:cloudflare:stop
```

Muốn URL cố định, tạo named tunnel trong tài khoản Cloudflare, trỏ DNS tên miền HOSTORA vào tunnel, rồi đặt `HOSTORA_PUBLIC_BASE_URL` và các URL callback Stripe/VNPay theo tên miền HTTPS đó. Không commit token Cloudflare.
