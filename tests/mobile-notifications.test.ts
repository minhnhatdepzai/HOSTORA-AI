import { describe, expect, it } from "vitest";
import {
  countUnreadNotifications,
  createAppNotification,
  markNotificationRead,
  mergeAppNotifications,
} from "../mobile/src/lib/app-notifications";

describe("thông báo trong ứng dụng HOSTORA", () => {
  it("xếp thông báo mới nhất trước và loại bản trùng mã", () => {
    const first = createAppNotification(
      {
        id: "request-HSR-1",
        kind: "order",
        title: "Đã nhận yêu cầu mua",
        message: "HOSTORA đang chuẩn bị báo giá.",
      },
      "2026-10-28T05:00:00.000Z",
    );
    const updated = createAppNotification(
      { ...first, message: "HOSTORA đã cập nhật yêu cầu." },
      "2026-10-28T05:02:00.000Z",
    );
    const payment = createAppNotification(
      {
        id: "payment-HST-2-paid",
        kind: "payment",
        title: "Thanh toán đã ghi nhận",
        message: "Đơn HST-2 đã thanh toán.",
      },
      "2026-10-28T05:03:00.000Z",
    );

    const merged = mergeAppNotifications([first], [updated, payment]);

    expect(merged.map((item) => item.id)).toEqual([
      "payment-HST-2-paid",
      "request-HSR-1",
    ]);
    expect(merged[1]?.message).toBe("HOSTORA đã cập nhật yêu cầu.");
  });

  it("đếm chưa đọc và đánh dấu đúng một thông báo", () => {
    const items = [
      createAppNotification(
        { id: "one", kind: "order", title: "Một", message: "Nội dung" },
        "2026-10-28T05:00:00.000Z",
      ),
      createAppNotification(
        { id: "two", kind: "voucher", title: "Hai", message: "Nội dung" },
        "2026-10-28T05:01:00.000Z",
      ),
    ];

    expect(countUnreadNotifications(items)).toBe(2);
    const next = markNotificationRead(items, "one");
    expect(countUnreadNotifications(next)).toBe(1);
    expect(next.find((item) => item.id === "one")?.read).toBe(true);
  });
});
