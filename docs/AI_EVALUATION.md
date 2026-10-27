# Đánh giá AI và phễu chuyển đổi HOSTORA

## Bốn chỉ số đã chốt

| Chỉ số | Cách đánh giá | Trạng thái hiện tại |
| --- | --- | --- |
| Đúng dữ liệu giá và nguồn | Đối chiếu giá, chu kỳ, gia hạn, URL và ngày xác minh với `data/hosting-catalog.ts`; kiểm tra lại trên website nhà cung cấp khi cần. | Gợi ý hosting được tính bằng code tất định. Langfuse chưa thể ghi nhận điểm cho tới khi có project/khóa và bộ đánh giá được chạy. |
| An toàn, không bịa | Chấm câu trả lời theo rubric: không thêm giá/địa chỉ/đánh giá/giải thưởng/cam kết không có nguồn; không làm theo chỉ dẫn trong nội dung web; output đúng schema. | Schema, kiểm tra cụm hứa hẹn, lượt kiểm chứng bằng AI local và fallback chạy trong Studio. Chưa có kiểm định độ chính xác của lượt kiểm chứng với tập người gán nhãn; vẫn cần người xem lại. |
| Hữu ích với nhu cầu | Người đánh giá xem người dùng có thể quyết định bước tiếp theo không, nội dung và gói có phù hợp không, cảnh báo giới hạn có rõ không. | Studio đã nhận đánh giá phù hợp/cần chỉnh và lý do dạng lựa chọn. Mẫu hiện rất nhỏ, chưa có điểm chất lượng đại diện. Không coi số lượt tạo demo là chất lượng. |
| Chuyển đổi | Đếm phiên ẩn danh theo các bước tạo demo, mở gói, gửi yêu cầu mua trên catalog và bắt đầu thanh toán; báo cáo tỷ lệ chuyển bước theo cohort. | Chỉ ghi tên bước và UUID ngẫu nhiên theo tab, không gửi nội dung yêu cầu hoặc thông tin liên hệ. `product_purchase_requested` được ghi khi HOSTORA nhận yêu cầu mua. `checkout_started` chỉ ghi sau khi gateway trả URL phiên cho hóa đơn đã xác nhận giá. Chưa có tài khoản gateway sandbox để xác minh giao dịch đầu-cuối. |

## Quy tắc dữ liệu

- Langfuse tắt khi thiếu một trong ba biến `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`.
- Khi bật, trace chỉ chứa tên tính năng, chế độ AI/fallback, độ trễ, số lượng gợi ý, tên bước và mã phiên ngẫu nhiên. Prompt, câu trả lời, nội dung website, số điện thoại, email, mã đơn và mã truy cập không được gửi.
- Mã phiên được lưu trong `sessionStorage` và hết khi tab đóng. Không gắn sự kiện với IP, user-agent, email hay mã đơn.
- Chỉ chấm nội dung bằng người đánh giá hoặc bộ dữ liệu kiểm thử có nguồn và đã loại PII. Chưa gọi evaluator LLM bên ngoài.
- Chỉ bật Langfuse sau khi kiểm chứng trace đầu cuối trên project thử nghiệm riêng.

## Kiến trúc và giới hạn

LangGraph điều phối hai node trong Studio: soạn nội dung bằng Ollama local và xếp hạng hosting bằng hàm tất định hiện có. LLM không quyết định giá hoặc ghi đè thứ hạng. Lưu lượng và trạng thái đơn vẫn theo kiến trúc hiện tại; chưa có bằng chứng cho thấy Kafka, CDC hay microservices cần thiết ở quy mô hiện tại, nên chưa thêm các dịch vụ vận hành đó.
