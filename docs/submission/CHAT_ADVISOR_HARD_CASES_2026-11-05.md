# HOSTORA 2.2.4 — ca khó trên Android ảo (05/11/2026)

## Người chấm có thể xem gì ngay?

Ba ảnh chụp từ **APK thật trên Android Emulator 16** (`emulator-5554`), không phải trình duyệt thu nhỏ:

- [Sự cố flash sale: hành động giữ đơn trước khi đổi gói](evidence/A09-outage-immediate-emulator.png)
- [Khách yêu cầu đúng một gói: một đề xuất, tiền trả trước và một nguồn](evidence/A10-one-plan-emulator.png)
- [Tư vấn chọn gói: vì sao xếp thứ tự và bước cần xác nhận](evidence/N03-advisor-explanation-emulator.png)

Ứng dụng `com.hostora.ai` version `2.2.4` (`versionCode 27`) được cài trên máy ảo. Các ca chat đầu chạy với backend và SQLite kiểm thử cách ly tại cổng 3398, SMTP tắt. Sau khi sửa, ba ca then chốt được gõ lại trong APK với backend production local cổng 3200; app đã được trả về preset **Máy ảo Android** `http://10.0.2.2:3200`, trạng thái **SẴN SÀNG**. Không dùng dữ liệu khách thật hay gửi email thật.

| Ca gõ trực tiếp trong APK | Điều cần thấy | Quan sát sau sửa |
| --- | --- | --- |
| Shop WooCommerce sập lúc flash sale 300 khách | Giữ đơn, ngừng đưa khách vào trang lỗi, thử lại luồng thanh toán trước khi mở bán | Đạt. Có một tài liệu; không rao gói mới hoặc hỏi lại số khách. |
| Sau chuyển hosting, thanh toán lỗi nhưng email vẫn nhận | Ưu tiên đối soát đơn và cổng thanh toán | Đạt. Không chuyển sang hướng dẫn DNS/email. |
| Biến thể: sau **đợt** chuyển hosting, 30% khách lỗi thanh toán lúc livestream | Vẫn nhận ra sự cố thanh toán | Lần thử đầu **không đạt**: lạc sang DNS/email. Đã sửa matcher, thêm regression test và thử lại trên production: đạt. [Ảnh sau sửa](evidence/A11-checkout-after-migration-emulator.png). |
| Google chưa index trang sản phẩm dù đã gửi sitemap | Bắt đầu từ URL cụ thể trong Search Console, kiểm tra noindex/robots | Đạt. Hai tài liệu Google; không bịa menu “Discovery > Pages”. |
| Mới bán giày online, chưa biết khách và ngân sách | Một bước khởi đầu thực tế trước khi hỏi số liệu | Đạt. Hướng dẫn chuẩn bị sản phẩm và tạo đơn thử. |
| Blog mới, 1.000 lượt/tháng, 100.000đ, đã có tên miền, **chọn đúng một gói** | Một gói, phân biệt giá quy đổi với tiền trả trước | Đạt. Hostinger Đơn, kỳ 48 tháng trả trước 955.200đ; một nguồn. |
| Muốn gói không sập khi một triệu khách cùng lúc và top 1 Google | Không hứa chịu tải hoặc thứ hạng | Đạt ở phần quan sát được: nêu giới hạn và yêu cầu thử tải; hai nguồn. Không coi đây là phép thử tải thật. |
| Tính 24 tháng AZDIGI nhưng chưa có giá gia hạn | Không tự giả định giá gia hạn bằng kỳ đầu | Đạt. Chỉ tính 348.000đ kỳ đầu, phần còn lại ghi chưa xác minh. |
| Mô tả shop bằng lời trong Chọn gói | AI điền 15.000 lượt, 300.000đ/tháng, đã có tên miền; bảng giá và giải thích nhất quán | Đạt. Màn kết quả tải 3 gói; giải thích nêu lý do gói đầu, gói rẻ hơn, tiền trả trước và việc thử checkout trước chiến dịch. |

Nguồn trong câu trả lời hiển thị dưới dạng `[1]`, `[2]`; danh sách tài liệu nằm ngay dưới câu trả lời. URL do model tự chèn vào thân câu bị loại. Lời giải thích chọn gói dùng giá và phép xếp hạng từ code tất định; model chỉ chọn mã dữ kiện đã kiểm tra. LangGraph hiện điều phối **Website Studio**, chưa điều phối chatbot. Không dùng tên công nghệ này để thay thế bằng chứng chất lượng câu trả lời.

## Gate mới nhất

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (**334/334**), `pnpm build`: đạt trên source cuối.
- `pnpm ai:check`: Ollama local trả structured output thật; smoke test này không chấm độ đúng của mọi câu.
- `pnpm test:e2e:isolated`: **57 đạt, 1 bỏ qua có chủ đích** trên desktop/mobile; chạy trước bản sửa matcher cuối, còn matcher cuối đã có unit test và kiểm thử APK trực tiếp.
- `pnpm audit:ui`: 12 trang desktop/mobile, không có lỗi accessibility tự động hoặc lỗi trang.
- `pnpm test:mobile:e2e`: chưa chạy được ca Maestro vì Android driver không khởi động trên emulator. Mobile MCP và ảnh APK ở trên là bằng chứng kiểm thử native thay thế cho các ca này.
- Production local `127.0.0.1:3200` và HTTPS Funnel cổng `8443` đã trả trang; URL công khai vẫn phụ thuộc máy demo bật và có mạng.

Các ảnh và câu trả lời là bằng chứng cho những ca cụ thể, không bảo đảm mọi câu hỏi mới đều đúng hoặc hosting chịu tải theo số khách nêu trong ví dụ.
