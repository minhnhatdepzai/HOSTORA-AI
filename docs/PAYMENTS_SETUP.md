# Thiết lập thanh toán sandbox HOSTORA

## Trạng thái hiện tại

Khách xem catalog, gửi yêu cầu mua và theo dõi hóa đơn trên website hoặc app HOSTORA. Website, app và trang quản trị gọi cùng backend; yêu cầu và hóa đơn lưu trong một SQLite trên máy chạy web. Quản trị viên xem yêu cầu tại `/admin/orders`, xác nhận giá cuối rồi tạo hóa đơn. Trang `/admin` và `/admin/orders` tự đồng bộ trạng thái đơn mỗi 5 giây khi đang mở. Khách dùng `/orders` hoặc mục **Đơn hàng** trong app để xem và bắt đầu thanh toán. Khi thanh toán, Stripe/VNPay có thể mở trang xử lý bảo mật riêng; khách quay lại HOSTORA để xem trạng thái và lịch sử đơn. Hai cổng mặc định **tắt** vì HOSTORA chưa có tài khoản merchant; dự án không chứa khóa của JAPANO.

## Cấu hình riêng trên máy HOSTORA

Tham khảo `.env.example`. Khi SMTP đã cấu hình, quản trị viên có thể mở `/admin/orders`, bấm **Gửi mã qua email quản trị** và đăng nhập bằng mã 6 số dùng một lần. Có thể cấu hình thêm `HOSTORA_ADMIN_PASSWORD` (tối thiểu 16 ký tự) và `HOSTORA_ADMIN_SESSION_SECRET` ngẫu nhiên (tối thiểu 32 ký tự) làm phương án dự phòng. Chọn dịch vụ HOSTORA hoặc đối tác, ghi rõ nhà cung cấp, tên dịch vụ và tổng tiền VND. Sau khi xác nhận báo giá, backend tự gửi mã đơn và liên kết truy cập riêng cho khách; mã truy cập không xuất hiện trong URL query hay log máy chủ.

Yêu cầu mua qua catalog chưa thu tiền. Admin xác nhận giá đã gồm đúng kỳ hạn/thuế/điều kiện rồi bấm **Xác nhận giá & tạo hóa đơn**. Khách mở `/orders` hoặc màn **Đơn hàng** trên app để xem hóa đơn và bắt đầu thanh toán. Khi chưa có cổng, giao diện báo “chưa cấu hình”, không tự đánh dấu đã trả. Khách có thể yêu cầu hủy khi đơn đang chờ hoặc yêu cầu hoàn sau khi đơn được xác nhận đã thanh toán. Quản trị viên ghi chú và duyệt/từ chối tại `/admin/orders`.

Email khách được lưu trong SQLite để admin xử lý và gửi xác nhận; không gửi tới AI hoặc Langfuse. Yêu cầu quá 90 ngày bị xóa khi admin tải lại danh sách.

## Email tự động

Backend gửi email khi nhận yêu cầu mua, khi admin tạo hóa đơn và khi trạng thái thanh toán/hủy/hoàn tiền thay đổi. Cấu hình SMTP trong `.env.local` bằng các biến `HOSTORA_SMTP_HOST`, `HOSTORA_SMTP_PORT`, `HOSTORA_SMTP_SECURE`, `HOSTORA_SMTP_USER`, `HOSTORA_SMTP_PASSWORD`, `HOSTORA_EMAIL_FROM` và `HOSTORA_ORDER_NOTIFICATION_EMAIL`; có thể thêm `HOSTORA_EMAIL_REPLY_TO`. Với Gmail hoặc Microsoft, dùng mật khẩu ứng dụng hoặc SMTP credential riêng, không dùng mật khẩu đăng nhập chính.

Gửi mail chạy phía sau phản hồi HTTP nên lỗi SMTP không làm mất yêu cầu mua. `/admin/orders` luôn hiện SMTP đã sẵn sàng hay chưa. Khi chưa cấu hình, đơn vẫn được lưu và admin phải gửi mã đơn/mã truy cập thủ công. `HOSTORA_PUBLIC_BASE_URL` phải là origin HTTPS mà khách truy cập được để nút trong email mở đúng `/orders`.

### Để email ít vào thư rác

Giao diện email đẹp không quyết định hộp thư đến. Trước khi gửi thật, dùng địa chỉ gửi thuộc tên miền HOSTORA và cấu hình DNS tại nhà cung cấp tên miền:

