# Hành trình nội dung và tham khảo UX của HOSTORA

Ngày rà soát: 27/10/2026. Đây là tham khảo **cách tổ chức trải nghiệm**, không sao chép giao diện, câu chữ hoặc bảng giá từ website khác. Giá sản phẩm của HOSTORA vẫn theo `docs/DATA_SOURCES.md` và dữ liệu danh mục đã xác minh.

## Vai trò của từng bề mặt

| Bề mặt           | Việc khách cần làm                                                 | Cách trình bày                                                                  |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Trang chủ web    | Hiểu nhanh HOSTORA, tải app, tạo bản thử, xem vài gói, tra hóa đơn | Giữ ngắn; sổ tay là lối vào phụ sau thanh toán nhanh                            |
| Danh mục web/app | Xem đủ dịch vụ, kỳ thanh toán, giá gia hạn, điều chưa rõ           | Một đường gửi yêu cầu và thanh toán tại HOSTORA                                 |
| Sổ tay web/app   | Tìm đúng bước hiện tại, làm một việc tiếp theo                     | Bốn chặng: ý tưởng → lựa chọn → ra mắt → phát triển; app đọc bản đã lưu khi mất kết nối |
| Đơn hàng web/app | Xác nhận trạng thái, voucher nếu được cấp, việc tiếp theo          | Checklist chỉ xuất hiện sau trạng thái `paid`; voucher chỉ hiện từ hóa đơn thật |

## Những mẫu đã tham khảo

- [Hostinger Web Hosting](https://www.hostinger.com/vn/web-hosting): phân nhóm lợi ích và bảng gói dễ quét. HOSTORA giữ phần so sánh nhưng tách rõ giá ưu đãi, chu kỳ và giá gia hạn.
- [Hostinger AI Website Builder](https://www.hostinger.com/ai-builder): nối ý tưởng tới bản xem trước. HOSTORA dẫn từ bài đầu sang xưởng tạo website, để khách tự chọn phong cách và nội dung.
- [AZDIGI bảng giá tên miền](https://my.azdigi.com/domain/pricing): cách tách loại tên miền và giá theo kỳ. HOSTORA không suy ra giá chưa được xác minh.
- [Vietnix VPS](https://vietnix.vn/vps/), [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets), [Hetzner Cloud](https://www.hetzner.com/cloud/) và [Cloudways Pricing](https://www.cloudways.com/en/pricing.php): phân biệt mức tài nguyên với mức công vận hành. Bài chọn hosting nhắc cả sao lưu, hỗ trợ và trách nhiệm quản trị, không xếp gói chỉ bằng CPU/RAM.
- [DigitalOcean Docs](https://docs.digitalocean.com/products/droplets/) và [Shopify Blogs](https://help.shopify.com/en/manual/online-store/blogs): kiến thức tìm được theo nhu cầu, có bước thực hành tiếp theo. HOSTORA dùng bài ngắn có checklist và CTA nội bộ.

Các trang MMO có phạm vi rất rộng, từ công cụ marketing tới diễn đàn trao đổi. Không có một mẫu chung đáng tin cho mọi loại. HOSTORA chỉ nhận cách đưa ví dụ gần công việc kinh doanh, lộ trình học ngắn và hỗ trợ sau mua; không dùng đồng hồ đếm ngược, số lượt mua hoặc cam kết lợi nhuận giả.

## Hướng thiết kế

Đối tượng: người kinh doanh muốn có website nhưng không quen thuật ngữ. Giọng: rõ, ấm, cụ thể. Mật độ: trang chủ gọn; bài viết rộng rãi để đọc lâu; app chia nội dung theo chặng. Chữ Be Vietnam Pro, nền giấy sáng, mực xanh đậm và xanh lá HOSTORA hiện có. Motif là số chặng lớn và đường kẻ như một cuốn sổ làm việc. Chuyển động chỉ dùng ở phản hồi nút và chuyển trang đã có; nội dung vẫn đọc được khi giảm chuyển động.

## Skill Codex đã cài trên máy

| Skill                       | Dùng khi nào                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| `human-ui-design` (đã có)   | Chọn hướng thiết kế, rà desktop/mobile, chống giao diện rập khuôn |
| `ui-ux-pro-max`             | Tra cứu typography, màu, tương tác và checklist UX                |
| `web-design-guidelines`     | Rà accessibility và quy tắc giao diện web                         |
| `react-native-skills`       | Safe area, danh sách, điều hướng và hiệu năng Expo                |
| `fixing-accessibility`      | Sửa tên nút, bàn phím, focus và độ tương phản                     |
| `fixing-motion-performance` | Giữ chuyển động mượt, hỗ trợ giảm chuyển động                     |

Năm skill bổ sung nằm trong `/home/admin123/.codex/skills/`. Codex cần mở phiên mới để thấy skill mới trong danh sách. Không cài thêm thư viện giao diện hay hiệu ứng vào sản phẩm chỉ vì skill đề xuất; mỗi phụ thuộc cần có tác dụng rõ trong luồng khách.

## Ranh giới của nội dung

“Câu chuyện HOSTORA” là lời hứa sản phẩm hiện tại, không phải tiểu sử sáng lập. Sổ tay không thay báo giá, điều khoản thanh toán hoặc triển khai thật. Website bản thử không được gọi là website đã hoạt động công khai. Các bài không cam kết SEO, doanh thu hoặc AI luôn trả lời đúng.
