# HOSTORA — chấm lại với mục tiêu top 10/265

> **Addendum hiện hành — source 2.1.0, ngày 29/10/2026.** Phần bên dưới của tệp là báo cáo lịch sử cho bản 2.0.9. Addendum này thay thế các số liệu 2.0.9 khi đánh giá working tree hiện tại.

## Kết luận hiện hành

**Chưa có cơ sở để ghi 95/100 hoặc bảo đảm top 10/265.** Bằng chứng mới cho thấy phần nhớ tài khoản và nguồn riêng đã chắc hơn, nhưng chatbot v8 vẫn là **candidate**, chưa được promote vào runtime vì định tuyến đúng chỉ đạt 130/151 (86,09%) trên holdout và 10/18 (55,56%) ở ca paraphrase mới. Điểm mô phỏng 87/100 của bản đánh giá tổng hợp vẫn là mốc tham khảo hợp lý; không cộng điểm chỉ vì model có loss thấp hoặc train nhiều hơn.

Top 10/265 là nhóm 3,77% đứng đầu. Không có bài của 264 đội còn lại nên không thể suy ra xác suất hay thứ hạng. Mục tiêu thực tế trước vòng chung kết là khóa một bản demo ổn định, chứng minh các ca biên và chuẩn bị phản biện; ưu tiên tiếp theo là intent routing/paraphrase, không tăng epoch mù.

## Bằng chứng mới đã xác minh

| Hạng mục | Kết quả | Giới hạn diễn giải |
|---|---|---|
| Unit/API | `pnpm test`: **233/233**, 52 file | Không thay thế E2E và usability độc lập |
| Web build | `pnpm build`: đạt; standalone đã chuẩn bị | Có cảnh báo dependency động OpenTelemetry |
| Type/lint | Web typecheck/lint và mobile typecheck/lint: đạt | Chạy trên máy phát triển hiện tại |
| AI smoke | `pnpm ai:check`: đạt; 17.550 ms, Ollama local | Chỉ chứng minh đường gọi model/schema, không chứng minh câu trả lời đúng |
| Account AI | 9/9 ca đạt; median 2.522 ms, p95 quan sát 3.617 ms | Một tài khoản, tuần tự, local; không phải p95 production |
| Chatbot v8 holdout | 151/151 HTTP/schema; 151/151 ngôn ngữ, không bịa số, next step, helpful shape; **130/151 route đúng** | Route gate chưa đạt; chưa dùng làm runtime |
| Chatbot v8 ca mới | 18/18 hình thức an toàn; **10/18 route đúng** | Bộ định hướng tìm lỗi, không đại diện toàn bộ người dùng |
| Training v8 | 737 train, 151 holdout, 1.480 bước, loss 0,3587; GPU tối đa 9,97 GB | Loss không phải thước đo chất lượng tư vấn |
| Android | APK `com.hostora.ai` 2.1.0/versionCode 22 cài đè bằng `adb install -r`; Mobile MCP mở được và thấy lịch sử cũ | Chỉ xác nhận thiết bị Redmi và persistence cục bộ; chưa là phát hành production |

### Quyết định model

`training/output-chatbot-v8/promotion.json` ghi `status: candidate`, `automatic_promotion: false`, `gate_passed: false`. Runtime tiếp tục dùng model đã cấu hình trong `.env.local`. Không thay đổi quyết định này chỉ để tăng điểm trình diễn.

### Bộ nhớ và nguồn riêng

Lịch sử chat, facts nhu cầu, nguồn riêng và sở thích Studio được lưu có giới hạn trong SQLite theo `customer_id`. Tin nhắn mới có quyền sửa facts cũ; giá, khuyến mại, availability, trạng thái thanh toán và PII không được đưa vào model memory/train. Đây là retrieval có schema, **không phải nhớ vô hạn**.

Các ca cuối đạt 9/9 gồm: nhớ qua phiên, nhắc lại đủ ngân sách, sửa ngân sách mới thắng cũ, đọc đúng nguồn riêng, chống nguồn xung đột, bỏ qua prompt injection, từ chối đoán doanh thu, và giữ lịch sử. Bằng chứng máy đọc được ở `output/account-ai-quality/2026-10-29-final/results.json`.

## Chấm lại theo rubric ở thời điểm hiện tại

