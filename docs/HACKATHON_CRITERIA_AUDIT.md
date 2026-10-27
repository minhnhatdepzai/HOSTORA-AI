# Đối chiếu tiêu chí mini app tư vấn hosting/domain

Ngày kiểm tra: 26/10/2026.

## Kết luận

| Tiêu chí                                                    | Website                                                | Ứng dụng Android                                                                                              | Bằng chứng                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Form loại website, lượt truy cập, ngân sách, tên miền       | Đạt, đã đi qua đủ 4 bước trên trình duyệt thật.        | Đạt, đã mở bước 1/4 trên Redmi; mã nguồn có đủ bốn bước và ô tự nhập.                                         | `components/consultation-wizard.tsx`, `mobile/src/app/(tabs)/consult.tsx`   |
| 1 gói phù hợp nhất và 2 gói thay thế, giải thích tiếng Việt | Đạt, API trả đúng 3 gói và giao diện đánh dấu gói đầu. | Đạt theo mã nguồn; app yêu cầu đúng 3 gói từ API và có phần giải thích.                                       | `lib/recommendation.ts`, `mobile/src/lib/recommendations.ts`                |
| Bảng so sánh 3 gói: giá, dung lượng, băng thông, tính năng  | Đạt, đã nhìn thấy bảng trên trình duyệt thật.          | Đạt theo mã nguồn; bảng ngang có giá, kỳ hạn, gia hạn, dung lượng, băng thông, SSL, sao lưu, CDN và bán hàng. | `components/recommendations-view.tsx`, `mobile/src/app/recommendations.tsx` |
| Đăng ký tư vấn bằng họ tên và số điện thoại, lưu cục bộ     | Đạt; form xuất hiện và lưu vào `localStorage`.         | Đạt theo mã nguồn; form lưu qua `AsyncStorage`.                                                               | `components/recommendations-view.tsx`, `mobile/src/context/app-context.tsx` |
| FAQ accordion tối thiểu 5 câu                               | Đạt; website có 6 câu trên trang chủ.                  | Đạt; màn đề xuất có đúng 5 câu có thể mở/đóng.                                                                | `components/faq.tsx`, `mobile/src/app/recommendations.tsx`                  |

## Luồng đã chụp

1. Form tư vấn web: khỏe; bốn bước rõ, cho tự nhập lượt truy cập và ngân sách.
2. Trang ba gói web: khỏe; gói tốt nhất, hai lựa chọn và bảng so sánh cùng xuất hiện.
3. FAQ web: khỏe; sáu nút accordion có accessible name.
4. Trang chủ Android trên Redmi: khỏe; safe area và thanh điều hướng không che nội dung.
5. Bước 1/4 Android trên Redmi: khỏe; lựa chọn có trạng thái chọn rõ và nút tiếp tục đủ lớn.

Ảnh kiểm tra nằm trong `output/playwright/`, gồm `hostora-redmi-current.png`, `hostora-redmi-choose-plan.png` và ảnh luồng web cùng ngày.

## Giới hạn bằng chứng

- Luồng web đã chạy trực tiếp từ form đến trang đề xuất. Không lưu một lead thử để tránh để lại số điện thoại giả trong trình duyệt.
- Trên Android đã kiểm tra trực tiếp trang chủ và bước 1/4; các bước còn lại, bảng so sánh, form lead và FAQ được xác nhận từ mã nguồn và test hiện có, chưa bấm hết đầu-cuối trong lần kiểm tra này.
- Ảnh chụp không đủ để tuyên bố tuân thủ WCAG đầy đủ. Cần kiểm tra bàn phím, screen reader, độ tương phản và phóng to riêng nếu dùng làm chứng nhận accessibility.
