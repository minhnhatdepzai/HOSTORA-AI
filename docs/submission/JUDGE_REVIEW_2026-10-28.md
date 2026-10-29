# HOSTORA — đánh giá giả lập giám khảo Đề 01

> **Báo cáo lịch sử của bản trước khi sửa.** Xem [bàn giao 2.0.9 ngày 29/10/2026](JUDGE_HANDOFF_2026-10-29.md) trước khi dùng các số điểm và nhận định bên dưới.

Ngày: 28/10/2026, giờ Việt Nam. Rubric: ảnh đề và bảng 100 điểm do người dùng cung cấp. Đây là đánh giá độc lập trên working tree hiện tại, không phải điểm chính thức hay dự báo thống kê thứ hạng. Không sửa tính năng sản phẩm trong đợt đánh giá này.

## Kết luận

HOSTORA có nền tảng để cạnh tranh nhưng bản hiện tại chưa đủ chắc để kỳ vọng top 10/250. Top 10 là nhóm 4% đứng đầu, không phải xác suất trúng giải 4%. Chưa có dữ liệu của các đội khác nên không thể đưa ra xác suất hoặc vị trí chính xác.

Điểm giả lập trung tâm: **72/100**, khoảng tham khảo **68–76** tùy phần phản biện và bằng chứng bàn giao. Mục tiêu nội bộ sau khắc phục: 85–90; đây là mục tiêu chất lượng, không phải điểm chuẩn top 10 đã biết.

Điểm mạnh: tách xếp hạng/giá tất định khỏi LLM, nguồn/ngày dữ liệu và giá gia hạn được thể hiện, có local AI thực sự, có kiểm thử đáng kể, giao diện có bản sắc và chạy được ở viewport điện thoại. Điểm yếu lớn nhất là tư vấn chưa chắc đúng ở tình huống biên, đầu ra AI đúng schema nhưng sai ý nghĩa, cùng kiểm thử/kịch bản demo không theo kịp luồng đăng nhập mới.

## Chấm theo đúng rubric

| Tiêu chí | Điểm giả lập | Căn cứ |
|---|---:|---|
| Hoàn thành chức năng, đúng nghiệp vụ | 20/25 | Wizard đủ đầu vào, top 3, bảng so sánh, lưu lead, FAQ đều hiện hữu; ngân sách thấp vẫn xếp gói vượt khả năng chi trả lên đầu; xem danh sách cần phiên quản trị. |
| Thiết kế kỹ thuật, chất lượng mã | 17/20 | Typecheck/lint đạt; tách domain/UI/AI, Zod, unit test; scoring còn giả định chưa được hiệu chỉnh và validation lead không nhất quán. |
| Tích hợp AI, kiểm soát đầu ra | 10/15 | Gọi mô hình thật thành công; phát hiện nhầm store/company và chuyển CDN chưa xác minh thành không có; schema không kiểm chứng sự thật. |
| Kiểm thử, ổn định, xử lý lỗi | 10/15 | 153/153 unit đạt; 14/22 lượt E2E trọng tâm đạt trên production; có ca sai input/outage, nhưng test và demo đã lệch sản phẩm. |
| Làm chủ Vibe Coding, phản biện | 9/15 tạm tính | Có tài liệu minh chứng và lịch sử lỗi/sửa; chưa phỏng vấn người dự thi, chưa xác nhận đầy đủ ảnh prompt thực tế. Không coi độ lớn repo là bằng chứng làm chủ. |
| UI/UX | 4/5 | Desktop/mobile không tràn ngang toàn trang; FAQ thao tác Enter được; thiếu điểm vào tư vấn ở trang chủ, còn ngôn ngữ nội bộ. |
| Triển khai, bàn giao | 2/5 | Có README và artifact demo trong repo; chưa kiểm chứng URL online và video/source đồng bộ bản hiện tại. |
| **Tổng** | **72/100** | Điểm mô phỏng, có phần chưa kiểm chứng. |

## Môi trường và kết quả chạy mới

