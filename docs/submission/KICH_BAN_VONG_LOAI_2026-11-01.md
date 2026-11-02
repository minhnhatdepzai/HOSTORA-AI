# HOSTORA AI — kế hoạch và kịch bản vòng loại Đề 01

**Bản diễn tập ngày 01/11/2026, chưa phải hồ sơ đã nộp.** Bảng A được dùng làm mốc vì sản phẩm đang chuẩn bị phần kỹ thuật. BTC xếp hạng Bảng A và Bảng B riêng; chưa công bố số suất đi tiếp của từng bảng. Hạn trên cổng: **23:59 ngày 09/11/2026, giờ Việt Nam**.

## Kết luận kiểm tra

- Bản phát hành mục tiêu là `v2.2.0-r2`. Web typecheck, lint, 273/273 unit/integration, build và AI smoke đạt; Playwright production cách ly đạt 51 lượt, bỏ qua 1 lượt mobile CRUD có chủ đích. Audit 12 màn desktop/mobile có 0 lỗi accessibility tự động, 0 page error và 0 tràn ngang ngày 02/11/2026.
- Ba câu tự nhiên mới về website giới thiệu bán hàng qua Zalo, blog viết về bán hàng và website bán quần áo có thanh toán được phân loại đúng trong một lượt gọi local. Mẫu nhỏ không đại diện mọi câu người dùng.
- APK universal 2.2.0 (versionCode 23) đủ bốn ABI đã cài đè trên emulator, giữ nguyên hội thoại và phản hồi quản trị viên. Bộ TC01–TC09 trước đó trên Redmi Note 8 Pro nằm trong `HOSTORA_MOBILE_9_CASES.html`; ba ca hộp thư AI mới nằm trong `MINH_CHUNG_9_CA.html`.
- GitHub Release 2.2.0 và Source ZIP phải dùng cùng commit. URL HTTPS Quick Tunnel hiện tại mở được nhưng không có cam kết uptime; video cũ 46 giây vẫn không đủ để nộp vì thiếu tiếng và chưa cho thấy thao tác lưu lead/FAQ.
- Điểm tự mô phỏng trước đây khoảng 82–87/100; đây không phải điểm BTC hay xác suất vào top 10. Điểm phản biện, khả năng mở demo từ ngoài mạng và chất lượng bản nộp còn chưa được chấm độc lập.

## Thứ tự trình diễn bắt buộc

| Thứ tự | Yêu cầu Đề 01                           | Màn hình và hành động                                                                                     | Câu nói cần giữ đúng                                                               |
| ------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1      | Form nhu cầu                            | Trang chủ → `/consultation`; mô tả bằng lời, kiểm tra 4 bước loại web, lượt truy cập, ngân sách, tên miền | “Khách kiểm tra và có thể sửa điều AI điền.”                                       |
| 2      | Một gói chính, hai thay thế, giải thích | `/recommendations`; cho thấy 3 thẻ và bấm **Giải thích các gói cho tôi**                                  | “AI giúp hiểu và giải thích; code tính giá và xếp gói.”                            |
| 3      | Bảng so sánh                            | Cuộn đến **So sánh 3 gói**                                                                                | “Giá theo tháng, kỳ trả trước, giá gia hạn và dữ liệu chưa xác minh được tách rõ.” |
| 4      | Đăng ký tư vấn                          | Chọn gói thay thế → điền tên/số thử nghiệm → **Lưu yêu cầu tư vấn**                                       | “Lead chỉ lưu trên trình duyệt này, chưa gửi cho nhân viên.”                       |
| 5      | FAQ accordion                           | Về trang chủ, cuộn đến **Cần rõ thêm điều gì?**, mở hai mục trong danh sách 6 câu                         | “Khách tự xem giải thích mà không cần hỏi lại AI.”                                 |

## Video tối đa 02 phút: lời đọc và thao tác

Quay **một hành trình khách hàng trên web 2.2.0** để đủ năm tính năng. Có thể chèn 3–5 giây app Android 2.2.0 ở đoạn kết; phần đó không thay thế bất kỳ tính năng nào trong năm tính năng. Cắt thời gian chờ model khi dựng, nhưng giữ thao tác và kết quả thật. Dùng phụ đề có tên tính năng 1–5, chữ dễ đọc ở 1080p, giọng nói rõ; kiểm tra tệp xuất cuối **dưới hoặc bằng 120 giây**.

