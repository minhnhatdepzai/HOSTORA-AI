import { beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/admin/payments/login/route";
import { GET as listOrders, POST as createOrder } from "@/app/api/admin/payments/orders/route";
import { GET as getOrderDetail } from "@/app/api/admin/payments/orders/[id]/route";
import { GET as listSaleRequests } from "@/app/api/admin/payments/requests/route";
import { POST as lookupOrder } from "@/app/api/payments/orders/route";
import { POST as createSaleRequest } from "@/app/api/payments/requests/route";

const origin = "http://127.0.0.1:3000";
const request = (path: string, body: unknown, cookie = "", method = "POST") => new Request(`${origin}${path}`, {
  method, headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});

beforeAll(() => {
  process.env.HOSTORA_PAYMENTS_DB_PATH = ":memory:";
  process.env.HOSTORA_ADMIN_PASSWORD = "test-admin-password-long-enough";
  process.env.HOSTORA_ADMIN_SESSION_SECRET = "test-admin-session-secret-long-enough";
});

describe("API hóa đơn", () => {
  it("bảo vệ quản trị và chỉ cho khách có mã riêng xem hóa đơn", async () => {
    const denied = await listOrders(new Request(`${origin}/api/admin/payments/orders`));
    expect(denied.status).toBe(401);
    const session = await login(request("/api/admin/payments/login", { password: "test-admin-password-long-enough" }));
    expect(session.status).toBe(200);
    const cookie = session.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(cookie).toContain("hostora_admin_session=");
    const created = await createOrder(request("/api/admin/payments/orders", {
      title: "Gói đối tác đã thỏa thuận", amountVnd: 400000,
      saleType: "partner_service", partnerProvider: "Vietnix", customerEmail: "khach@example.com",
    }, cookie));
    expect(created.status).toBe(201);
    const invoice = await created.json() as { id: string; accessCode: string; amountVnd: number; customerEmail: string };
    expect(invoice.amountVnd).toBe(400000);
    expect(invoice.customerEmail).toBe("khach@example.com");
    const wrong = await lookupOrder(request("/api/payments/orders", { id: invoice.id, accessCode: "bad" }));
    expect(wrong.status).toBe(404);
    const found = await lookupOrder(request("/api/payments/orders", { id: invoice.id, accessCode: invoice.accessCode }));
    expect(found.status).toBe(200);
  });

  it("lưu hồ sơ sản phẩm, thị trường và mục tiêu SEO từ cùng backend web/app", async () => {
    const created = await createSaleRequest(request("/api/payments/requests", {
      productId: "hostinger-web-hosting",
      contact: "seo-buyer@example.com",
      note: "Cần ra mắt trong tháng tới",
      profile: {
        customerName: "Nguyễn Minh Anh",
        phone: "0901234567",
        companyName: "Minh Anh Studio",
        businessType: "Thiết kế nội thất",
        currentWebsite: "minhanh.example",
        mainOffer: "Thiết kế và thi công nội thất căn hộ",
        serviceArea: "TP.HCM và Bình Dương",
        seoGoals: "thiết kế nội thất căn hộ, thi công nội thất",
        websiteStatus: "migrating",
        websiteGoal: "Nhận hồ sơ tư vấn từ khách hàng mới",
        targetCustomers: "Chủ căn hộ cần thiết kế trọn gói",
        estimatedTraffic: "1k_10k",
        budgetRange: "1m_3m",
      },
      consultationPreference: "ai",
      consultationAt: null,
      consultationChannel: "email",
      voucherCode: "",
    }));
    expect(created.status).toBe(201);

    const session = await login(request("/api/admin/payments/login", { password: "test-admin-password-long-enough" }));
    const cookie = session.headers.get("set-cookie")?.split(";")[0] ?? "";
    const response = await listSaleRequests(new Request(`${origin}/api/admin/payments/requests`, { headers: { cookie } }));
    const result = await response.json() as { page: { items: { profile: { mainOffer: string; serviceArea: string; seoGoals: string } }[] } };
    expect(result.page.items[0].profile).toMatchObject({
      mainOffer: "Thiết kế và thi công nội thất căn hộ",
      serviceArea: "TP.HCM và Bình Dương",
      seoGoals: "thiết kế nội thất căn hộ, thi công nội thất",
    });
  });

  it("trả trang hóa đơn đã lọc và bằng chứng đối soát cho quản trị", async () => {
    const session = await login(request("/api/admin/payments/login", { password: "test-admin-password-long-enough" }));
    const cookie = session.headers.get("set-cookie")?.split(";")[0] ?? "";
    const created = await createOrder(request("/api/admin/payments/orders", {
      title: "Gói cần tìm theo email",
      amountVnd: 625000,
      saleType: "hostora_service",
      customerEmail: "filter-me@example.com",
    }, cookie));
    const invoice = await created.json() as { id: string };

    const listed = await listOrders(new Request(
      `${origin}/api/admin/payments/orders?search=filter-me%40example.com&page=1&pageSize=25&sortBy=amountVnd&sortDirection=desc`,
      { headers: { cookie } },
    ));
    expect(listed.status).toBe(200);
    const result = await listed.json() as { page: { items: Array<{ id: string }>; total: number; counts: { all: number } } };
    expect(result.page.items.map((item) => item.id)).toContain(invoice.id);
    expect(result.page.total).toBeGreaterThanOrEqual(1);
    expect(result.page.counts.all).toBeGreaterThanOrEqual(1);

    const detail = await getOrderDetail(
      new Request(`${origin}/api/admin/payments/orders/${invoice.id}`, { headers: { cookie } }),
      { params: Promise.resolve({ id: invoice.id }) },
    );
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      invoice: { id: invoice.id, customerEmail: "filter-me@example.com" },
      events: [{ type: "created" }],
    });
  });
});
