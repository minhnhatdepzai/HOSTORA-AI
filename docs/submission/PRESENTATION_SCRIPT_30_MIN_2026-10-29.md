# HOSTORA AI — thoại thuyết trình 30 phút

> Bản này viết theo trạng thái đã kiểm tra ngày 29/10/2026. Mục tiêu là nói rõ giá trị, cách làm và giới hạn. Không đọc các con số như lời hứa thị trường.

## Chuẩn bị trước khi trình bày

- Mở URL public hiện tại trong [CLOUDFLARE_DEMO_2026-10-29.md](CLOUDFLARE_DEMO_2026-10-29.md). Đây là Quick Tunnel tạm thời; giữ cửa sổ `pnpm tunnel:cloudflare` chạy.
- Chuẩn bị một tab web, một cửa sổ `/admin`, APK 2.0.9 trên Redmi Note 8 Pro và video dự phòng.
- Kiểm tra Ollama, `/api/health`, máy chủ Next.js và SQLite demo.
- Không dùng dữ liệu khách thật, số thẻ thật, OTP thật hoặc khóa merchant thật.
- Nếu AI hoặc mạng chậm, chuyển sang video và nói đúng: “Đây là bản ghi dự phòng của cùng phiên bản.”

URL demo tại thời điểm viết:

`https://consultation-directory-budgets-plus.trycloudflare.com`

URL này không cố định. Khi tunnel dừng, phải lấy URL mới trong log.

---

## 0:00–2:00 — Mở đầu: vấn đề và lời hứa

**Thoại**

“Xin chào ban giám khảo. Tôi là người xây HOSTORA AI. HOSTORA giải quyết một tình huống rất đời thường: một chủ shop muốn làm website nhưng không biết bắt đầu từ đâu, không hiểu hosting, không biết tổng chi phí và dễ chọn nhầm gói.

Tôi không bắt khách học thuật ngữ trước. Khách chỉ cần kể mình đang bán gì, website dùng để làm gì, dự kiến có bao nhiêu người truy cập và ngân sách khoảng bao nhiêu. HOSTORA làm rõ nhu cầu, so sánh các gói có dữ liệu nguồn, nói rõ giá gia hạn và chỉ cho bước tiếp theo.

Điểm tôi muốn nhấn mạnh là AI không được tự quyết định giá, voucher, trạng thái đơn hay tình trạng tên miền. AI giúp hiểu câu tự nhiên và giải thích. Phần tính tiền, xếp gói và kiểm tra trạng thái do mã nguồn có thể kiểm tra được đảm nhiệm.”

**Hành động**

- Chỉ vào tiêu đề trang chủ: “Mở trang web. Chọn đúng từ đầu.”
- Nói ngắn về ba bề mặt: website, app Android và admin dùng cùng API HOSTORA.

---

## 2:00–5:00 — Vì sao HOSTORA khác một chatbot thông thường

**Thoại**

“Một chatbot thông thường có thể trả lời nghe hợp lý nhưng vẫn có thể bịa giá hoặc hỏi lại điều khách đã nói. HOSTORA tách ba việc.

Việc thứ nhất là hiểu nhu cầu. Việc thứ hai là quyết định số học: gói nào đáp ứng ngân sách, chi phí đầu kỳ, giá gia hạn và điều kiện tên miền. Việc thứ ba là diễn đạt lại kết quả cho khách bằng tiếng Việt dễ hiểu.

Nếu không có gói đáp ứng ngân sách, HOSTORA nói thẳng ‘chưa có gói đáp ứng’ và chỉ đưa các phương án tham khảo. Nó không gắn một gói đắt tiền là ‘phù hợp nhất’ chỉ vì gói đó có điểm tài nguyên cao.

Nếu dữ liệu nhà cung cấp chưa xác minh, giao diện hiển thị ‘Chưa xác minh’. Đây là chủ ý thiết kế để khách phân biệt một điều đã biết, một điều không có và một điều chưa được kiểm tra.”

**Câu chuyển**

“Bây giờ tôi đi một luồng khách hàng từ trang chủ tới đề xuất.”

---

## 5:00–9:00 — Demo web: nhu cầu → ba gói → chi phí

**Hành động trực tiếp**

1. Mở trang chủ, bấm **Tư vấn chọn gói phù hợp**.
2. Chọn **Bán hàng**.
3. Chọn lượt truy cập, ngân sách và nhu cầu tên miền.
4. Bấm **Xem đề xuất**.
5. Cuộn qua lựa chọn chính và hai phương án thay thế.

**Thoại khi thao tác**