| Thời gian | Thao tác trên màn hình                                                                                                                                   | Lời đọc gợi ý                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:07 | Trang chủ, bấm **Tư vấn chọn hosting**                                                                                                                   | “Một chủ shop muốn có website nhưng chưa biết chọn hosting và tên miền. HOSTORA bắt đầu từ nhu cầu và ngân sách của họ.”                                          |
| 0:07–0:27 | Gõ: “Tôi bán mỹ phẩm online, khoảng 5.000 lượt truy cập mỗi tháng, ngân sách 300.000 đồng mỗi tháng, cần mua tên miền.” Bấm **Điền thông tin giúp tôi**. | “Tôi mô tả bằng tiếng Việt. Ollama chạy local trích xuất dữ kiện; tôi kiểm tra bốn trường trước khi tiếp tục.”                                                    |
| 0:27–0:42 | Đi qua 4 bước, chỉ rõ loại website, lượt truy cập, ngân sách, tên miền, bấm **Xem đề xuất**.                                                             | “Người dùng có thể sửa dự đoán của AI. Ngân sách và nhu cầu tên miền ảnh hưởng trực tiếp tới kết quả.”                                                            |
| 0:42–1:02 | Chỉ một gói ưu tiên và hai thay thế; bấm **Giải thích các gói cho tôi** và cho thấy câu giải thích.                                                      | “HOSTORA đưa một lựa chọn chính và hai phương án thay thế, giải thích bằng lời dễ hiểu. Giá và thứ tự do quy tắc trong mã quyết định, AI không được tự điền giá.” |
| 1:02–1:17 | Cuộn bảng **So sánh 3 gói**, dừng ở giá, dung lượng, băng thông và ô chưa xác minh.                                                                      | “Bảng so sánh cho thấy chi phí kỳ đầu, giá gia hạn và tài nguyên. Dữ liệu chưa có được nói rõ, không đoán.”                                                       |
| 1:17–1:37 | Chọn gói thứ hai; nhập tên **Khách thử nghiệm**, số thử nghiệm `0900000000`; bấm **Lưu yêu cầu tư vấn**, cho thấy thông báo thành công.                  | “Khách chọn gói mình quan tâm rồi lưu yêu cầu. Thông tin này hiện chỉ nằm trong trình duyệt của khách.”                                                           |
| 1:37–1:52 | Về trang chủ, cuộn đến FAQ, mở hai câu. Cho thấy danh sách có ít nhất năm câu.                                                                           | “Sáu câu hỏi thường gặp giải thích hosting, tên miền và chi phí ngay trên trang.”                                                                                 |
| 1:52–2:00 | Khung kết: tên sản phẩm, bản 2.2.0, link demo/source/video đã kiểm tra.                                                                                  | “HOSTORA giúp chủ shop chọn gói có căn cứ và biết rõ điều gì còn phải xác minh.”                                                                                  |

**Trước khi quay:** mở máy chủ và Ollama; làm ấm model bằng một yêu cầu thử; dùng hồ sơ trình duyệt kiểm thử riêng; đặt zoom để nhìn rõ cả gói và bảng; tắt thông báo hệ thống; mở sẵn vị trí FAQ; ghi màn hình thật và thu lời đọc. Không quay số điện thoại hoặc tài khoản khách thật. Kiểm tra video đã xuất bằng cách xem lại toàn bộ, dừng ở từng tính năng và kiểm tra tiếng/phụ đề.

## Demo trực tiếp và 5 phút hỏi đáp

Nếu được demo trực tiếp, dùng cùng hành trình web trong khoảng 3 phút: **vấn đề của chủ shop → AI hiểu câu tự nhiên → xác nhận form → ba gói → bảng so sánh → chọn gói thứ hai và lưu lead → FAQ**. Sau đó dùng khoảng 45 giây cho điểm khác biệt: hỏi “Ngày mai ở Hà Nội có mưa không?” → khách thấy **Đã chuyển quản trị viên** → mở `/admin/support` → trả lời → tab khách hoặc APK tự nhận dòng có nhãn **Quản trị viên HOSTORA**. Kết thúc bằng ca biên `10.000đ/tháng`: hệ thống phải nói **chưa có gói đáp ứng**, chỉ đưa phương án tham khảo.

Thứ tự này giữ đúng năm tính năng của đề trước, rồi mới chứng minh năng lực vận hành AI. Không mở admin trước phần khách hàng: giám khảo cần hiểu vấn đề và giá trị sản phẩm trong 20 giây đầu.

