# Thiết kế trung tâm quản trị HOSTORA

## Mục đích

Biến `/admin` thành trung tâm vận hành thật của HOSTORA. Mọi nhân viên phải đăng nhập bằng email đã được cấp quyền và mã dùng một lần. Super admin quản lý danh sách nhân viên và bảo mật; admin vận hành công việc hằng ngày. Dịch vụ, giá, bài viết, trang nội dung, menu, SEO, thông tin liên hệ, nội dung trợ lý AI an toàn, hình ảnh thương hiệu, đơn hàng và khách hàng dùng chung một nguồn dữ liệu để website và ứng dụng cập nhật nhất quán.

## Mục tiêu

- Bảo vệ toàn bộ `/admin/*` và `/api/admin/*` trước khi tải dữ liệu quản trị.
- Mỗi nhân viên có email riêng; không dùng chung mật khẩu.
- Super admin có thể thêm, khóa hoặc xóa quyền admin; quyền bị thu hồi có hiệu lực với cả phiên đang mở.
- Admin thường quản lý nội dung, dịch vụ, giá, bài viết, ảnh và đơn hàng nhưng không quản lý nhân viên hoặc cấu hình bảo mật.
- Cho phép nhiều super admin để tránh phụ thuộc một người, nhưng không bao giờ cho thu hồi hoặc hạ quyền super admin đang hoạt động cuối cùng.
- Admin quản lý trang chủ, trang nội dung, menu, SEO, thông tin liên hệ và phần nội dung được phép hiển thị trong trợ lý AI qua quy trình nháp, xem trước và xuất bản.
- Website và app đọc sản phẩm, bài viết và cấu hình thương hiệu từ cùng API.
- Mọi thay đổi quan trọng lưu người thực hiện, thời gian và dữ liệu trước/sau.
- Giữ dữ liệu thương mại có nguồn, ngày kiểm tra và trạng thái chưa rõ; không cho giao diện quản trị tự bịa giá.
- Giao diện phù hợp hàng nghìn bản ghi: tìm kiếm, lọc, sắp xếp, phân trang và thao tác hàng loạt có kiểm soát.

## Không làm trong đợt này

- Không đưa dữ liệu hoặc đăng nhập lên dịch vụ đám mây.
- Không tạo giao diện tự cấu hình quyền tùy ý; người dùng chỉ thấy hai vai trò `super_admin` và `admin`. Bên trong máy chủ vẫn kiểm tra theo nhóm năng lực có tên rõ ràng để tránh một API được cấp quyền quá rộng.
- Không cho quản trị viên sửa trực tiếp công thức gợi ý, quy tắc giá hoặc mã hệ thống.
- Không cho CMS sửa secret, khóa Stripe/VNPay, SMTP, địa chỉ Ollama, model, system prompt hoặc guardrail.
- Không biến upload ảnh thành kho tệp tổng quát.

## Điều cần tránh

- Trang `/admin` vẫn mở được khi chưa đăng nhập.
- Chỉ ẩn nút trên giao diện nhưng API vẫn cho phép gọi trực tiếp.
- App, website và admin có ba bản dữ liệu khác nhau.
- Xóa nhân viên nhưng cookie cũ vẫn còn quyền.
- Vô tình thu hồi super admin cuối cùng và khóa toàn bộ hệ thống.
- Xóa dịch vụ hoặc bài viết vĩnh viễn chỉ bằng một lần bấm nhầm.
- Số liệu tổng quan giả hoặc lấy từ localStorage của một trình duyệt.

## Phương án đã cân nhắc

### 1. SQLite dùng chung trong HOSTORA — được chọn

Lưu tài khoản quản trị, phiên đăng nhập, nội dung, dịch vụ, bài viết, cấu hình thương hiệu và nhật ký trong SQLite. Website và app đọc qua API HOSTORA. Phương án này phù hợp yêu cầu local first, không phát sinh dịch vụ bên ngoài, hỗ trợ giao dịch và lịch sử thay đổi.

### 2. Tiếp tục dùng TypeScript/JSON

Ít thay đổi ban đầu nhưng cần build lại, dễ ghi đè khi nhiều người sửa, khó thu hồi phiên và khó lưu lịch sử. Không phù hợp mục tiêu vận hành thật.

### 3. CMS bên ngoài

Có nhiều chức năng sẵn nhưng phụ thuộc mạng, thêm chi phí và làm dữ liệu rời khỏi HOSTORA local. Không được chọn.

