# Kịch bản demo (6–8 phút)

1. Mở `/`, chỉ trạng thái **Local AI** và ba nguyên tắc: không API trả phí, không bịa giá, không gửi lead.
2. Vào `/consultation`, dán: “Tôi bán mỹ phẩm online, ngân sách 600 nghìn mỗi tháng, khách ở Việt Nam, khoảng 50.000 lượt truy cập và cần tên miền.” Bấm **AI tự điền wizard**, kiểm tra lại bốn bước.
3. Mở recommendations: trình bày top 1 + hai thay thế, điểm breakdown, promo/renewal và link nguồn.
4. Đăng ký tư vấn với dữ liệu demo `Nguyễn Minh / 0912345678`, mở Dashboard để chứng minh localStorage, sau đó xóa và xác nhận dialog.
5. Mở `/intelligence`, đổi flash-sale từ 5x thành 10x; nhấn mạnh biểu đồ là giả định, không phải cam kết tải. Đổi kỳ cost 12/24/36 tháng.
6. Mở `/ai-assistant`, hỏi “Vì sao phải xem giá gia hạn và CDN có thay hosting không?” Quan sát stream và citation.
7. Mở `/domain-advisor`, dùng `Minh Nhat Fashion`; chỉ nhãn **Chưa check availability**.
8. Mở `/website-analyzer`, phân tích `https://example.com`, sau đó thử `http://127.0.0.1` để demo SSRF guard.
9. Kết: code quyết định số, AI quyết định cách diễn giải; toàn bộ inference chạy trên RTX local.

Nếu Ollama cold-start, đợi khoảng 10–15 giây ở lượt đầu. Không dùng lead thật trong demo công khai.
