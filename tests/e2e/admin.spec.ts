import { expect, test } from "@playwright/test";
import { PaymentStore } from "@/lib/payments/store";
import { authenticateAdmin } from "./helpers/admin-session";

const lead = {
  id: "judge-lead",
  name: "Khách kiểm thử",
  phone: "0900000000",
  plan: "Hostinger Premium",
  createdAt: "2026-10-24T08:00:00.000Z",
  status: "new",
};

test.beforeEach(async ({ page, context, baseURL }) => {
  await authenticateAdmin(context, baseURL!);
  await page.addInitScript((value) => {
    localStorage.setItem("hostora:leads", JSON.stringify([value]));
    localStorage.setItem(
      "hostora:requirements",
      JSON.stringify({
        websiteType: "store",
        monthlyVisits: 5000,
        monthlyBudget: 300000,
        needsDomain: true,
        ecommerce: true,
      }),
    );
  }, lead);
});

test("admin controls local leads and shows service data", async ({ page }) => {
  let classificationRequest: Record<string, unknown> = {};
  await page.route("**/api/ai/lead", async (route) => {
    classificationRequest = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        segment: "new-site",
        unansweredQuestions: ["Khi nào cần mở website?"],
        suggestedNextMessage: "Mình có thể hỗ trợ bạn chuẩn bị gói phù hợp.",
      }),
    });
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Doanh thu và nhịp tăng trưởng." }),
  ).toBeVisible();
  await expect(
    page.getByText("Khách kiểm thử", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("service-manager")).toBeVisible();

  await page
    .getByLabel("TRẠNG THÁI", { exact: true })
    .selectOption("qualified");
  await expect(
    page.getByText("Đã cập nhật trạng thái khách hàng."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hostora:leads") ?? "[]").at(0)?.status,
    ),
  ).toBe("qualified");

  await page
    .getByRole("button", { name: "Phân nhóm nhu cầu của Khách kiểm thử" })
    .click();
  await expect(
    page.getByText("Đã phân nhóm nhu cầu mà không gửi tên hoặc số điện thoại."),
  ).toBeVisible();
  expect(classificationRequest).not.toHaveProperty("name");
  expect(classificationRequest).not.toHaveProperty("phone");
});

test("admin shows consultation requests submitted from the app", async ({
  page,
}) => {
  await page.route("**/api/admin/payments/orders", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 25,
          pageCount: 0,
          counts: {
            all: 0,
            awaitingPayment: 0,
            paid: 0,
            refunds: 0,
            cancelled: 0,
          },
          financials: { recognizedPaidOrders: 0, recognizedRevenueVnd: 0 },
        },
      }),
    });
  });
  await page.route("**/api/admin/payments/requests", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        page: {
          items: [
            {
              id: "HSR-123456789A",
              productId: "vietnix-business",
              provider: "Vietnix",
              productName: "Business Hosting",
              contact: "judge-mobile@hostora.invalid",
              note: "Cần tư vấn trước khi mua",
              profile: {
                customerName: "Khách từ máy ảo",
                phone: "0900000000",
                companyName: "Cửa hàng kiểm thử",
                businessType: "Bán lẻ",
                currentWebsite: "",
                mainOffer: "Sản phẩm gia dụng",
                serviceArea: "Đà Nẵng",
                seoGoals: "Tìm kiếm địa phương",
                websiteStatus: "idea",
                websiteGoal: "Nhận yêu cầu tư vấn",
                targetCustomers: "Khách hàng tại Đà Nẵng",
                estimatedTraffic: "under_1k",
                budgetRange: "500k_1m",
              },
              consultationPreference: "scheduled",
              consultationAt: "2026-11-05T02:00:00.000Z",
              consultationChannel: "phone",
              voucherCode: null,
              baseAmountVnd: 1_200_000,
              monthlyVnd: 100_000,
              billingMonths: 12,
              priceVerifiedAt: "2026-10-23",
              pricingNote: "Giá kiểm thử đã chốt",
              cancelReason: null,
              status: "new",
              invoiceId: null,
              createdAt: "2026-11-04T15:00:00.000Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          pageCount: 1,
          counts: { all: 1, new: 1, invoiced: 0, declined: 0, cancelled: 0 },
        },
      }),
    });
  });

  await page.goto("/admin");

  const consultationSection = page.locator("#khach-hang");
  await expect(
    consultationSection.getByText("Khách từ máy ảo", { exact: true }),
  ).toBeVisible();
  await expect(
    consultationSection.getByText("Business Hosting", { exact: true }),
  ).toBeVisible();
  await expect(
    consultationSection.getByText("judge-mobile@hostora.invalid", {
      exact: true,
    }),
  ).toBeVisible();
});