## Kiến trúc dữ liệu

Sử dụng một tệp SQLite vận hành tại `data/runtime/hostora.sqlite`. Dữ liệu thanh toán hiện có được di chuyển an toàn từ `payments.sqlite` nếu cần; quá trình khởi tạo phải idempotent và không ghi đè bản ghi đang có.

### `admin_users`

- `id`, `email` chuẩn hóa và duy nhất, `display_name`
- `avatar_asset_id` tùy chọn, tham chiếu ảnh hồ sơ nhân viên
- `role`: `super_admin` hoặc `admin`
- `status`: `active` hoặc `revoked`
- `session_version`: tăng mỗi khi thu hồi quyền để vô hiệu hóa phiên cũ
- `created_at`, `updated_at`, `last_login_at`, `invited_by`

Email nhận thông báo quản trị đang cấu hình được seed làm super admin đầu tiên khi bảng chưa có người dùng. Việc seed không tự đổi vai trò sau khi hệ thống đã khởi tạo.

Hệ thống cho phép nhiều super admin. API phải từ chối thao tác tự thu hồi, tự hạ quyền hoặc thu hồi/hạ quyền nếu mục tiêu là super admin hoạt động cuối cùng.

### `admin_login_codes`

- Mỗi email có mã băm riêng, hạn 10 phút, tối đa 5 lần nhập.
- Giới hạn gửi lại theo email và theo địa chỉ mạng.
- Phản hồi yêu cầu mã không tiết lộ email có nằm trong danh sách hay không.

### `admin_sessions`

- Phiên có định danh ngẫu nhiên, lưu bản băm, `user_id`, `session_version`, hạn dùng và thời điểm hoạt động gần nhất.
- Cookie `HttpOnly`, `SameSite=Strict`, đường dẫn `/`; bật `Secure` khi chạy HTTPS.
- Thu hồi người dùng hoặc đăng xuất sẽ xóa phiên trong cơ sở dữ liệu.

### `catalog_products`

- Giữ các trường đang dùng: mã, nhà cung cấp, tên, danh mục, giá từ, đơn vị tính, mô tả, đối tượng phù hợp, nguồn, ngày kiểm tra và ghi chú giá.
- Thêm `status`: `draft`, `published`, `archived`; `sort_order`, `created_at`, `updated_at`.
- Xóa trong giao diện là chuyển sang `archived`. Chỉ super admin mới được xóa vĩnh viễn khi không có đơn/yêu cầu liên quan.

### `hosting_plans`

- Giữ riêng cấu trúc định lượng mà bộ gợi ý đang dùng.
- Admin được sửa dữ liệu thương mại đã định nghĩa; schema và công thức trong `lib/recommendation.ts`, `lib/pricing.ts`, `lib/scenario.ts` vẫn do mã nguồn kiểm soát.
- Mọi thay đổi giá bắt buộc có nguồn và ngày kiểm tra.

### `journal_articles`

- `slug`, chặng, tiêu đề, tóm tắt, số phút đọc, nội dung section dạng JSON đã validate, hành động cuối bài, trạng thái, ngày xuất bản và thứ tự.
- Hỗ trợ bản nháp, xem trước, xuất bản, ẩn và lưu phiên bản gần nhất trong nhật ký.

### `pages`, `navigation_items` và `seo_entries`

- `pages` quản lý trang chủ và các trang nội dung theo `slug`, các section có schema, trạng thái `draft`, `published`, `archived`, thời điểm xuất bản và phiên bản.
- `navigation_items` quản lý menu web/app theo vị trí, nhãn, liên kết nội bộ đã kiểm tra, thứ tự và trạng thái. Không nhận URL/script tùy ý.
- `seo_entries` quản lý tiêu đề, mô tả, canonical nội bộ, ảnh chia sẻ và trạng thái index cho từng trang/bài viết; độ dài và định dạng được validate.
- Thay đổi đã xuất bản tạo bản nháp mới; website/app chỉ nhận phiên bản published. Xem trước dùng URL có token ngắn hạn và không được lập chỉ mục.

### `customer_leads`