1. Thêm bản ghi SPF đúng theo nhà cung cấp SMTP; chỉ duy trì một bản ghi SPF cho tên miền.
2. Bật DKIM trong bảng quản trị SMTP và thêm đúng bản ghi selector mà nhà cung cấp cấp.
3. Thêm DMARC ở `_dmarc.<ten-mien>`; bắt đầu với `p=none`, nhận báo cáo rồi mới tăng lên `quarantine` hoặc `reject`.
4. Đặt `HOSTORA_EMAIL_FROM` và `HOSTORA_EMAIL_REPLY_TO` cùng tên miền đã xác thực. Không giả mạo địa chỉ Gmail cá nhân ở trường From.
5. Chỉ gửi email giao dịch cho người vừa tạo yêu cầu/đơn; không trộn nội dung quảng cáo hàng loạt vào email hóa đơn.
6. Gửi thử tới Gmail và Outlook, kiểm tra **Hiển thị bản gốc** phải có SPF, DKIM và DMARC là `PASS`. Nếu thư thử vào Spam, đánh dấu **Không phải thư rác** rồi sửa xác thực/tần suất trước khi gửi cho khách.

Email HOSTORA có bản văn bản thuần, preheader, mã tham chiếu, nút xem/hủy trên HOSTORA và header hạn chế auto-reply. Những phần này giúp tính rõ ràng và khả năng tương thích nhưng không thay thế SPF/DKIM/DMARC hay uy tín tên miền.

## Voucher khách hàng quay lại

- Cổng thanh toán phải xác nhận một đơn có số tiền thực trả từ **1.000.000đ** thì backend mới phát voucher **100.000đ**.
- Voucher dùng cho đơn tiếp theo có giá trước giảm từ **1.000.000đ**, hiệu lực **30 ngày**, chỉ dùng một lần.
- Callback thanh toán lặp không phát voucher trùng.
- Hủy hóa đơn chưa thanh toán sẽ trả lại voucher đã áp dụng. Khi hoàn tiền hoàn tất, voucher dùng trong đơn được trả lại nếu còn hạn và voucher thưởng từ đơn bị hoàn không còn hiệu lực.
- Giá, giảm giá và điều kiện voucher được tính trong backend; AI không được thay đổi các con số này.

## Stripe Test Mode

Đăng ký tài khoản Stripe riêng cho HOSTORA; lấy `sk_test_...` và webhook signing secret `whsec_...`, đặt `HOSTORA_PAYMENTS_MODE=sandbox`, `HOSTORA_PUBLIC_BASE_URL` tới origin HTTPS công khai của HOSTORA. Webhook đích là `/api/payments/stripe/webhook`. Đăng ký ít nhất sự kiện `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `refund.created`, `refund.updated`. Trang quay về không xác nhận đơn; webhook hoặc thao tác **Đối soát** truy vấn Checkout tại Stripe, kiểm mã đơn, tiền và VND trước khi ghi nhận. API hoàn tiền gửi đúng PaymentIntent của Checkout và dùng mã idempotency theo lần duyệt.

## VNPay Sandbox

Xin `TMN_CODE` và `HASH_SECRET` riêng của HOSTORA từ VNPay. Đặt `HOSTORA_VNPAY_TMN_CODE`, `HOSTORA_VNPAY_HASH_SECRET`, `HOSTORA_VNPAY_RETURN_URL=https://<host>/api/payments/vnpay/return`; mặc định pay URL và Merchant Web API trỏ sandbox. Đăng ký IPN URL `/api/payments/vnpay/ipn` với VNPay. Máy chạy web cần địa chỉ HTTPS công khai để IPN tới được. Return URL chỉ dẫn về màn đơn; IPN có HMAC SHA512 hợp lệ hoặc **Đối soát** qua Merchant Web API mới xác nhận đã trả. Tiền VNPay được đổi sang đơn vị ×100; số tiền hóa đơn luôn lấy từ SQLite.

Hoàn tiền VNPay được ghi **đang hoàn tiền** khi cổng mới tiếp nhận yêu cầu. Chỉ khi phản hồi có chữ ký và trạng thái hoàn tất, hoặc đối soát xác nhận giao dịch hoàn, hệ thống mới ghi **đã hoàn tiền**. Nếu cổng timeout, giữ trạng thái chờ và đối soát trước khi thao tác lại.

## Giới hạn khi chưa có merchant

Test tự động kiểm chữ ký, số tiền, gọi lặp và chuyển trạng thái bằng dữ liệu thử. Chúng không chứng minh giao dịch tiền thật hoặc callback từ Stripe/VNPay tới host công khai. Trước khi bật dịch vụ đối tác, HOSTORA cần thỏa thuận quyền bán/thu hộ và quy trình hỗ trợ, hủy, hoàn tiền với bên cung cấp. Dịch vụ số không có luồng vận chuyển/trả hàng vật lý.

Nguồn kỹ thuật: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [Stripe webhooks](https://docs.stripe.com/webhooks), [VNPay Pay/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [VNPay querydr/refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).