| Tiêu chí | Điểm mô phỏng | Nhận định |
|---|---:|---|
| Chức năng, đúng nghiệp vụ | 24/25 | Wizard, catalog, no-match, lead và luồng tài khoản đã có regression; chưa có quan sát người dùng thật |
| Kỹ thuật, chất lượng mã | 19/20 | Schema, giới hạn body, quota, guardrail, build/typecheck/lint; chưa chứng minh edge/origin production |
| AI, kiểm soát đầu ra | 12/15 | Account guardrail 9/9 và RAG/source grounding tốt; v8 route 86,09%, paraphrase 55,56%, nên chưa thể 14–15 |
| Kiểm thử, xử lý lỗi | 14/15 | 233 unit và bằng chứng native; chưa có soak/mạng ngoài và Maestro driver bị chặn trên Redmi |
| Làm chủ Vibe Coding, phản biện | 10/15 tạm tính | Có lịch sử lỗi/sửa và candidate gate; điểm thật phụ thuộc trình bày trực tiếp |
| UI/UX | 5/5 trong phạm vi audit | Web/admin audit tự động trước đó đạt 12/12; cần TalkBack/usability độc lập |
| Triển khai, bàn giao | 3/5 | APK local 2.1.0 đã cài đè; GitHub release công khai vẫn cần chốt artifact 2.1.0 đồng bộ |
| **Tổng** | **87/100** | Mô phỏng có bằng chứng, không phải điểm ban tổ chức |

## Sáu ca tối thiểu để bảo vệ trước giám khảo

1. Nhu cầu shop đủ ngân sách → một gói chính và hai phương án thay thế.
2. Ngân sách thấp hơn mọi gói → nói rõ không có gói đáp ứng, không gắn “phù hợp nhất” vô điều kiện.
3. Lead hợp lệ cùng bản ghi hỏng → giữ lead tốt, từ chối bản ghi sai.
4. Tính năng/catalog là `null` → hiển thị “chưa xác minh”, không đổi thành “không có”.
5. Ollama/API lỗi → trả lỗi dễ hiểu, không dựng giá hoặc câu trả lời giả.
6. Đăng nhập, reload và cài đè APK → lịch sử chat còn; dữ liệu mới có thể sửa facts cũ.

Nên trình bày thêm hai ca v8 thất bại về định tuyến để chứng minh cách phản biện: một câu phủ định nhu cầu tên miền và một câu nói về chủ đề bán hàng nhưng không phải chức năng bán hàng. Không che các ca này bằng cách thêm đúng mẫu câu vào regex rồi tuyên bố hiểu ngôn ngữ tự nhiên.

## Lộ trình nâng điểm có thể nghiệm thu

1. Tạo bộ paraphrase/negation/mâu thuẫn độc lập tối thiểu 50 ca; chấm route bằng nhãn ngữ nghĩa, không chỉ schema.
2. Sửa router theo mệnh đề và độ tin cậy; khi bằng chứng mâu thuẫn thì hỏi lại thay vì ghi đè kết quả model.
3. Chạy lại holdout + ca mới; chỉ promote khi gate route đạt ngưỡng đã công bố và có review thủ công.
4. Chốt release 2.1.0 gồm source, APK, video, checksum và README cùng một commit/tag; cài từ máy sạch/điện thoại ngoài mạng.
5. Thử với 5–10 chủ shop, ghi thời gian hoàn thành, hiểu giá gia hạn/trả trước và các điểm hiểu nhầm.
6. Diễn tập phản biện: prompt thật → lỗi thật → patch → test trước/sau → lý do giữ hoặc không promote model.

Không nên dùng thêm fine-tune, GPU 100%, hiệu ứng UI hoặc số lượng tính năng để bù cho route sai, URL ngoài mạng chưa ổn định và thiếu usability evidence.

---

Ngày đánh giá: 29/10/2026, giờ Việt Nam. Dựa trên rubric 100 điểm người dùng cung cấp, mã nguồn hiện tại, kiểm thử chạy mới, phản hồi API thật và APK trên Redmi Note 8 Pro. Đây là điểm giả lập; không phải kết quả ban tổ chức. Báo cáo 72/100 ngày 28/10 phản ánh bản trước khi sửa.

## Kết luận