- Lưu nhu cầu tư vấn, thông tin doanh nghiệp, sản phẩm quan tâm, kênh liên hệ, thời gian tư vấn khách chọn, trạng thái xử lý, người phụ trách và thời điểm cập nhật.
- Dữ liệu mới được ghi thẳng vào SQLite qua API có schema và giới hạn; không tiếp tục phụ thuộc localStorage của từng trình duyệt.
- Dữ liệu localStorage cũ được nhập bằng công cụ có bước xem trước, chuẩn hóa và chống trùng; không tự động xóa bản cũ cho đến khi người quản trị xác nhận kết quả.

### `site_settings` và `media_assets`

- Lưu tên thương hiệu, mô tả ngắn, logo, favicon, ảnh chia sẻ mặc định, địa chỉ, email, số điện thoại, giờ làm việc, liên kết mạng xã hội và các nội dung nhận diện được phép sửa.
- `media_assets` phân biệt ảnh thương hiệu, ảnh nội dung và avatar nhân viên; lưu người tải lên, MIME, kích thước, checksum, trạng thái sử dụng và văn bản thay thế.
- Ảnh tải lên được kiểm tra loại MIME, dung lượng và kích thước; đổi tên ngẫu nhiên rồi lưu dưới `data/runtime/uploads`.
- API media chỉ phục vụ tệp đã đăng ký trong cơ sở dữ liệu; không nhận đường dẫn tùy ý.
- App lấy cấu hình thương hiệu qua API và lưu cache; icon cài đặt của APK vẫn cần build bản app mới vì Android/iOS đóng gói icon trong ứng dụng.

### `ai_content_settings`

- Chỉ lưu lời chào, câu hỏi gợi ý, hành động gợi ý và các nguồn kiến thức đã được duyệt cho chatbot/studio.
- Nội dung có trạng thái nháp, xem trước và xuất bản; dữ liệu nguồn vẫn được xem là không tin cậy và đi qua bộ lọc RAG hiện có.
- Không lưu hoặc cho chỉnh model, Ollama URL, system prompt, guardrail, công thức gợi ý, giá, khuyến mại hay availability tên miền.

### `admin_audit_log`

- `actor_user_id`, hành động, loại đối tượng, mã đối tượng, dữ liệu trước/sau đã lọc, thời gian và địa chỉ mạng rút gọn.
- Không ghi mã OTP, cookie, mật khẩu SMTP hoặc dữ liệu thẻ.
- Chỉ super admin xem toàn bộ nhật ký; admin thường xem lịch sử của nội dung đang chỉnh sửa.

### `outbox_jobs`

- Lưu tác vụ cần hoàn tất sau khi giao dịch chính đã thành công: gửi email, vô hiệu hóa cache, xử lý kết quả thanh toán và thông báo nội bộ.
- Tác vụ có loại, payload đã lọc, khóa chống trùng, số lần thử, thời điểm thử tiếp theo, trạng thái và lỗi cuối đã rút gọn.
- Worker xử lý nền có retry theo khoảng tăng dần; một tác vụ chạy lại không được tạo email, hoàn tiền hoặc đơn hàng trùng.
- Ghi đơn hàng và tạo tác vụ outbox trong cùng transaction để không có trạng thái “đã mua nhưng mất email vì request bị ngắt”.

## Xác thực và phân quyền

1. Người dùng mở bất kỳ `/admin/*` nào.
2. Layout phía máy chủ kiểm tra cookie và phiên trong SQLite.
3. Nếu chưa hợp lệ, chuyển tới `/admin/login?next=...` trước khi render nội dung quản trị.
4. Người dùng nhập email; hệ thống chỉ gửi mã nếu email đang hoạt động nhưng luôn trả thông báo chung.
5. Nhập đúng mã sẽ tạo phiên gắn với `user_id`, vai trò và `session_version`.
6. Mỗi API quản trị gọi cùng một hàm `requireAdmin`; API quản lý nhân viên gọi `requireSuperAdmin`.
7. Khi super admin thu hồi quyền, `status` đổi thành `revoked`, `session_version` tăng và mọi phiên của người đó bị xóa.

Hai vai trò được ánh xạ tới các năng lực máy chủ như `orders:manage`, `catalog:publish`, `content:publish`, `customers:manage`, `brand:manage`, `staff:manage` và `audit:read_all`. Giao diện chỉ giúp thao tác dễ hiểu; API luôn là nơi quyết định cuối cùng.

Trang đăng nhập dùng email OTP là con đường duy nhất. Luồng mật khẩu quản trị cũ được loại khỏi giao diện và endpoint sau khi super admin đầu tiên đã seed thành công.

