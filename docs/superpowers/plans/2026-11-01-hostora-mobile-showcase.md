# HOSTORA Mobile Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp motion và trải nghiệm ba hành trình chính của HOSTORA Android, cài APK mới lên Redmi và tạo hồ sơ giám khảo với 9 ca kiểm thử có bằng chứng.

**Architecture:** Tách thông số motion và validation wizard thành module thuần để test được; UI dùng Reanimated hiện có cho transform/opacity và Expo Router cho chuyển màn. Màn `judge.tsx` tiêu thụ manifest 5 tính năng/9 ca; script kiểm thử máy thật sinh JSON, ảnh và HTML để nộp.

**Tech Stack:** Expo 58, React Native 0.88, Expo Router, Reanimated 4, Vitest, Mobile MCP, ADB.

**Spec:** `docs/superpowers/specs/2026-11-01-hostora-mobile-showcase-design.md`

## Global Constraints

- Giữ hệ màu và font HOSTORA hiện tại; không thêm dependency.
- Motion chỉ dùng transform/opacity, có Reduce Motion và không quyết định logic nghiệp vụ.
- Không xóa dữ liệu app; cài đè bằng `pnpm android:update`.
- Không gửi đơn mua/email thật khi kiểm thử.
- Báo cáo phân biệt unit, native-device, failure simulation và giới hạn chưa đo.

## Review Focus

- Reduce Motion phải trả ngay trạng thái cuối, không để nội dung ẩn.
- Nhấn liên tục khi wizard đang chuyển bước không làm sai `step`.
- Giá null vẫn hiển thị “Chưa có giá công bố”, không biến thành 0đ.
- Backend mất kết nối phải ghi rõ dữ liệu lưu, không giả là dữ liệu trực tuyến.
- Cài đè APK phải giữ API base và yêu cầu đã lưu.

---

### Task 1: Motion contract và wizard guards

**Files:**

- Create: `mobile/src/lib/motion-spec.ts`
- Create: `mobile/src/lib/consult-guard.ts`
- Create: `tests/mobile-showcase.test.ts`

**Interfaces:**

- Produces: `motion`, `canContinueConsult(step, requirements)` và manifest 9 ca dùng cho UI/test.

- [ ] Viết test thất bại cho duration/easing/reduced-motion và biên lượt truy cập, ngân sách, trả trước.
- [ ] Chạy test để xác nhận RED vì module chưa tồn tại.
- [ ] Cài đặt module thuần tối thiểu.
- [ ] Chạy test để xác nhận GREEN.

### Task 2: Motion system và ba hành trình chính

**Files:**

- Modify: `mobile/src/components/motion.tsx`
- Modify: `mobile/src/components/pressable.tsx`
- Modify: `mobile/src/components/ui.tsx`
- Modify: `mobile/src/app/_layout.tsx`
- Modify: `mobile/src/app/(tabs)/consult.tsx`
- Modify: `mobile/src/app/(tabs)/products.tsx`
- Modify: `mobile/src/app/recommendations.tsx`

**Interfaces:**

- Consumes: Task 1 motion contract và guard.
- Produces: `MotionPressable`, `StepTransition`, `AnimatedProgress` và route transition nhất quán.

- [ ] Dùng motion contract cho press feedback, section reveal và screen transition.
- [ ] Thay wizard step tức thời bằng transition có hướng, progress bằng scaleX.
- [ ] Stagger có giới hạn cho danh mục/kết quả; Reduce Motion hiển thị tĩnh.
- [ ] Chạy mobile typecheck/lint.

### Task 3: Hồ sơ vòng loại trong app

**Files:**

- Create: `mobile/src/lib/judge-showcase.ts`
- Create: `mobile/src/app/judge.tsx`
- Modify: `mobile/src/app/_layout.tsx`
- Modify: `mobile/src/app/(tabs)/index.tsx`
- Test: `tests/mobile-showcase.test.ts`

**Interfaces:**

- Produces: danh sách 5 tính năng, demo 2 phút và 9 ca kiểm thử có route thật.

- [ ] Viết test thất bại: đúng 5 tính năng, đúng 9 ca gồm 3 normal/3 invalid/3 edge.
- [ ] Xác nhận RED vì manifest chưa tồn tại.
- [ ] Cài đặt manifest và màn judge; thêm lối vào có accessible name ở Trang chủ.
- [ ] Chạy test để xác nhận GREEN.

### Task 4: Bộ 9 ca và báo cáo giám khảo

**Files:**

- Create: `scripts/mobile-judge-suite.mjs`
- Create: `scripts/render-mobile-judge-report.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes: manifest Task 3, app đã cài và backend USB.
- Produces: `output/judge-mobile-<timestamp>/result.json`, 9 kết quả, ảnh máy thật và `docs/submission/HOSTORA_MOBILE_9_CASES.html`.

- [ ] Chạy 9 ca: 3 bình thường, 3 không hợp lệ, 3 biên/sự cố; mỗi ca ghi expected/observed/evidence.
- [ ] Sinh HTML một trang mở là hiểu ngay, không cần đọc source.
- [ ] Kiểm tra report có đủ 9 ca và không chứa PII.

### Task 5: Release và xác minh máy thật

**Files:**

- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`

**Interfaces:**

- Produces: APK phiên bản 2.2.0/versionCode 23 đã cài đè và bộ bằng chứng cuối.

- [ ] Chạy `pnpm agent:verify`, test UI/mobile và `git diff --check`.
- [ ] Build/cài bằng `pnpm android:update`; xác nhận version, dữ liệu giữ nguyên.
- [ ] Đi lại Home → Hồ sơ → Chọn gói → Kết quả → Dịch vụ trên Redmi, lưu ảnh và kiểm tra logcat crash.
- [ ] Chạy bộ 9 ca, mở report, kiểm tra trực quan và ghi rõ mọi blocker còn lại.
