# HOSTORA 2.0.9 — chấm lại với mục tiêu top 10/265

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