“Ở bước đầu, tôi chọn loại website. Đây không phải trang trí; loại website ảnh hưởng tới cách xếp gói. Một blog đọc bài có nhu cầu khác một cửa hàng có sản phẩm, đơn hàng và thanh toán.

Tôi nhập lượt truy cập như một ước lượng quy mô, không phải lời cam kết chịu tải. Tôi nhập ngân sách tháng và nếu biết thì nhập thêm giới hạn trả trước. HOSTORA tách giá ưu đãi, kỳ hạn, giá gia hạn và tiền đầu kỳ.

Ở kết quả, khách thấy lý do, giới hạn và nguồn dữ liệu. Với gói chưa đủ thông tin, hệ thống không tự điền. Với ngân sách cực thấp, ví dụ 10.000 đồng một tháng, trạng thái là ‘Chưa có gói đáp ứng ngân sách này’. Đây là một kết quả đúng nghiệp vụ, dù không phải kết quả bán hàng dễ nghe.

Khách có thể chọn một gói thay thế, lưu yêu cầu tư vấn và nhận mã tham chiếu. Lead được kiểm tra tên và số điện thoại trước khi lưu; bản ghi hỏng không làm mất những lead hợp lệ khác.”

**Điểm cần nói nếu bị hỏi**

“Điểm gói hiện là quy tắc tất định được giải thích trong mã nguồn, chưa phải trọng số đã hiệu chỉnh bằng hàng nghìn khách thật. Tôi trình bày đúng phạm vi đó.”

---

## 9:00–11:00 — Luồng chưa có website: AI dẫn sang Website Studio

**Hành động**

- Mở `/ai-assistant`.
- Nhập: “Tôi chưa có website, muốn bán mỹ phẩm và cần khách đặt hàng.”
- Chỉ vào hành động mở **Xưởng tạo website**.

**Thoại**

“Nếu khách nói chưa có website, HOSTORA không cố ép khách mua hosting ngay. Chatbot hỏi mục tiêu kinh doanh và đưa khách sang Xưởng tạo website. Sau khi có bản xem trước, khách có thể gửi liên kết trở lại cho AI; lúc đó tư vấn hosting dựa trên website, chức năng và ngân sách cụ thể hơn.

Đây là một điểm quan trọng của hành trình chuyển đổi: AI không chỉ trả lời một câu hỏi, mà đưa khách tới bước tiếp theo có ích.”

---

## 11:00–13:00 — Demo Android trên Redmi Note 8 Pro

**Hành động**

- Mở APK 2.0.9.
- Cho thấy trang chủ, thanh điều hướng dưới, màn chọn gói và kết quả.
- Nếu thiết bị đang nối USB, chỉ vào màn kết nối dịch vụ và trạng thái **Sẵn sàng**.

**Thoại**

“Ứng dụng Android dùng cùng API với website. Khi kết nối qua USB bằng `adb reverse`, app trên Redmi gọi được máy chủ HOSTORA local mà không cần đổi logic nghiệp vụ.

Tôi đã kiểm tra package `com.hostora.ai`, versionName 2.0.9, versionCode 21. Trên màn hình nhỏ, CTA không bị tai thỏ hay thanh điều hướng che. Thanh dưới đưa khách tới trang chủ, dịch vụ, chọn gói, hỏi đáp và chi phí.

App ưu tiên cách đọc nhanh: một thông điệp chính, các thẻ gói có thể cuộn, nút hành động lớn và cảnh báo chi phí không bị giấu trong AI.”

**Giới hạn cần nói**

“APK hiện là bản ký debug cho đánh giá, chưa phải bản phát hành Google Play. App cần máy chủ HOSTORA để gọi AI và dữ liệu catalog.”

---

## 13:00–16:00 — Kiến trúc full stack: một luồng dữ liệu

**Thoại**

“Về kiến trúc, HOSTORA là Next.js App Router cho website, API và admin; React Native Expo cho Android; SQLite cho các đơn hàng, hóa đơn và dữ liệu vận hành cục bộ.

Website và app gọi cùng các endpoint. Admin không có một bộ dữ liệu giả riêng. Khi khách tạo yêu cầu mua hoặc hóa đơn, trạng thái được lưu vào SQLite. Admin lọc theo trạng thái, cổng thanh toán, loại dịch vụ, ngày và từ khóa; khách xem đơn bằng mã đơn và mã truy cập.

Tôi cố tình tách các lớp. `lib/recommendation.ts` chấm gói. `lib/pricing.ts` tính chi phí. `lib/payments/` quản lý yêu cầu mua, hóa đơn, checkout, callback và hoàn tiền. Giao diện chỉ hiển thị kết quả từ các lớp này, không nhân bản công thức trong component.

