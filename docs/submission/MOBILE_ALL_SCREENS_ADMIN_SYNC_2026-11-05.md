# HOSTORA 2.2.3 — bàn phím toàn app và đồng bộ Android → Admin

**Ngày nghiệm thu:** 05/11/2026 (UTC+7)

**Thiết bị:** Android Emulator `JAPANO_API_36`, Android 16, serial rút gọn `emu…554`

**APK đã cài:** `com.hostora.ai` 2.2.3, versionCode 26, kiến trúc x86_64

**Web production local:** Next.js tại `127.0.0.1:3200`; web và admin cùng dùng dữ liệu runtime hiện có

Đây là bằng chứng kiểm thử trên APK native và web quản trị thật của máy demo. Browser mobile viewport không được dùng thay cho APK. Dữ liệu bên dưới là dữ liệu kiểm thử, không phải khách hàng hoặc doanh thu production.

## Kết quả chốt

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Bàn phím toàn app | **Đạt** | Root app dùng `KeyboardSafeView`; Android dùng `softwareKeyboardLayoutMode: resize`; input và CTA giữ trên bàn phím. |
| Modal có input | **Đạt** | Modal mua hàng và bảng màu có vùng tránh bàn phím riêng vì modal dùng native window khác root. |
| Hành vi cuộn | **Đạt** | Form giữ được thao tác chạm khi bàn phím mở và kéo để đóng bàn phím. |
| Đăng nhập/đăng ký | **Đạt** | Trường nhập vẫn nhìn thấy khi IME mở; cài đè APK không xóa SecureStore hoặc phiên hiện có. |
| Hỏi đáp AI | **Đạt** | Tin nhắn ngoài phạm vi được chuyển quản trị viên; app polling và hiện phản hồi trong đúng hội thoại. |
| Đơn tư vấn Android → Admin | **Đạt** | Yêu cầu kiểm thử `HSR-0193119DF5` tạo từ APK xuất hiện ở `/admin/orders`. |
| Maestro native | **Đạt** | `HOSTORA_ANDROID_DEVICE=emulator-5554 pnpm test:mobile:e2e`: 1/1 flow đạt trong 1 phút 14 giây, không clear app data. |
| Crash hiện tại | **Đạt** | Mobile MCP trả danh sách crash rỗng sau lượt kiểm thử; app đang ở foreground tại màn kết quả, bàn phím đã ẩn. |
| Bộ giám khảo mobile | **Đạt** | `pnpm test:mobile:judge`: 9/9; báo cáo HTML đã cập nhật theo APK 2.2.3. |
| Regression source | **Đạt** | `pnpm agent:verify`: 59 file, 314 test; typecheck, lint, build và Ollama loopback thật đạt. |
| Web/admin cách ly | **Đạt** | Playwright 57 đạt, 1 bỏ qua có chủ đích; audit 12 bề mặt không có axe finding, page error hoặc overflow. |

## Các màn Android đã kiểm tra với bàn phím mở

1. Hỏi đáp: vùng soạn tin nhắn nằm trên IME, nút gửi còn chạm được.
2. Kết nối dịch vụ: trường URL nằm trên IME; nội dung nhập nhìn thấy được.
3. Đăng nhập và đăng ký: form có thể cuộn, CTA không bị che.
4. Modal yêu cầu mua/tư vấn: các trường dài cuộn được và kéo form sẽ đóng IME.
5. SEO analyzer: URL và CTA nằm trong vùng nhìn thấy.
6. Readiness, đơn hàng, tên miền và website analyzer: trường nhập không bị IME che.
7. Bảng màu: modal có `TextInput` dùng vùng tránh bàn phím riêng.

Ảnh trực tiếp từ emulator:

- [Kết nối dịch vụ khi bàn phím mở](../evidence/mobile-keyboard-settings-2.2.3.png)
- [Đăng nhập khi bàn phím mở](../evidence/mobile-keyboard-login-2.2.3.png)
- [Modal mua hàng khi bàn phím mở](../evidence/mobile-keyboard-purchase-modal-2.2.3.png)
- [SEO analyzer khi bàn phím mở](../evidence/mobile-keyboard-seo-2.2.3.png)
- [Bộ gõ VNI trên emulator](../evidence/mobile-keyboard-vni-2.2.3.png)

## Luồng Android → Web Admin đã kiểm chứng

### Yêu cầu tư vấn/mua hàng

1. Trên APK, người dùng điền form và gửi yêu cầu.
2. API lưu hồ sơ kiểm thử `HSR-0193119DF5`.
3. Admin mở `/admin/orders` và thấy đúng yêu cầu cùng thông tin khách kiểm thử.

Bằng chứng:

- [Xác nhận yêu cầu trên Android](../evidence/mobile-admin-sync-request-2.2.3.png)
- [Khách kiểm thử trên admin](../evidence/admin-mobile-sync-customer-2.2.3.png)
- [Yêu cầu kiểm thử trên admin](../evidence/admin-mobile-sync-request-2.2.3.png)

### Tin nhắn ngoài phạm vi → quản trị viên → Android

Câu hồi quy: `Cho tôi lịch thi đấu bóng đá World Cup 2030 và dự báo tỉ số.`

1. Classifier nhận đây là yêu cầu trực tiếp ngoài phạm vi HOSTORA, dù câu không có dấu hỏi.
2. Android hiện **Đã chuyển quản trị viên**; conversation `9668f30e-ad11-4ede-8f17-f1beb97e7f85` chuyển sang trạng thái chờ.
3. `/admin/support` hiện **Chờ quản trị viên · Ngoài phạm vi HOSTORA**.
4. Admin gửi phản hồi.
5. Android polling thread và hiện phản hồi có nhãn **Quản trị viên HOSTORA** trong đúng cuộc trò chuyện.

Bằng chứng:

- [Android đã chuyển quản trị viên](../evidence/mobile-chat-escalated-2.2.3.png)
- [Admin nhận hội thoại](../evidence/admin-chat-escalated-2.2.3.png)
- [Admin đã gửi phản hồi](../evidence/admin-chat-replied-2.2.3.png)
- [Android nhận phản hồi admin](../evidence/mobile-chat-admin-reply-2.2.3.png)

Test hồi quy `tests/ai-escalation.test.ts` giữ trường hợp này để tránh AI quay lại trả lời đoán về nội dung ngoài knowledge HOSTORA.

## Lệnh tái lập

```bash
HOSTORA_ANDROID_DEVICE=emulator-5554 pnpm test:mobile:e2e
pnpm test:mobile:judge
pnpm agent:verify
pnpm test:e2e:isolated
pnpm audit:ui
```

Không uninstall và không `pm clear` trước khi chạy. APK được cài đè để kiểm tra phiên đăng nhập, lịch sử và SecureStore vẫn tồn tại.

## Giới hạn và trạng thái phát hành

- 2.2.3 trong báo cáo là APK x86_64 đã cài trên emulator và source hiện tại; chưa phải APK universal công khai.
- Link GitHub Release công khai vẫn trỏ đến **2.2.2 universal** cho tới khi build đủ bốn ABI, kiểm tra metadata, checksum và đồng bộ Source ZIP/README.
- Admin E2E dùng phiên quản trị kiểm thử; SMTP trong kiểm thử cách ly không chứng minh email đã vào một Inbox công cộng.
- Kết quả local, 9/9 hay 314 test đạt không bảo đảm điểm tuyệt đối hoặc thứ hạng top 10.