test("admin uses the selected plan price and only adds explicit extras", async ({
  page,
}) => {
  const store = new PaymentStore(process.env.HOSTORA_PAYMENTS_DB_PATH);
  const request = store.createSaleRequest({
    productId: "hostinger-premium",
    provider: "Hostinger",
    productName: "Premium",
    contact: "line-items-e2e@example.com",
    profile: {
      customerName: "Khách kiểm thử hóa đơn",
      phone: "",
      companyName: "Cửa hàng Hạt Mộc",
      businessType: "Bán lẻ trực tuyến",
      currentWebsite: "",
      mainOffer: "Quà tặng thủ công",
      serviceArea: "Toàn quốc",
      seoGoals: "quà tặng thủ công",
      websiteStatus: "idea",
      websiteGoal: "Tạo website bán hàng và nhận thanh toán",
      targetCustomers: "Người mua quà tặng tại Việt Nam",
      estimatedTraffic: "under_1k",
      budgetRange: "1m_3m",
    },
    consultationPreference: "ai",
    consultationChannel: "email",
  });
  store.close();

  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "Yêu cầu mua" }).click();
  const card = page.locator("article", { hasText: request.id });
  await expect(card.getByText("Hostinger Premium", { exact: true })).toBeVisible();
  await expect(card.getByLabel("Giá gói khách đã chọn")).toContainText("1.867.200");
  await expect(card.getByPlaceholder("Giá đã chốt (VND)")).toHaveCount(0);

  await card.getByRole("button", { name: "Thêm hạng mục" }).click();
  await card.getByLabel("Tên hạng mục").fill("Thiết lập email doanh nghiệp");
  await card.getByLabel("Ghi chú", { exact: true }).fill("5 tài khoản email");
  await card.getByLabel("Thành tiền (VND)").fill("250000");
  await expect(card.getByRole("button", { name: /Tạo & gửi hóa đơn/ })).toContainText("2.117.200");
  await card.getByRole("button", { name: /Tạo & gửi hóa đơn/ }).click();
  await expect(page.getByRole("status")).toContainText("Đã tạo hóa đơn");

  const verify = new PaymentStore(process.env.HOSTORA_PAYMENTS_DB_PATH);
  const invoice = verify.listInvoicesPage({
    search: "line-items-e2e@example.com",
    page: 1,
    pageSize: 25,
  }).items[0];
  expect(invoice).toMatchObject({
    baseAmountVnd: 1_867_200,
    subtotalVnd: 2_117_200,
    amountVnd: 2_117_200,
  });
  expect(invoice.lineItems).toEqual([
    expect.objectContaining({ kind: "base", amountVnd: 1_867_200 }),
    expect.objectContaining({ kind: "addon", label: "Thiết lập email doanh nghiệp", amountVnd: 250_000 }),
  ]);
  verify.close();
});