## API

- `/api/admin/auth/request-code`, `/verify-code`, `/session`, `/logout`
- `/api/admin/users` và `/api/admin/users/[id]` chỉ dành cho super admin
- `/api/admin/catalog/products` và `/[id]`
- `/api/admin/catalog/plans` và `/[id]`
- `/api/admin/journal` và `/[id]`
- `/api/admin/pages`, `/navigation`, `/seo` và các route `preview`/`publish`
- `/api/admin/customers` và `/api/admin/customers/import`
- `/api/admin/settings/brand`, `/contact` và `/ai-content`
- `/api/admin/media`
- `/api/admin/audit`
- Giữ API đơn hàng hiện tại nhưng chuyển sang cơ chế `requireAdmin` chung.
- API công khai `/api/products`, `/api/journal`, `/api/pages`, `/api/navigation`, `/api/seo`, `/api/brand` và `/api/ai-content` chỉ trả bản ghi đã xuất bản.

Input ngoài hệ thống phải dùng Zod, giới hạn kích thước body và trả lỗi tiếng Việt không lộ stack trace. Mọi mutation kiểm tra `Origin`, quyền người dùng và ghi audit trong cùng transaction.

## Mô hình vận hành được chọn

HOSTORA tiếp tục là một ứng dụng nguyên khối có chia module rõ ràng: một bản triển khai, một lớp API, một nguồn dữ liệu và worker nền riêng. Đây là lựa chọn tốt hơn microservice/Kafka cho một máy chủ hiện tại vì ít điểm hỏng, dễ sao lưu và vẫn giữ được ranh giới module để tách sau này.

- SQLite bật WAL, `busy_timeout`, foreign key, transaction ngắn và index theo các truy vấn danh sách/lọc thực tế.
- Request quan trọng có mã liên kết để đối chiếu log, audit và outbox nhưng không ghi PII hoặc secret vào log.
- Email, cập nhật cache và hậu xử lý thanh toán chạy qua outbox có retry; API trả kết quả sau khi dữ liệu chính đã được lưu chắc chắn.
- Dashboard chỉ hiển thị dữ liệu đo được; cảnh báo gồm job thất bại, email chờ lâu, lỗi thanh toán và dung lượng sao lưu.
- Sao lưu có phiên bản và phải thử khôi phục định kỳ; một file backup chưa từng restore không được xem là đã bảo vệ dữ liệu.
- Chuyển repository sang PostgreSQL khi cần nhiều application node, triển khai trên nhiều máy, high availability hoặc khi đo được write contention kéo dài. Không thêm database phân tán chỉ vì dự đoán lưu lượng.

## Giao diện quản trị

### Hướng mỹ thuật

Đây là bàn điều hành cho người làm việc cả ngày: nền sáng trung tính, thanh điều hướng navy, typography Be Vietnam Pro, mật độ thông tin vừa phải. Xanh HOSTORA dành cho hành động chính và trạng thái thành công; vàng dành cho dữ liệu cần kiểm tra; đỏ chỉ dùng cho thu hồi quyền và lưu trữ. Không dùng các khối thống kê giả, gradient tím hoặc card bo tròn lặp lại.

### Cấu trúc

- Thanh trái: Tổng quan, Đơn hàng, Khách hàng, Dịch vụ, Gói lưu trữ, Nội dung, Bài viết, Menu, SEO, Trợ lý AI, Thương hiệu, Nhân viên, Nhật ký.
- Header: tìm nhanh, trạng thái đồng bộ, người đang đăng nhập và đăng xuất.
- Tổng quan chỉ hiển thị số liệu thật từ SQLite cùng hàng việc cần xử lý.
- Danh sách dùng bảng có tìm kiếm, bộ lọc, sắp xếp và phân trang.
- Form chỉnh sửa mở ở trang chi tiết hoặc panel rộng; có trạng thái chưa lưu, validate tại trường và nút xem trước.
- Nội dung có thanh trạng thái rõ: Bản nháp, Chờ kiểm tra, Đã xuất bản, Đã lưu trữ; nút xuất bản luôn cho xem phần thay đổi trước khi xác nhận.
- Ảnh thương hiệu và avatar nhân viên có mục đích, kích thước khuyến nghị, crop preview và văn bản thay thế; không dùng một trường “ảnh đại diện” mơ hồ.
- Mobile admin ưu tiên danh sách và hành động chính; bảng chuyển thành từng hàng nội dung có nhãn, không ép cuộn ngang toàn trang.

