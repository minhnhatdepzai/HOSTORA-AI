# HOSTORA AI — Nghiên cứu sản phẩm

Ngày xác minh: **2026-10-23**.

## Đề thi chính thức

[VIBE-CODING 2026 — Đề 01](https://vibecoding.info.vn/de-bai) mô tả đúng năm yêu cầu bắt buộc:

1. Form loại website, traffic tháng, ngân sách và nhu cầu tên miền.
2. AI chọn một gói chính + hai thay thế, giải thích tiếng Việt dễ hiểu.
3. Bảng so sánh ba gói theo giá, dung lượng, băng thông, tính năng.
4. Form tên/số điện thoại lưu localStorage.
5. FAQ accordion ít nhất năm câu.

HOSTORA triển khai đủ năm yêu cầu và mở rộng bằng cost, flash-sale, growth, domain, RAG và website analyzer. Trang chính thức nói đây là Mini App có thể trải nghiệm; vì vậy luồng chính ưu tiên demo nhanh, không yêu cầu tài khoản.

## Dữ liệu hosting

[Hostinger Việt Nam](https://www.hostinger.com/vn/web-hosting) được chọn cho catalog đầu tiên vì cùng một trang công khai nêu giá ưu đãi, giá gia hạn, kỳ 48 tháng, storage, backup, CDN và e-commerce. Thiết kế không che giá gia hạn dưới CTA.

[Cloudflare Plans](https://www.cloudflare.com/plans/) được dùng làm nguồn kiến thức về CDN/SSL/DDoS, không trộn Cloudflare Free thành một gói hosting origin.

Khảo sát thêm [Tino Group](https://tino.vn/vi/) cho thấy nhu cầu bản địa hóa giá VND và hỗ trợ tiếng Việt, nhưng dữ liệu crawl ở thời điểm nghiên cứu không đồng nhất giữa site chính/staging; chưa đưa vào catalog verified.

## Pattern UI/UX đã chọn

- Pricing: thẻ gói chính nổi bật vừa đủ, renewal luôn ở ngay dưới promo.
- AI SaaS: trạng thái model local hiện rõ, không dùng “AI” như nhãn trang trí.
- Fintech: số tiền lớn, breakdown nhỏ, cảnh báo giả định tách khỏi số đã xác minh.
- Dashboard: hierarchy rõ, mỗi màn hình một nhiệm vụ; mobile dùng menu thu gọn và bảng cuộn ngang.
- Visual language riêng: nền ink, mint/cyan signal, bề mặt paper, góc bo lớn và grid kỹ thuật. Không sao chép một template cụ thể.

Tham khảo component behavior/accessibility từ [shadcn/ui](https://ui.shadcn.com/) và hệ utility từ [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), nhưng component được viết theo visual system HOSTORA.

## Quyết định sản phẩm

- Không dùng hero stock image; biểu đồ và “AI decision card” code-native truyền đạt sản phẩm tốt hơn.
- Một catalog ít nhưng verified tốt hơn nhiều plan giả.
- AI phụ trách ngôn ngữ; code phụ trách tiền, điểm và simulator.
- “Traffic/tháng” chỉ là heuristic; mọi màn hình tải đều ghi cần benchmark thật.