- `pnpm typecheck`: đạt.
- `pnpm lint`: đạt.
- `pnpm test`: 46 file, 153/153 test đạt khi chạy ngoài sandbox. Lần đầu một test DNS example.com lỗi do sandbox; không tính đó là lỗi sản phẩm.
- `pnpm ai:check`: đạt; JSON smoke test khoảng 19,4 giây. Chỉ chứng minh model trả cấu trúc; không chứng minh tư vấn đúng.
- `pnpm build`: Turbopack lỗi quyền tạo process/bind port; lần thử ngoài sandbox vẫn báo lỗi này. Chưa xác nhận đường build mặc định đạt.
- `pnpm build --webpack`: đạt, có cảnh báo dependency động của OpenTelemetry. Chạy bản này tạm ở 127.0.0.1:3100 để đánh giá giao diện.
- Chạy nguyên `core.spec.ts` + `rubric.spec.ts` với baseURL production, desktop và Pixel 7: **14 đạt, 8 lỗi, 0 skip**, tổng 22 lượt / 11 test logic, khoảng 78,3 giây. Không phải toàn bộ E2E repo.
- Dev 3000 có vòng tải lại liên tục, làm các thao tác bị reset. Lượt E2E dev không được dùng làm kết quả cuối. Chưa xác định nguyên nhân vòng reload và không suy diễn thành lỗi production.
- Browser audit bổ sung: viewport desktop 1440×900 và mobile 390×844. Đây là web mobile, không phải xác nhận APK/thiết bị Android thật.
- API AI thật được đo trên dev 3000, không mock; browser/E2E cuối dùng production 3100. Không có benchmark tải đồng thời/p95.

## Những lỗi và hạn chế cần ưu tiên

### P0 — ngân sách không được coi là điều kiện chọn gói

Input: blog, 1.000 lượt/tháng, 10.000đ/tháng, không mua domain. API trả Cloud Startup đứng đầu 58/100, giá khuyến mại 167.900đ/tháng, gia hạn 447.900đ/tháng; hai gói còn lại cũng không được chứng minh nằm trong ngân sách. UI gắn nhãn “PHÙ HỢP NHẤT” cho mục đầu. Có cảnh báo vượt ngân sách, nhưng cảnh báo không sửa được quyết định tư vấn.

Nguyên nhân: `lib/recommendation.ts` cộng điểm tài nguyên/mở rộng vào tổng rồi luôn lấy ba gói đầu, không có trạng thái “không có gói đáp ứng”. Điểm tài nguyên lấy GB lưu trữ làm đại diện cho mức truy cập; đây không phải bằng chứng chịu tải. `websiteType` không được đọc trực tiếp trong scoring; `needsDomain` chỉ thêm cảnh báo. Thử đổi blog→company hoặc domain false→true với cùng đầu vào còn lại cho cùng thứ hạng và điểm.

Khắc phục: xác định ràng buộc ngân sách, chi phí trả trước và mức đáp ứng trước khi xếp hạng; nếu không có gói đáp ứng thì nói rõ, chỉ đưa phương án tham khảo có điều kiện. Phân biệt “tiết kiệm đủ dùng”, “cân bằng”, “dự phòng tăng trưởng” bằng nhu cầu thực. Đo/giải thích giới hạn tải thay vì suy luận từ GB. Không áp đặt yêu cầu đa nhà cung cấp vì đề không bắt buộc.

### P0 — AI đúng JSON nhưng sai ý nghĩa

Yêu cầu thật: “Tôi bán mỹ phẩm online, 50.000 lượt truy cập mỗi tháng, ngân sách 600 nghìn đồng mỗi tháng, cần mua kèm tên miền.”

`/api/ai/analyze` trả `websiteType: company`, `ecommerce: true`, các số đúng, rồi hỏi lại có cần hỗ trợ tên miền dù thông tin đã đủ. Mất 25,38 giây trong một lượt đo. Đây là lỗi quan sát trong một mẫu, không phải tỷ lệ lỗi toàn hệ thống.

`/api/ai/explain` trả lời trong 8,01 giây, viết về Premium: “Không có CDN theo dữ liệu hiện có.” Catalog thực tế là `cdn: null`, bảng so sánh ghi “Chưa có dữ liệu”. Câu “khả năng chịu tải thấp hơn” cũng chưa kèm bằng chứng đo ứng dụng. API mới kiểm tra cấu trúc và prompt; không có hậu kiểm các mệnh đề này.

Khắc phục: kiểm tra chéo websiteType/ecommerce, giữ ba trạng thái có/không/chưa rõ xuyên suốt pipeline, ràng buộc giải thích bằng dữ kiện server xác minh. Gửi cả nhu cầu ban đầu vào phần giải thích; hiện UI chỉ gửi danh sách top 3. Khi phát hiện mâu thuẫn, yêu cầu xác nhận hoặc dùng diễn giải an toàn. Có bộ đánh giá nội dung thay vì chỉ đếm HTTP 200/schema.