Các API nhận dữ liệu ngoài đều có schema và giới hạn. Khi lỗi, API trả thông báo tiếng Việt dễ hiểu thay vì stack trace.”

**Nếu được phép chiếu sơ đồ**

- Website/app → API HOSTORA.
- API → domain logic + SQLite.
- AI → Ollama loopback.
- RAG → knowledge + index local.
- Admin → cùng trạng thái đơn hàng.

---

## 16:00–19:00 — Luồng mua hàng, email, thanh toán và hoàn tiền

**Thoại**

“Sau khi chọn gói, khách gửi yêu cầu mua trong HOSTORA. Quản trị viên kiểm tra nhà cung cấp, kỳ hạn, thuế và điều kiện rồi phát hành hóa đơn. Email khách có mã tham chiếu, nút xem đơn và hướng dẫn bảo vệ mã truy cập.

Trong bản đánh giá, thanh toán là môi trường demo hoặc sandbox. Demo có giao diện nhập thông tin thẻ kiểm thử và OTP kiểm thử nhưng không thu tiền thật. Stripe thật chỉ ghi nhận khi webhook khớp mã hóa đơn, số tiền, tiền tệ và PaymentIntent. VNPay chỉ ghi nhận khi IPN hoặc đối soát có chữ ký hợp lệ, đúng mã và đúng số tiền.

Trang quay về sau thanh toán không tự đánh dấu thành công. Callback lặp phải idempotent để không phát voucher hai lần. Đơn từ một triệu đồng có thể phát voucher một trăm nghìn cho đơn sau, nhưng quy tắc voucher nằm ngoài quyền của AI.

Khách có thể hủy hóa đơn chưa thanh toán hoặc gửi yêu cầu hoàn tiền. Admin duyệt hoặc từ chối. Dịch vụ số không có phần vận chuyển vật lý; trạng thái hoàn tiền chỉ đổi sau phản hồi cổng được kiểm chứng.”

**Câu nói an toàn**

“Chưa có merchant Stripe/VNPay thật đứng tên HOSTORA trong bản này, nên tôi không gọi giao dịch demo là tiền thật.”

---

## 19:00–22:30 — Chatbot: từ câu tự nhiên tới hành động

**Thoại**

“Chatbot có hai vai trò: hiểu nhu cầu và hướng dẫn hành động. Nó không được làm kế toán hay quản trị đơn hàng.

Trước khi gọi model, API kiểm tra số lượng tin nhắn và chiều dài. Email, số điện thoại và thông tin liên hệ được che best-effort trước retrieval và inference. Các trường hợp nhạy cảm được xử lý bằng luật tất định: chưa có website, thiếu ngân sách, giá gia hạn chưa rõ, tên miền, thanh toán, email và hoàn tiền.

Model nhận context có giới hạn. Câu trả lời được kiểm tra citation; citation không có trong context bị loại. Nếu AI không sẵn sàng, giao diện vẫn đưa khách về wizard và các bước tự điền.

Một lỗi thực tế đã giúp thiết kế tốt hơn: câu ‘không cần mua kèm tên miền’ từng bị đọc thành cần tên miền; câu ‘blog chia sẻ kinh nghiệm bán hàng, không kinh doanh trên web’ từng bị đọc thành cửa hàng. Nguyên nhân là hậu xử lý từ khóa tìm trên cả câu. Tôi đã thêm kiểm thử theo mệnh đề: tách phủ định, tách chủ đề nội dung khỏi chức năng giao dịch, và yêu cầu trạng thái chưa chắc khi mâu thuẫn.

Tôi không nói hai ca này chứng minh hiểu tiếng Việt hoàn hảo. Tôi nói đây là lỗi đã tái hiện, có nguyên nhân, có test đỏ trước sửa và test xanh sau sửa.”

---

## 22:30–25:00 — RAG local: nguồn, truy xuất và giới hạn

**Thoại**

“RAG của HOSTORA dùng bộ tài liệu có URL, loại nguồn, từ khóa, mức độ tin cậy và ngày xác minh. Khi có câu hỏi, hệ thống mở rộng từ khóa theo chủ đề, chạy BM25, tìm embedding bằng `qwen3-embedding:4b`, tính cosine similarity rồi trộn thứ hạng bằng Reciprocal Rank Fusion.

Kết quả được đa dạng hóa theo URL và chủ đề để không lấy sáu đoạn giống nhau từ một nguồn. Context gửi cho chatbot có citation, URL và ngày xác minh.

