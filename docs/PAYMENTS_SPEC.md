# Thanh toán dịch vụ HOSTORA — phạm vi triển khai

Khách xem catalog và gửi yêu cầu mua trên HOSTORA cho cả dịch vụ HOSTORA lẫn đối tác. HOSTORA xác nhận giá cuối, kỳ hạn và điều kiện rồi mới tạo hóa đơn; giá “từ” trên catalog không tự trở thành số tiền phải trả. Đơn hàng, hóa đơn, hỗ trợ hủy và hoàn tiền được quản lý tại web HOSTORA. Tích hợp hiện dành cho sandbox vì chưa có tài khoản merchant HOSTORA.

## Luồng khách hàng

1. Khách xem sản phẩm trong catalog của web/app HOSTORA, rồi gửi email nhận xác nhận và ghi chú nhu cầu. Cả web và app gọi cùng API backend; HOSTORA lưu yêu cầu và gửi email xác nhận, còn giá tham khảo không bị thu tự động.
2. Quản trị viên xác nhận báo giá với nhà cung cấp, kỳ hạn, thuế và điều kiện bán; nhập tổng tiền đã chốt để tạo hóa đơn HOSTORA.
3. Khách nhận mã đơn và mã truy cập riêng, mở `/orders` trên web hoặc mục **Đơn hàng** trong app để xem tổng tiền, trạng thái, lịch sử và chính sách.
4. Nếu gateway sandbox đã cấu hình, khách bắt đầu thanh toán từ hóa đơn HOSTORA. Stripe Checkout và VNPay có thể chuyển khách sang trang xử lý bảo mật của gateway; sản phẩm, hóa đơn và trạng thái đơn vẫn được xem và quản lý trên HOSTORA. HOSTORA không nhận số thẻ/CVC.
5. Sau khi quay về HOSTORA, trạng thái có thể hiện đang kiểm tra. Đơn chỉ chuyển thành `paid` khi webhook/IPN hoặc truy vấn trực tiếp tới gateway xác nhận đúng mã đơn, tiền và tiền tệ. Callback lặp không tạo giao dịch mới.
6. Khách có thể yêu cầu hủy trước khi trả tiền hoặc gửi lý do yêu cầu hoàn tiền sau khi trả. Admin xem xét, ghi lý do, duyệt/từ chối; khi duyệt, server gọi hoàn tiền của chính gateway. Trạng thái `refund_pending` khác với `refunded`.

## Luồng quản trị

- Khu vực đơn hàng/hoàn tiền trên web yêu cầu mật khẩu quản trị riêng qua biến môi trường. Không có mật khẩu thì API quản trị từ chối truy cập.
- Trạng thái và biến động tiền được lưu bền vững trên máy HOSTORA bằng SQLite, có audit event và khóa idempotency. Không lưu trong `localStorage`, không gửi PII tới model AI.
- Thông tin liên hệ của yêu cầu mua chỉ dùng để phản hồi/hoàn tất báo giá, nằm trong SQLite cùng dữ liệu đơn và chỉ hiển thị cho admin đã đăng nhập. Yêu cầu cũ hơn 90 ngày được xóa khi admin tải danh sách; thông tin invoice tuân theo thời gian lưu trữ hồ sơ thanh toán.
- Chức năng thanh toán mặc định tắt khi chưa có bộ khóa riêng của HOSTORA. Không sao chép khóa JAPANO hay merchant demo của VNPay. Trước khi thu tiền thật cho dịch vụ đối tác cần có quyền bán/thu hộ, phương thức cấp dịch vụ, giá cuối, quy trình hỗ trợ và hoàn tiền rõ ràng; đồng thời cần tài khoản merchant HOSTORA, HTTPS công khai cho webhook/IPN và quy trình vận hành.
- HOSTORA bán dịch vụ số, nên dùng “hủy dịch vụ/hoàn tiền”. Không có bước vận chuyển hoặc nhận hàng trả về như cửa hàng vật lý JAPANO.

## Giao diện

Giữ ngôn ngữ navy/mint, Be Vietnam Pro, nút và trạng thái như bản 1.8.0. Màn khách ưu tiên mã đơn, số tiền, trạng thái, hành động thanh toán và lịch sử. Màn admin ưu tiên danh sách đơn, thanh toán chờ đối soát và yêu cầu hoàn tiền; trên điện thoại các hàng chuyển thành thẻ nội dung thay vì bảng tràn ngang. Tất cả nhãn tiếng Việt, có trạng thái lỗi/tải/không cấu hình và hỗ trợ reduced motion.