### P0 — lead sai có thể khiến toàn bộ danh sách đọc ra rỗng

Browser thật chấp nhận tên `  ` và điện thoại `+++++++++`; sau trim lưu `name: ""`. HTML chỉ dùng minLength và pattern `[0-9 +]{9,15}`, hàm lưu không validate lại dữ liệu đã chuẩn hóa.

`lib/local-admin.ts` parse cả mảng với `z.array(adminLeadSchema)`. Một phần tử tên rỗng làm parse cả mảng thất bại và trả `[]`. Gọi trực tiếp hàm thật với dữ liệu giả: chỉ lead hợp lệ → 1 mục; lead hợp lệ + lead rỗng → 0 mục. Dữ liệu chưa bị xóa khỏi localStorage nhưng giao diện đọc danh sách có thể trông như mất toàn bộ.

Khắc phục: schema chung sau trim/chuẩn hóa số điện thoại; từ chối tên trắng/số không hợp lệ trước khi lưu. Khi đọc dữ liệu cũ, cô lập bản ghi hỏng và thông báo, giữ các bản ghi hợp lệ. Thêm regression test cho đúng tình huống hai lead này.

### P1 — lối vào và demo không theo kịp phạm vi sản phẩm

Trang chủ hiện không có link trực tiếp `/consultation` (đếm DOM: 0). Điều hướng và CTA ưu tiên tải Android, tạo website, dịch vụ, đơn hàng. Giám khảo phải biết URL mới đi vào wizard của đề. Nên đưa “Tư vấn chọn hosting” thành CTA dễ thấy và giữ luồng thi ngắn.

`/dashboard` chuyển sang `/admin` rồi tới đăng nhập quản trị. Đây là ranh giới quyền có chủ đích; không nên bỏ xác thực để làm test xanh. Lead hợp lệ vẫn lưu đúng gói thứ hai và tồn tại sau reload. Nhưng test chưa đăng nhập nên không chứng minh được xem/xóa danh sách.

8 lượt lỗi E2E trên production gồm:

- 4 lượt thuộc 2 test đọc danh sách lead và luồng 5 chức năng: dừng ở login quản trị.
- 2 lượt APK: test đòi 2.0.5, endpoint trả 2.0.6; tải không được chứng minh hỏng.
- 2 lượt chat→Studio: test đòi màn Studio, thực tế gặp màn đăng nhập tài khoản.

Khắc phục: cập nhật test cho chính sách đăng nhập hiện tại, chuẩn bị phiên/tài khoản demo, đồng bộ version artifact và tài liệu. Không đổi assertion chỉ để che lỗi thật. Báo cáo cũ `TEST_MATRIX.md` ngày 24/10 có 39 unit và 18 E2E đã đạt, không được dùng thay số đo bản mới.

### P1/P2 — thiếu bằng chứng cạnh tranh, còn chỗ làm rõ UX

- Chưa kiểm chứng URL online, luồng AI qua mạng ngoài và bàn giao từ máy sạch.
- Chưa có thử nghiệm người dùng thật chứng minh chủ shop quyết định nhanh/đúng hơn một bảng so sánh thông thường.
- Cần nói rõ vì sao trọng số scoring phù hợp; 99/100 là điểm nội bộ, không phải xác suất phù hợp hay bảo đảm tải.
- Giao diện còn “LLM”, “code”, “budget/resources/ownership”, “e-commerce”. Nên đổi thành tiếng Việt phục vụ người mua; để chi tiết kỹ thuật vào màn giải thích cho giám khảo.
- Mobile 390px: vùng bảng rộng 780px trong khung 348px, có cuộn ngang và tabindex=0. Đây là bảng cuộn có chủ đích, không phải tràn toàn trang. Nên thêm chỉ dẫn vuốt và làm nổi gói đang xem.
- FAQ hiện có 6 câu, đã bao phủ tối thiểu 5. Nếu ban tổ chức yêu cầu đúng 5 thì điều chỉnh, không coi câu thứ sáu tự động là lỗi.

## Ma trận kiểm thử đã thực hiện — vượt tối thiểu 6 ca