Các câu trả lời ngắn cho phản biện Bảng A:

1. **AI làm gì?** Ollama local đọc mô tả và giải thích kết quả; Zod kiểm tra đầu ra. `lib/recommendation.ts` và `lib/pricing.ts` quyết định thứ tự và số tiền theo catalog.
2. **Vì sao không để AI chọn giá?** Giá, ưu đãi, kỳ hạn và tình trạng tên miền đổi theo nguồn; model có thể bịa. Trường chưa rõ để `null`/“Chưa xác minh”, nguồn và ngày đối chiếu nằm trong catalog.
3. **Khi AI lỗi?** Form bốn bước vẫn dùng được; API trả lỗi dễ hiểu; không tạo lời giải thích hay giá giả. Demo bằng ca sự cố đã kiểm thử, không tắt server giữa phần demo chính.
4. **Lead đi đâu?** Form theo đề lưu `localStorage` trên chính trình duyệt; chưa phải CRM hoặc yêu cầu đã được nhân viên nhận. Hệ thống tài khoản/đơn hàng là luồng mở rộng, trình bày tách biệt.
5. **Đã kiểm thử ra sao?** Nêu 2 ca thường, 2 input sai, 2 ca biên và 3 ca hộp thư AI có dữ liệu/kỳ vọng/kết quả; nói rõ Playwright mobile viewport không chứng minh APK, SMTP mock không chứng minh email thật vào Inbox và bộ test local chưa là khảo sát người dùng.
6. **Dùng AI để xây dựng sản phẩm ra sao?** Chọn một ví dụ có bằng chứng: thử câu phủ định “không cần mua kèm tên miền” → phát hiện sai → sửa hậu xử lý → thêm test hồi quy → chạy lại ca mới. Không dùng số loss fine-tune như bằng chứng chất lượng tư vấn; chatbot v8 chưa được promote.

## Việc phải chốt trước khi nộp

1. **Khóa bản 2.2.0:** chỉ commit các file thuộc bản phát hành; lấy một commit/tag nhất quán. Chạy lại typecheck, lint, test, build, AI và E2E sau khi khóa.
2. **Tạo đúng bộ 2.2.0:** dùng `pnpm package:submission`; tạo ZIP, checksum và link tải từ bản đã khóa. Giải nén ở thư mục sạch rồi thử hướng dẫn chạy từ ZIP, không dựa vào dependency/cache của repo làm việc.
3. **Cập nhật hồ sơ:** README gốc mở đầu bằng Đề 01, bảng thi, 5 tính năng, công nghệ, lệnh chạy, AI thật/Mock, giới hạn và nguồn giá. Giữ `AI_EVIDENCE.md` tối đa một trang và năm trích đoạn thật. `TEST_MATRIX.md`, `MINH_CHUNG_9_CA.html` và báo cáo APK phải cùng commit/artifact cuối.
4. **Quay video mới 2.2.0** theo bảng thời gian trên; đủ năm thao tác thật, có tiếng hoặc phụ đề rõ. Video 2.0.9 hiện tại không đủ để dùng làm minh chứng vòng loại.
5. **Link demo:** ưu tiên URL HTTPS ổn định hoặc xác nhận cổng chấm sẽ chạy từ source. Nếu dùng Quick Tunnel hiện tại, giữ máy/tunnel hoạt động và kiểm tra lại bằng 4G ngay trước khi nộp.
6. **Nguồn giá:** rà website chính thức và ghi ngày mới trong `docs/DATA_SOURCES.md`; catalog hiện dựa trên snapshot 23/10. Nếu giá đã đổi, cập nhật dữ liệu và test lại; nếu chưa xác minh, ghi rõ giới hạn.
7. **Nộp sớm:** hoàn tất xác thực đội/đề/bảng; tải ZIP, video và tài liệu lên nơi BTC có thể mở/tải; thử link bằng trình duyệt ẩn danh; nhập form, bấm nộp, chờ lưu thành công và kiểm tra “Lần nộp gần nhất” trước 23:59 ngày 09/11.

Nguồn quy định: [Tiêu chí chính thức](https://vibecoding.info.vn/tieu-chi-cham-thi), [hướng dẫn nộp](https://vibecoding.info.vn/bai-viet/yeu-cau-dau-ra-va-huong-dan-nop-bai-vibe-coding-2026).