**Khoảng 82/100, có cơ sở để nhắm top 10 nhưng chưa đủ bằng chứng để dự đoán sẽ vào top.** Top 10/265 là nhóm 3,77% đứng đầu, không phải xác suất được chọn 3,77%. Chưa biết bài của 264 đội khác hoặc điểm phản biện thật của người dự thi.

Sản phẩm đã tiến bộ về tính đúng, kiểm thử và bàn giao. Điểm chưa chắc nhất là hiểu câu tự nhiên ngoài bộ test, giá trị thực tế với chủ shop, khả năng truy cập từ mạng ngoài và phần trình bày. Không nên thêm tính năng để thay thế các bằng chứng này.

## Điểm theo rubric

| Tiêu chí | Lần trước | Lần này | Lý do |
|---|---:|---:|---|
| Chức năng và đúng nghiệp vụ | 20/25 | 23/25 | Các ca ngân sách thấp, tiền trả trước, lead và luồng bắt buộc đã có kiểm thử đạt; còn lỗi diễn giải đầu vào tự nhiên. |
| Kỹ thuật và chất lượng mã | 17/20 | 18/20 | Web/app typecheck và lint đạt, build mặc định đạt, tách dữ kiện xác minh khỏi nội dung model; hậu xử lý từ khóa vẫn dễ sai ngữ cảnh. |
| AI và kiểm soát đầu ra | 10/15 | 11/15 | 25/25 tình huống nội bộ đạt; 2/3 câu mới ngoài bộ test thất bại. Luồng giải thích đề xuất đã giới hạn AI chọn fact ID. |
| Kiểm thử và xử lý lỗi | 10/15 | 13/15 | 182 unit đạt, 47 E2E đạt, 1 bỏ qua có chủ đích; chưa có tải đồng thời đại diện, kiểm định rộng câu tự nhiên hoặc người dùng độc lập. |
| Làm chủ Vibe Coding, phản biện | 9/15 | 10/15 tạm tính | Có minh chứng quá trình lỗi/sửa và bàn giao; chưa phỏng vấn trực tiếp. Điểm này có thể thay đổi đáng kể khi thi. |
| UI/UX | 4/5 | 4/5 | Có CTA tư vấn rõ; web desktop/mobile và APK hoạt động ở phạm vi đã thử. Cảnh báo dài trên điện thoại đẩy gợi ý xuống thấp. |
| Triển khai, bàn giao | 2/5 | 3/5 | GitHub prerelease, APK/source/video/checksum khớp. Chưa có URL HTTPS app/backend ổn định để thử từ ngoài mạng. |
| **Tổng** | **72/100** | **82/100** | Mô phỏng theo bằng chứng, không phải xếp hạng thi. |

Khoảng tham khảo 79–86 tùy phản biện và bàn giao. Mục tiêu 88–90 sau cải thiện là mục tiêu nội bộ, không phải điểm chuẩn top 10 đã biết. Năm phần đầu chiếm 90 điểm; phần giao diện chỉ chiếm 5 điểm.

## Những gì vừa kiểm chứng lại

| Kiểm tra | Kết quả mới |
|---|---|
| `pnpm typecheck`, `pnpm lint` | Đạt |
| `pnpm test` | **182/182**, 47 file |
| `pnpm build` | Đạt, dùng Webpack và chuẩn bị standalone theo script hiện tại; vẫn có cảnh báo dependency động OpenTelemetry |
| `pnpm --dir mobile typecheck`, `pnpm --dir mobile lint` | Đạt |
| `pnpm ai:check` | Structured smoke test đạt, khoảng 347ms khi model đang sẵn sàng; không phải đo chất lượng tư vấn |
| Toàn bộ Playwright E2E trên production 3219 | **47 đạt, 1 skip, 0 lỗi**, khoảng 71 giây; desktop và Pixel 7 |
| Bộ đánh giá tư vấn hiện có | **25/25**: 20 phân tích nhu cầu, 3 quyết định đề xuất, 2 giải thích có kiểm soát; chạy 1 lượt tuần tự |
| Câu mới ngoài bộ đánh giá | **1/3 đạt**, 2 lỗi diễn giải có bằng chứng và nguyên nhân |
| Android | ADB xác nhận `com.hostora.ai`, versionName 2.0.9, versionCode 21; bấm từ bước 4 đang mở sang kết quả, tải được bảng giá và thông tin chi phí |
| Gói bàn giao | SHA-256 APK/source/video khớp manifest local và digest asset GitHub |
| Video | 46 giây, 1280×720, không có audio stream |