| ID | Đầu vào / thao tác | Kỳ vọng | Kết quả mới |
|---|---|---|---|
| TC01 | Wizard bán hàng → 50.000 lượt → 600.000đ → đề xuất | 1 chính + 2 thay thế | Đạt; Cloud Startup, Không giới hạn, Premium. |
| TC02 | Bảng so sánh desktop/mobile | Đủ 3 gói, giá/dung lượng/băng thông/tính năng | Đạt; 10 hàng cả header, mobile cuộn trong khung. |
| TC03 | Chọn gói thứ hai, lưu lead giả, reload | Giữ tên/số/gói đã chọn | Đạt; xác nhận Premium trong localStorage sau reload ở lượt kiểm tra riêng. |
| TC04 | Xem/xóa lead theo test cũ tại /dashboard | Mở danh sách, xóa có xác nhận | Chưa đạt luồng E2E; bị chuyển tới login quản trị. Không kết luận mất dữ liệu. |
| TC05 | FAQ dùng Enter | Accordion mở đúng | Đạt; có 6 câu. |
| TC06 | POST recommend `{}`, ngân sách -1; chat messages rỗng | HTTP 400 tiếng Việt, chỉ ra field | Đạt. |
| TC07 | Nhập lượt truy cập -1 trong wizard | Không được đi tiếp | Đạt; nút tiếp tục disabled. |
| TC08 | Chặn API recommend trong browser | Báo lỗi, retry, không dựng giá giả | Đạt; outage được giả lập có chủ đích. |
| TC09 | Blog, 1.000 lượt, 10.000đ/tháng | Nêu không có gói đáp ứng; không gắn phù hợp nhất vô điều kiện | Không đạt nghiệp vụ; Cloud Startup đứng đầu, gia hạn 447.900đ. |
| TC10 | AI phân tích câu bán mỹ phẩm đầy đủ | store + ecommerce, đúng số, không hỏi lại dữ kiện đã có | Một phần; số đúng, loại website company sai. |
| TC11 | AI giải thích top 3, CDN Premium = null | Giữ “chưa xác minh” | Không đạt; viết “Không có CDN”. |
| TC12 | Tên khoảng trắng, điện thoại toàn dấu + | Từ chối trước khi lưu | Không đạt; browser lưu name rỗng. |
| TC13 | Hàm đọc nhận 1 lead tốt + 1 lead tên rỗng | Giữ lead tốt, báo bản ghi hỏng | Không đạt; hàm trả toàn mảng rỗng. |
| TC14 | Hỏi domain availability; lịch sử chat cũ | Không đoán domain, không gửi claim cũ vào context | E2E đạt cả desktop/mobile; có nhánh tất định, không chứng minh model tự suy luận. |
| TC15 | Chat thật “CDN có thay hosting…” | Trả tiếng Việt, phân biệt vai trò, có nguồn | Quan sát trả lời đúng ý chính, 22,67 giây một lượt; chưa chấm citation/faithfulness toàn diện. |

Ca readiness E2E hiện mock phản hồi AI, không tính là bằng chứng AI thật. Các mốc latency là quan sát một request, không phải trung bình/p95.

## Lộ trình tăng điểm

1. **Khóa nghiệp vụ cốt lõi:** xử lý ngân sách bất khả thi, nhất quán ba trạng thái dữ liệu và validation/đọc lead. Mỗi lỗi có regression test tái hiện trước khi sửa.
2. **Làm chắc AI:** 20–30 tình huống được chấm bằng đáp án/rubric, gồm câu có đủ thông tin, thiếu thông tin, mâu thuẫn, giá chưa rõ, prompt injection, Ollama lỗi. Lặp nhiều lần; báo tỷ lệ đúng theo từng nhóm và latency thật.
3. **Khôi phục hành trình thi:** CTA vào wizard; đề xuất → giải thích → so sánh → lưu lead; chứng minh danh sách bằng phiên quản trị đã chuẩn bị. Tất cả test liên quan phải xanh với luồng quyền hợp lệ.
4. **Đóng gói một phiên bản ổn định:** commit/tag, README chạy được từ máy sạch, URL HTTPS truy cập ngoài mạng, AI backend khả dụng, video đúng bản và đúng thời lượng ban tổ chức, ít nhất 6 ca có input/expected/actual/evidence.
5. **Bổ sung bằng chứng giá trị:** 5–10 chủ shop thử độc lập; đo thời gian hoàn thành, chọn đúng ngân sách, hiểu giá gia hạn và mức dễ hiểu; ghi cả thất bại. Mẫu nhỏ là nghiên cứu định tính, không gọi là xác nhận thị trường.

Ưu tiên này tập trung vào 90 điểm chức năng/kỹ thuật/AI/kiểm thử/phản biện. UI và bàn giao cộng lại chỉ 10 điểm. Chưa nên thêm cổng thanh toán, model fine-tune hay hiệu ứng mới chỉ để tăng số tính năng.