Nếu embedding không chạy hoặc index không khớp model và dữ liệu, hệ thống chuyển sang tìm từ khóa. Nó không giả vờ rằng đã tìm vector. Dữ liệu RAG được xem là dữ liệu không tin cậy; chỉ dẫn nằm trong tài liệu không được coi là lệnh cho hệ thống.

Giá, khuyến mại, voucher và availability không được nhét vào trọng số model. Những dữ liệu đó lấy từ catalog có nguồn và ngày kiểm tra. Recall hoặc MRR của retrieval không chứng minh câu trả lời luôn trung thực; vì vậy tôi giữ riêng các bài đánh giá faithfulness và người dùng thật trong backlog.”

---

## 25:00–27:30 — Website Studio: kế hoạch trước, renderer sau

**Hành động**

- Mở `/website-studio`.
- Nhập brief ngắn: “Website giới thiệu studio nail, khách nữ 20–35, CTA đặt lịch, màu xanh ngọc và chuyển động nhẹ.”
- Cho xem preview, chat sửa, link xem và link tải ZIP.

**Thoại**

“Website Studio không cho model tự chạy HTML và JavaScript tùy ý trong production. API kiểm tra brief, che thông tin liên hệ, rồi model sinh JSON nội dung và kế hoạch thiết kế có cấu trúc: bố cục, mật độ, kiểu chữ, vai trò màu nhấn, mức chuyển động và motif 3D.

Luồng LangGraph điều phối các bước kiểm tra brief, sinh nội dung, kiểm chứng nội dung và chọn dữ kiện an toàn. Gợi ý hosting sau đó vẫn do quy tắc tất định tính.

Renderer của HOSTORA kiểm soát HTML, CSS, GSAP và Three.js. Nhờ vậy website có hiệu ứng chữ xuất hiện, chuyển động khi cuộn, nền 3D và responsive nhưng không thực thi mã nguy hiểm do model tự bịa. Có reduced-motion để người không muốn chuyển động vẫn dùng được.

Sau khi tạo, khách nhận link preview tương tác, link tải ZIP và khung chat để yêu cầu chỉnh tiếp. Nếu bật đồng bộ GitHub và máy chủ đã đăng nhập GitHub, hệ thống có thể tạo repo riêng tư cho khách; nếu GitHub lỗi, preview và ZIP vẫn giữ nguyên.”

**Giới hạn cần nói**

“Ứng viên fine-tuning của Studio chỉ là candidate. Runtime production vẫn dùng renderer kiểm soát, không tự promote checkpoint chỉ vì loss thấp.”

---

## 27:30–29:00 — Bảo mật, quản trị và vận hành

**Thoại**

“Admin bắt đăng nhập bằng mã email một lần hoặc mật khẩu dự phòng. `/admin` chặn trước khi hiển thị dữ liệu; `/admin/orders` không phải cổng lách quyền.

Model chỉ gọi Ollama loopback, không có shell, filesystem hay network tool tùy ý. Website Analyzer chặn SSRF. Cookie phiên có HttpOnly và SameSite. Callback thanh toán kiểm chữ ký và số tiền. Log AI ghi model, độ trễ, token và số nguồn, không ghi PII.

Langfuse đang tắt mặc định. Chỉ bật sau khi có project riêng và trace end-to-end; metadata phễu có thể ghi bước xem demo, mở gói, gửi yêu cầu và bắt đầu thanh toán, nhưng không gửi nội dung chat, email hay số điện thoại.”

---

## 29:00–30:00 — Bằng chứng, giới hạn và kết luận

**Thoại**

“Bản 2.0.9 đã có 182 trên 182 unit test, 47 lượt E2E đạt và một lượt bỏ qua có chủ đích, typecheck, lint, build web, typecheck/lint mobile và phép gọi Ollama local. Tôi đã kiểm tra APK trên Redmi Note 8 Pro. Bộ APK, source, video và checksum đồng bộ trên GitHub prerelease.

Những điều tôi chưa tuyên bố: chưa có merchant Stripe/VNPay thật, chưa có APK ký production, chưa có benchmark tải đại diện, chưa có 5–10 chủ shop dùng thử độc lập và Cloudflare Quick Tunnel hiện tại chưa phải URL production cố định.

Giá trị của HOSTORA là biến một nhu cầu mơ hồ thành một quyết định có căn cứ: nhu cầu → dữ kiện → gói → chi phí → hành động tiếp theo. AI làm phần hiểu và giải thích; hệ thống giữ quyền quyết định thương mại ở nơi có thể kiểm chứng.

