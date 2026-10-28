import { describe, expect, it } from "vitest";
import {
  adminSessionCookie,
  clearedAdminSessionCookie,
  issueAdminSession,
  safeAdminNextPath,
  sameOrigin,
  verifyAdminSession,
} from "@/lib/payments/admin-auth";

describe("quản trị thanh toán", () => {
  const config = { password: "mat-khau-quan-tri-du-dai", secret: "session-secret-at-least-32-characters" };

  it("từ chối mật khẩu sai hoặc cấu hình thiếu", () => {
    expect(issueAdminSession("sai", config)).toBeNull();
    expect(issueAdminSession(config.password, { ...config, secret: "" })).toBeNull();
  });

  it("ký phiên có thời hạn và từ chối token bị sửa", () => {
    const token = issueAdminSession(config.password, config, 1_000_000);
    expect(token).toBeTruthy();
    expect(verifyAdminSession(token!, config, 1_001_000)).toBe(true);
    expect(verifyAdminSession(`${token}x`, config, 1_001_000)).toBe(false);
    expect(verifyAdminSession(token!, config, 1_000_000 + 9 * 60 * 60 * 1000)).toBe(false);
  });

  it("so khớp Origin với Host công khai khi Next dùng URL nội bộ", () => {
    const request = new Request("http://localhost:3000/api/admin/payments/login", {
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
    });
    expect(sameOrigin(request)).toBe(true);
    expect(sameOrigin(new Request(request.url, { headers: { host: "127.0.0.1:3100", origin: "http://evil.example" } }))).toBe(false);
  });

  it("đặt cookie cho toàn bộ trang quản trị và chỉ nhận đường dẫn nội bộ", () => {
    expect(adminSessionCookie("signed-token", false)).toContain("Path=/;");
    expect(adminSessionCookie("signed-token", false)).not.toContain("Path=/api/admin/payments");
    expect(clearedAdminSessionCookie(false)).toContain("Path=/;");
    expect(safeAdminNextPath("/admin/orders?queue=paid")).toBe("/admin/orders?queue=paid");
    expect(safeAdminNextPath("https://evil.example/admin")).toBe("/admin");
    expect(safeAdminNextPath("//evil.example/admin")).toBe("/admin");
  });
});