## Đồng bộ website và app

- Website đọc dữ liệu runtime từ lớp repository dùng chung thay vì import mảng tĩnh trong các trang động; trang, menu, SEO, liên hệ và nội dung trợ lý AI cũng đi qua lớp này.
- App tiếp tục gọi `/api/products` và `/api/journal`; thêm `/api/brand`. Khi mất mạng, app dùng cache gần nhất và dữ liệu đóng gói làm phương án cuối.
- Sau mutation, API vô hiệu hóa cache website phù hợp. API công khai dùng ETag hoặc thời gian cập nhật để app tránh tải lại dữ liệu không đổi.
- Dữ liệu mặc định hiện tại được seed một lần vào SQLite. File TypeScript/JSON chỉ còn vai trò seed và fallback, không tiếp tục là nguồn chỉnh sửa chính.
- Yêu cầu mua lưu snapshot tên, nhà cung cấp và giá tại thời điểm đặt để lịch sử không đổi khi catalog được sửa sau đó.
- Một thao tác xuất bản cập nhật dữ liệu và phiên bản trong cùng transaction, sau đó mới vô hiệu hóa cache. Nếu vô hiệu hóa cache lỗi, dữ liệu vẫn đúng và hệ thống ghi việc cần thử lại.

## Di chuyển dữ liệu

1. Sao lưu SQLite hiện tại trước migration.
2. Tạo bảng mới bằng migration có phiên bản.
3. Seed sản phẩm, gói hosting và bài viết hiện có nếu bảng tương ứng đang trống.
4. Seed super admin từ email quản trị hiện tại nếu chưa có người dùng.
5. Cung cấp màn hình nhập lead cũ từ localStorage: xem trước, phát hiện trùng, nhập có audit và giữ bản gốc cho đến khi xác nhận.
6. Chuyển API đọc sang repository mới.
7. Chuyển admin và API ghi sang repository mới.
8. Kiểm tra website, app và admin cùng nhìn thấy một thay đổi thử nghiệm; sau đó hoàn nguyên bản ghi thử.

## Khả năng phục hồi

- Mutation dùng transaction; không để trạng thái nội dung và audit lệch nhau.
- Có xuất bản sao SQLite và thư mục ảnh từ trang super admin.
- Lưu trữ mềm là mặc định; phục hồi được sản phẩm, bài viết và nhân viên bị thu hồi.
- Không cho thao tác nhân sự làm hệ thống còn 0 super admin hoạt động.
- Nếu migration lỗi, dừng khởi động với thông báo rõ và giữ nguyên tệp sao lưu.

## Kiểm chứng hoàn thành