E2E dùng SQLite, khóa phiên và cổng riêng; SMTP bị vô hiệu hóa, không gửi email hoặc thu tiền thật. Ca skip là sửa danh mục trên mobile vì cùng luồng đã chạy trên desktop. Fixture ký phiên kiểm tra hành vi sau đăng nhập, không chứng minh giao thư OTP thật. Một số E2E mock lỗi hoặc phản hồi AI có chủ đích; không tính tất cả 47 lượt là lời gọi AI thật.

Bộ 25 tình huống chạy trên server local 3000, model phân tích `qwen3.5:9b-q8_0`; trung vị phần gọi AI 3.040ms, p95 quan sát 3.315ms. Mẫu nhỏ, tuần tự, trên máy phát triển; không suy ra p95 production hay sức chịu tải. Ba câu mới chạy production 3219 khoảng 3,0–3,1 giây/câu. Không cộng hai tập để công bố một tỷ lệ chính xác tổng quát.

## Các lỗi lần trước đã cải thiện

- **Ngân sách 10.000đ:** UI và API nay nêu không có gói đáp ứng; các gói là phương án tham khảo, không gắn “phù hợp nhất”.
- **Tiền trả trước:** kiểm tra giới hạn khi có nhập; khi chưa có, hiển thị rõ chưa xác nhận tổng tiền. Chưa coi thuế/tên miền/dịch vụ bổ sung là số tiền đã xác minh.
- **CDN chưa biết:** giải thích đề xuất dùng dữ kiện server, giữ “Chưa xác minh”; không để model tự viết giá hoặc trạng thái tính năng trong luồng này.
- **Lead hỏng:** chặn tên trắng/điện thoại sai; giữ các lead hợp lệ khi có bản ghi hỏng. Unit hồi quy và browser flow mới đạt.
- **Lối vào tư vấn:** CTA “Tư vấn chọn hosting” đã hiện và bấm được trên web desktop/mobile.
- **Test lệch đăng nhập/phiên bản:** bộ E2E hiện tại đạt với phiên quản trị kiểm thử hợp lệ; không bỏ bảo vệ truy cập.
- **Bàn giao:** đã có [GitHub prerelease 2.0.9 r2](https://github.com/minhnhatdepzai/HOSTORA-AI/releases/tag/v2.0.9-review-20261029-r2) cùng APK/source/video/SHA. Không còn dùng v1.5.0 làm bằng chứng cho bản mới.

## Hai lỗi mới cần sửa trước khi nộp

### 1. Phủ định nhu cầu tên miền bị đảo nghĩa

Input mới: “Tôi làm blog du lịch, 1000 lượt truy cập mỗi tháng, ngân sách 100000 đồng mỗi tháng, **không cần mua kèm tên miền**.”

Kỳ vọng `needsDomain: false`; API thật trả **true** và coi các trường đã đủ, không hỏi lại. Lỗi này có thể làm thay đổi thứ tự gói vì tên miền nay có trọng số thật.

Nguyên nhân xác nhận tại `lib/advisor-analysis.ts:27`: regex phủ định không nhận “mua kèm”, nhưng regex khẳng định ở dòng 28 lại bắt được chuỗi “cần mua kèm tên miền” nằm bên trong câu phủ định. Gọi trực tiếp `reconcileAnalysis` với đầu vào model đã đúng `needsDomain:false` cũng bị đổi thành true. Vì vậy đây không chỉ là bất định của LLM.

### 2. Chủ đề bài viết bị nhầm thành chức năng website

Input mới: “Tôi làm **blog chia sẻ kinh nghiệm bán hàng, chỉ đăng bài viết, không kinh doanh trên web**. Dự kiến 3000 lượt mỗi tháng, ngân sách 150000 đồng mỗi tháng, đã có tên miền.”

Kỳ vọng blog, `ecommerce:false`; API thật trả **store**, `ecommerce:true`.

Nguyên nhân xác nhận tại `lib/advisor-analysis.ts:16–25`: cụm “bán hàng” kích hoạt quy tắc commerce, nhưng “không kinh doanh” không nằm trong mẫu phủ định. Hàm hậu xử lý ghi đè cả kết quả model đúng `blog/ecommerce:false` thành store/true.

Hướng khắc phục: xử lý ý định và phạm vi phủ định theo mệnh đề, phân biệt “nội dung nói về bán hàng” với “website có chức năng đặt mua”; không tự ghi đè khi bằng chứng mâu thuẫn. Yêu cầu người dùng xác nhận trường không chắc. Bổ sung paraphrase/negation vào tập test độc lập; không chỉ thêm đúng hai chuỗi này vào regex rồi kết luận hiểu tiếng Việt tốt.

Ca đối chứng “1.200.000đ cho cả năm” trả đúng ngân sách 100.000đ/tháng. Ba câu mới là kiểm tra định hướng tìm lỗi, không phải mẫu ngẫu nhiên đại diện để công bố tỷ lệ lỗi sản phẩm.

## Ma trận ít nhất 6 ca — kết quả hiện tại

| ID | Tình huống | Kết quả |
|---|---|---|
| R01 | Vào từ CTA trang chủ, đi wizard, nhận top 3 | Đạt E2E desktop/mobile |
| R02 | Bảng so sánh 3 gói | Đạt trong luồng rubric |
| R03 | Chọn gói thay thế, lưu lead, xem/xóa bằng phiên quản trị | Đạt E2E |
| R04 | Ngân sách 10.000đ/tháng | Đạt: no-match và phương án tham khảo |
| R05 | Tiền trả trước không đủ | Đạt bộ advisor |
| R06 | Tên trắng/số toàn dấu +, bản ghi hỏng | Đạt hồi quy unit/E2E |
| R07 | Input API rỗng và mất kết nối catalog | Đạt: 400 hoặc UI lỗi/retry theo ca |
| R08 | AI phân tích câu bán mỹ phẩm của lần trước | Đạt trong bộ 25 ca |
| R09 | CDN null và nội dung client cố chèn giá sai | Đạt giải thích có kiểm soát |
| R10 | “Không cần mua kèm tên miền” | **Không đạt**, true thay vì false |
| R11 | Blog viết về kinh nghiệm bán hàng | **Không đạt**, store thay vì blog |
| R12 | Ngân sách cả năm | Đạt: quy đổi 1.200.000/năm → 100.000/tháng |

Đã vượt điều kiện số lượng 6 ca. Điều cần bảo vệ trước giám khảo là ca có ý nghĩa, có dữ liệu và kết quả, cả ca thất bại; không phải chỉ tổng số assertion.

## Những khoảng trống quyết định khả năng cạnh tranh

1. **Chưa có link chạy app/backend độc lập ngoài mạng local.** GitHub release là link tải bộ nộp, không tương đương link online tương tác. Cần để người khác mở qua 4G, đi hết tư vấn và gọi AI thật mà không cần sửa LAN/USB. Nếu chỉ demo tại chỗ, kiểm tra điều kiện sân khấu và chuẩn bị bản quay dự phòng.
2. **Chưa chứng minh chủ shop dùng dễ và ra quyết định tốt hơn.** Làm 5–10 phiên dùng thử có quan sát, ghi thời gian hoàn thành, hiểu nhầm ngân sách, giá gia hạn và tổng tiền. Mẫu nhỏ chỉ là bằng chứng định tính, chưa phải xác nhận thị trường.
3. **Trọng số xếp hạng vẫn là quy tắc tự thiết kế.** Đã bỏ suy đoán tải từ GB và phân biệt website/domain; vẫn cần giải thích vì sao trọng số phù hợp và so với baseline đơn giản theo ngân sách. Chưa hiệu chỉnh bằng dữ liệu người dùng hoặc benchmark từng gói.
4. **AI có giá trị nhưng cần trình bày đúng vai trò.** Trong giải thích đề xuất, model chọn fact ID; câu cuối được dựng từ dữ kiện an toàn. Đây là thiết kế kiểm soát tốt, nhưng không nên thuyết trình như AI tự tính giá hoặc tự quyết định gói. Cho thấy AI tiết kiệm nhập liệu/giải thích ở trường hợp thực, và chứng minh trạng thái khi AI không khả dụng.
5. **Phản biện chiếm 15 điểm.** Chuẩn bị prompt thật → lỗi thật → quyết định sửa → test trước/sau. Tự giải thích vì sao một lead hỏng không che các lead tốt, tại sao model không có quyền đổi giá và khi nào kết luận không có gói phù hợp.
6. **Video hiện 46 giây không tiếng.** Đã có artifact đúng phiên bản; chưa thay thế câu chuyện trình bày. Nên có lời dẫn hoặc phụ đề: người dùng gặp gì, app giúp quyết định gì, một ca thường và một ca biên. Tuân theo thời lượng chính thức, không tự coi thêm lời là yêu cầu bắt buộc nếu rubric không nói.

Ưu tiên: sửa hai lỗi hậu xử lý → test với câu độc lập → URL truy cập bên ngoài → diễn tập demo/phản biện → thử với chủ shop. Chưa cần thêm tính năng lớn, hiệu ứng hoặc model mới để nhắm top 10.

## Hành trình và ảnh bằng chứng mới

1. **Trang chủ desktop/mobile — tốt hơn:** CTA vào tư vấn rõ, đã bấm qua wizard.

![Trang chủ desktop](../../output/judge-review-2026-10-29/desktop-home.png)

![Trang chủ mobile](../../output/judge-review-2026-10-29/mobile-home.png)

2. **Nhập nhu cầu — luồng form hoạt động:** mobile web xếp mô tả AI trước wizard nên cần cuộn; các câu tự nhiên mới vẫn có lỗi nêu trên.

![Wizard desktop](../../output/judge-review-2026-10-29/desktop-wizard.png)

3. **Kết quả ngân sách thấp — đã sửa đúng thông điệp:** không gắn lựa chọn “phù hợp nhất” khi không đủ điều kiện.

![No match desktop](../../output/judge-review-2026-10-29/desktop-no-match.png)

![No match mobile](../../output/judge-review-2026-10-29/mobile-no-match.png)

4. **APK bước tên miền → kết quả — tải dữ liệu được:** kiểm tra mới bắt đầu từ bước 4 đang có sẵn trên thiết bị, không tuyên bố đã đi lại toàn bộ native onboarding/4 bước/lưu lead. Không gửi dữ liệu cá nhân thật.

![Android bước 4](../../output/judge-review-2026-10-29/android-current.png)

![Android kết quả](../../output/judge-review-2026-10-29/android-result.png)

Ở ảnh Android, đoạn giải thích ngân sách dài đẩy phần giá/lựa chọn xuống thấp. Có thể rút gọn thông điệp chính và đặt chi tiết trong phần mở rộng, vẫn giữ cảnh báo tiền trả trước. Đây là đề xuất UX, không phải lỗi tính toán. Chưa audit screen reader, focus order và tương phản đầy đủ; không tuyên bố WCAG đạt từ ảnh.

## Nguồn bằng chứng và phạm vi

- [Kết quả E2E mới](../../output/judge-review-2026-10-29/e2e.json).
- [25 ca tư vấn mới](../../output/judge-review-2026-10-29/ai/results.json), [tóm tắt](../../output/judge-review-2026-10-29/ai/summary.json).
- [Ba câu chưa có trong bộ test](../../output/judge-review-2026-10-29/unseen-cases.json).
- [Bằng chứng hàm hậu xử lý đổi đầu vào đúng thành sai](../../output/judge-review-2026-10-29/reconcile-proof.json).
- Log typecheck/lint/unit/build/AI/mobile được lưu cùng thư mục `output/judge-review-2026-10-29/`.
- GitHub release đã đọc trực tiếp qua GitHub MCP; xác nhận tag prerelease, 4 asset và digest. Kiểm tra SHA local cả 3 artifact đạt. Không cài lại toàn bộ ZIP trên máy thứ hai trong lượt đánh giá này.

Không có thay đổi tính năng hoặc sửa lỗi sản phẩm trong lượt đánh giá. Chưa so sánh 264 đội còn lại, chưa chấm phần nói thực tế, chưa chạy tải đồng thời đại diện, chưa đánh giá toàn bộ chatbot/Studio, chưa tái xác minh giá nhà cung cấp. Những giới hạn này không bị thay thế bằng số lượng test hoặc số công nghệ trong repo.