test("admin must approve customer cancellation requests before data is cancelled", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-desktop",
    "The state-changing approval flow runs once on desktop.",
  );
  const store = new PaymentStore(process.env.HOSTORA_PAYMENTS_DB_PATH);
  const invoice = store.createInvoice({
    title: "Hosting chờ admin xác nhận hủy",
    amountVnd: 420_000,
    customerEmail: "cancel-e2e@example.com",
  });
  store.requestCancel(
    invoice.id,
    invoice.accessCode,
    "Khách đổi kế hoạch triển khai",
  );
  const saleRequest = store.createSaleRequest({
    productId: "hosting-cancel-e2e",
    provider: "HOSTORA",
    productName: "Website bán hàng chờ duyệt hủy",
    contact: "cancel-request-e2e@example.com",
    profile: {
      customerName: "Khách kiểm thử hủy mua",
      phone: "",
      companyName: "Cửa hàng E2E",
      businessType: "Bán lẻ trực tuyến",
      currentWebsite: "",
      mainOffer: "Sản phẩm gia dụng",
      serviceArea: "Toàn quốc",
      seoGoals: "Tìm kiếm sản phẩm",
      websiteStatus: "idea",
      websiteGoal: "Tạo website nhận đơn hàng trực tuyến",
      targetCustomers: "Người mua hàng trực tuyến tại Việt Nam",
      estimatedTraffic: "under_1k",
      budgetRange: "500k_1m",
    },
    consultationPreference: "ai",
    consultationChannel: "email",
  });
  store.cancelSaleRequest(
    saleRequest.id,
    saleRequest.accessCode,
    "Khách muốn dừng yêu cầu mua",
  );
  store.close();

  await page.goto("/admin/orders");
  await page
    .getByRole("button", { name: `Mở chi tiết đơn ${invoice.id}` })
    .click();
  const invoiceApproval = page
    .getByRole("heading", {
      name: "Xử lý yêu cầu hủy đơn chưa thanh toán",
    })
    .locator("..");
  await invoiceApproval
    .getByLabel(`Ghi chú xử lý hủy đơn ${invoice.id}`)
    .fill("Đã đối chiếu và xác nhận đơn chưa phát sinh thanh toán.");
  await invoiceApproval
    .getByRole("button", { name: "Xác nhận hủy" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Đã ghi nhận quyết định",
  );
  await page.getByRole("button", { name: "Đóng chi tiết đơn" }).click();

  await page.getByRole("button", { name: "Yêu cầu mua" }).click();
  const requestCard = page
    .getByRole("article")
    .filter({ hasText: saleRequest.id });
  await expect(requestCard).toContainText("Cần xác nhận hủy");
  await requestCard
    .getByLabel(`Ghi chú xử lý yêu cầu ${saleRequest.id}`)
    .fill("Đã kiểm tra hồ sơ và xác nhận dừng yêu cầu mua.");
  await requestCard
    .getByRole("button", { name: "Xác nhận hủy" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Đã xác nhận hủy yêu cầu mua",
  );

  const verified = new PaymentStore(process.env.HOSTORA_PAYMENTS_DB_PATH);
  expect(verified.getInvoice(invoice.id)?.status).toBe("cancelled");
  expect(
    verified.listSaleRequests().find((item) => item.id === saleRequest.id)
      ?.status,
  ).toBe("cancelled");
  verified.close();
});

test("admin remains usable without horizontal overflow", async ({ page }) => {
  await page.goto("/admin");
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  const menuButton = page.getByRole("button", { name: "Mở menu quản trị" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  await expect(page.getByRole("navigation").last()).toBeVisible();
});

test("support inbox keeps existing conversations and explains a failed refresh", async ({
  page,
}) => {
  let failRefresh = false;
  const conversation = {
    id: "conversation-refresh-regression",
    customerId: null,
    customerName: "Khách chưa đăng nhập",
    customerEmail: null,
    status: "escalated",
    escalationReason: "out_of_scope",
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T08:01:00.000Z",
    messages: [
      {
        id: "message-refresh-regression",
        conversationId: "conversation-refresh-regression",
        role: "user",
        content: "HOSTORA có bán vé máy bay không?",
        sources: [],
        createdAt: "2026-11-01T08:00:00.000Z",
      },
    ],
  };

  await page.route("**/api/admin/support", async (route) => {
    if (failRefresh) return route.abort("internetdisconnected");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ cases: [] }),
    });
  });
  await page.route("**/api/admin/ai-conversations**", async (route) => {
    if (failRefresh) return route.abort("internetdisconnected");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        conversations: [conversation],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          allTotal: 1,
          escalatedTotal: 1,
        },
      }),
    });
  });

  await page.goto("/admin/support");
  await expect(
    page.getByText("HOSTORA có bán vé máy bay không?"),
  ).toBeVisible();

  failRefresh = true;
  await page.getByRole("button", { name: "Tải lại" }).click();

  await expect(page.getByRole("status")).toContainText(
    "Chưa tải được hộp thư hỗ trợ.",
  );
  await expect(
    page.getByText("HOSTORA có bán vé máy bay không?"),
  ).toBeVisible();
});