- Người chưa đăng nhập không đọc được bất kỳ trang hoặc API quản trị nào.
- Mã OTP chỉ đến email admin đang hoạt động; mã hết hạn, dùng lại và thử quá số lần đều bị từ chối.
- Admin thường không gọi được API nhân viên kể cả khi tự gửi request.
- Không thể tự thu hồi chính mình hoặc thu hồi/hạ quyền super admin hoạt động cuối cùng; super admin thứ hai có thể thu hồi người thứ nhất.
- Thu hồi quyền làm phiên đang mở mất hiệu lực ở request kế tiếp.
- Thêm/sửa/lưu trữ dịch vụ trong admin cập nhật website và app qua cùng API.
- Thêm/sửa/xuất bản bài viết cập nhật web và app; bản nháp không xuất hiện công khai.
- Trang, menu, SEO, liên hệ và nội dung trợ lý AI đi qua nháp/xem trước/xuất bản; bản nháp và preview không xuất hiện trong API công khai hoặc sitemap.
- Nhập lead cũ hiển thị preview và chống trùng; lead mới xuất hiện trên admin từ mọi web/app dùng chung API.
- Đổi logo/ảnh thương hiệu và avatar nhân viên cập nhật đúng nơi dùng nội dung động; giới hạn icon APK được ghi rõ trong giao diện.
- Đơn hàng, hoàn tiền và email hiện tại vẫn hoạt động.
- Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm ai:check`.
- Dùng Playwright kiểm tra đăng nhập, phân quyền, CRUD và giao diện desktop/mobile; dùng ADB kiểm tra catalog và bài viết trên Redmi.

## Các quyết định đã chốt

- SQLite local là nguồn dữ liệu vận hành.
- Có hai vai trò: super admin và admin.
- Admin thường quản lý nội dung và đơn hàng; quản lý nhân viên và bảo mật chỉ dành cho super admin.
- Mỗi nhân viên dùng email riêng và mã đăng nhập dùng một lần.
- Cho phép nhiều super admin; không thể tự thu hồi hoặc loại bỏ super admin cuối cùng.
- Admin được quản lý trang, menu, SEO, liên hệ và nội dung AI an toàn; secret, model, prompt hệ thống, guardrail và công thức tất định nằm ngoài CMS.
- Dữ liệu lead cũ được nhập có xem trước/chống trùng; dữ liệu mới đi thẳng vào SQLite.
- Ảnh thương hiệu và avatar nhân viên là hai loại tài sản riêng.

## Tham khảo mô hình vận hành

- Shopify staff roles và quyền theo vai trò: <https://help.shopify.com/en/manual/your-account/users/roles>
- Contentful quyền nội dung và vòng đời draft/publish/archive: <https://www.contentful.com/help/roles/space-roles-and-permissions/allow-and-deny-rules/>
- Vercel tách owner/member/project roles: <https://vercel.com/docs/rbac/access-roles>
- WordPress roles và capabilities: <https://wordpress.org/documentation/article/roles-and-capabilities/>

HOSTORA áp dụng các nguyên tắc chung này nhưng giữ SQLite local cho một máy chủ hiện tại. Lớp repository và API được tách khỏi SQLite để có thể chuyển sang PostgreSQL khi cần chạy nhiều máy chủ đồng thời, mà không phải thay lại giao diện web/app.

## Trạng thái kiểm chứng ngày 2026-10-28

### Đã kiểm chứng trong giai đoạn hiện tại

- Email yêu cầu mua, hóa đơn, thanh toán, hủy và hoàn tiền chỉ gửi tới email khách; email quản trị chỉ còn dùng cho mã đăng nhập.
- `/admin` và `/admin/orders` đều chuyển tới `/admin/login` trước khi hiển thị dữ liệu khi chưa có phiên hợp lệ.
- Dashboard lấy đơn và doanh thu từ SQLite, so sánh kỳ trước và dự báo bằng thống kê tất định; khi thiếu dữ liệu không tự tạo số.
- Quản trị có thể tìm, thêm, sửa, xuất bản và lưu trữ mềm dịch vụ. `/api/products`, website và app đọc cùng danh mục đã xuất bản.
- API tạo yêu cầu mua cũng đọc cùng danh mục runtime, nên dịch vụ mới xuất bản từ quản trị có thể đặt mua; lỗi đầu vào trả tên trường tiếng Việt mà không trả stack trace.
- Playwright desktop/mobile kiểm tra đăng nhập, dashboard, biểu đồ, kéo cảnh 3D và CRUD dịch vụ: 7 bài đạt, 1 bài CRUD mobile được bỏ qua có chủ ý vì cùng API/hành vi đã được kiểm tra ở desktop.
- Redmi Note 8 Pro `ylbilfx8ors475kf` tạo yêu cầu `HSR-30A495225D` thành công, hiện banner, badge chưa đọc và mục thông báo trong trung tâm có cảnh 3D kéo tay. Bản ghi tương ứng tồn tại trong `data/runtime/payments.sqlite`.
- `pnpm typecheck`, `pnpm lint`, 147 bài Vitest, `pnpm build`, `pnpm ai:check`, mobile typecheck/lint/web export và `git diff --check` đều đạt.

### Chưa được tuyên bố hoàn thành trong giai đoạn này

- Mô hình nhiều nhân viên, super admin, thu hồi quyền, audit log, outbox bền vững và CMS đầy đủ cho bài viết/menu/SEO/thương hiệu vẫn là thiết kế đích ở phần trên, chưa có kiểm chứng end-to-end trong giai đoạn này.
- Kết quả `ai:check` chỉ chứng minh đường chạy local hiện hoạt động với model đã cấu hình; không phải bằng chứng chất lượng tư vấn hoặc độ chính xác dự báo kinh doanh.
- SMTP tới hộp thư thật phụ thuộc nhà cung cấp và khả năng vào thư rác. Kiểm thử tự động đã chứng minh danh sách người nhận trong mã, nhưng không dùng email admin để thử gửi đơn thật.