Nếu được phát triển tiếp, tôi ưu tiên ba việc: mở rộng test câu tự nhiên ngoài bộ nội bộ, chạy thử với chủ shop thật và triển khai named Cloudflare Tunnel với tên miền HTTPS ổn định. Tôi không thêm công nghệ chỉ để làm danh sách dài hơn.

Cảm ơn ban giám khảo. Tôi sẵn sàng mở mã nguồn và đi vào bất kỳ luồng nào.”

---

# Bộ câu hỏi phản biện và câu trả lời ngắn

## 1. Vì sao AI không tự chọn giá?

“Giá là dữ liệu thương mại biến động và có nguồn. Nếu để model tự viết giá, một câu trả lời nghe tự tin có thể làm khách mất tiền. HOSTORA để domain logic tính giá từ catalog, model chỉ diễn giải.”

## 2. Nếu mọi gói đều vượt ngân sách?

“Trạng thái là chưa có gói đáp ứng. Các gói vẫn có thể hiện ở khu vực tham khảo, nhưng không được gắn là phù hợp nhất.”

## 3. 50GB có chứng minh chịu 50.000 lượt không?

“Không. Dung lượng không phải phép đo tải. HOSTORA không suy luận khả năng chịu tải chỉ từ GB; cần benchmark website thật.”

## 4. RAG khác fine-tuning thế nào?

“RAG đưa nguồn mới vào context và giữ citation. Fine-tuning điều chỉnh hành vi mẫu. Giá và trạng thái thương mại không đưa vào trọng số; RAG cũng không biến nguồn không tin cậy thành lệnh.”

## 5. LangGraph dùng ở đâu?

“Luồng Website Studio dùng graph để tách kiểm tra brief, sinh nội dung, kiểm chứng và chuẩn bị gói renderer. Nó không trao quyền chạy mã tùy ý cho model.”

## 6. AI tắt thì sản phẩm còn gì?

“Wizard, catalog, xếp gói, tính chi phí, lưu yêu cầu, admin, đơn hàng và thanh toán vẫn chạy. AI bị tắt thì chat và phân tích tự nhiên báo không khả dụng, đồng thời đưa khách về form có cấu trúc.”

## 7. Làm sao xử lý prompt injection trong RAG?

“Nguồn RAG là dữ liệu, không phải lệnh. Context được giới hạn, citation hậu kiểm và prompt yêu cầu bỏ qua chỉ dẫn nằm trong nguồn.”

## 8. Vì sao cần cả web và app?

“Web thuận chia sẻ và SEO; app thuận dùng hằng ngày, thông báo và camera/OCR. Cả hai gọi cùng API nên không tách thành hai logic kinh doanh.”

## 9. Vì sao không mở thẳng admin?

“Admin chứa lead, đơn và dữ liệu thương mại. `/admin` phải qua mã email hoặc phiên đã xác thực; E2E kiểm tra cả `/admin` và `/admin/orders`.”

## 10. Thanh toán hiện có thật không?

“Bản đánh giá có giao diện và luồng demo/sandbox. Chưa có merchant production đứng tên HOSTORA. Tôi chỉ gọi là đã trả khi webhook/IPN được kiểm chữ ký và đối soát số tiền.”

## 11. Cloudflare URL có phải production không?

“Không. Đây là Quick Tunnel tạm để giám khảo truy cập ngoài LAN. Production cần named tunnel, DNS, HTTPS ổn định, rate limit, backup, giám sát và cấu hình callback riêng.”

## 12. Điểm yếu lớn nhất hiện tại là gì?

“Độ đúng ngoài bộ test, bằng chứng chủ shop dùng thật và triển khai ngoài mạng local. Đây là lý do tôi không biến 82/100 mô phỏng thành lời hứa top 10.”

## 13. Nếu một lead hỏng thì sao?

“Parser đọc từng bản ghi, giữ lead hợp lệ, đếm bản ghi hỏng và không ghi đè dữ liệu khi JSON tổng bị lỗi. Có unit và E2E hồi quy cho tình huống này.”

## 14. Vì sao chưa promote chatbot fine-tune?

“Loss thấp và HTTP 200 chưa chứng minh định tuyến, bước tiếp theo hay tính trung thực. Ứng viên chỉ được promote sau holdout, challenge, review lỗi và ngưỡng đã định.”

## 15. Bạn sẽ đo thành công sau cuộc thi thế nào?

“Đo thời gian hoàn thành tư vấn, tỷ lệ hiểu đúng giá gia hạn, tỷ lệ chọn trong ngân sách, tỷ lệ chuyển từ demo sang yêu cầu mua và số lần cần hỗ trợ. Kết hợp log ẩn danh, phỏng vấn và review thủ công.”