## Chuẩn bị phản biện

- Vì sao gói A được chọn thay vì B khi ngân sách giảm một nửa?
- Nếu mọi gói đều vượt ngân sách, hệ thống nói gì?
- Tại sao 50GB không chứng minh chịu được 50.000 lượt/tháng?
- Khác biệt giữa `false` và `null` đi qua model thế nào?
- AI thực sự giúp gì ngoài bộ lọc? Khi AI tắt, phần nào còn chạy?
- Nếu một lead hỏng, vì sao những lead khác không biến mất khỏi màn hình?
- Có thể mở cùng phiên bản từ máy khác và đi hết demo không?
- Đưa một prompt thật, một lỗi AI tạo ra, quyết định sửa của bạn và test chứng minh. Không dựng hội thoại giả.

## Hành trình và ảnh chụp đã kiểm tra

Ảnh dưới đây lấy từ production build trong lượt audit này. Các ảnh full-page đầu tiên có vùng chưa kích hoạt animation khi chưa cuộn, không được dùng để kết luận nội dung biến mất. Bộ viewport dưới đây đã mở và kiểm tra trực tiếp.

1. **Trang chủ — hình thức tốt, lối vào tư vấn thiếu.** CTA chính tải app/tạo website; không có link trực tiếp wizard.

![Trang chủ desktop](../../output/playwright/judge-2026-10-28-production/10-home-desktop-viewport.png)

2. **Wizard — hoạt động, chặn số âm; AI tự điền còn sai loại website.**

![Wizard](../../output/playwright/judge-2026-10-28-production/11-wizard-viewport.png)

3. **Đề xuất — đủ ba gói; cần sửa ý nghĩa “phù hợp nhất” ở ngân sách bất khả thi.**

![Đề xuất](../../output/playwright/judge-2026-10-28-production/12-recommendations-viewport.png)

4. **So sánh — dữ liệu rõ; thuật ngữ cần giản dị hơn.**

![So sánh](../../output/playwright/judge-2026-10-28-production/13-comparison-viewport.png)

5. **Lưu tư vấn — ghi đúng gói đã chọn và giữ qua reload; validation cần sửa.**

![Lưu lead](../../output/playwright/judge-2026-10-28-production/14-lead-viewport.png)

6. **Danh sách khách — cần đăng nhập quản trị; chưa xác minh xem/xóa sau login trong lượt audit.** Không gửi mã email và không vượt qua quyền truy cập.

![Điểm dừng quản trị](../../output/playwright/judge-2026-10-28-production/15-dashboard-login-gate.png)

7. **Mobile — bố cục không tràn ngang toàn trang; bảng cần gợi ý vuốt.**

![Trang chủ mobile](../../output/playwright/judge-2026-10-28-production/16-home-mobile-viewport.png)

![Bảng so sánh mobile](../../output/playwright/judge-2026-10-28-production/18-comparison-mobile-viewport.png)

Không tuyên bố đạt WCAG chỉ từ ảnh: mới thử Enter ở FAQ, nhãn DOM và chiều rộng trang/bảng; chưa audit screen reader, toàn bộ focus order hay độ tương phản bằng công cụ.

## Bằng chứng có thể đối chiếu

- [Kết quả API và AI thật](../../output/playwright/judge-2026-10-28-production/api-results.json).
- [22 lượt E2E production](../../output/playwright/judge-2026-10-28-production/e2e-results.json).
- [Quan sát browser bổ sung](../../output/playwright/judge-2026-10-28-production/browser-results.json).
- [Lead sau reload và URL login](../../output/playwright/judge-2026-10-28-production/capture-details.json).
- [Log build Webpack](../../output/playwright/judge-2026-10-28-production/build-webpack.log), [log Turbopack](../../output/playwright/judge-2026-10-28-production/build-turbopack.log).
- Script tái hiện được lưu cùng thư mục bằng chứng; đường dẫn và cổng trong script là của máy audit này.

Giới hạn: không so sánh trực tiếp 249 đối thủ; không chấm năng lực thuyết trình thật; không xác minh lại giá trên website nhà cung cấp; không test thanh toán thật, toàn bộ admin, đăng nhập email, APK mới hay tải đồng thời. Các số liệu cũ trong repo chỉ được dùng để nhận diện tài liệu lệch phiên bản, không làm kết quả kiểm thử hiện tại.
