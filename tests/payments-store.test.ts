import { describe, expect, it } from "vitest";
import { PaymentStore } from "@/lib/payments/store";
import type { PurchaseProfile } from "@/lib/payments/types";

const purchaseProfile: PurchaseProfile = {
  customerName: "Nguyễn Minh Anh",
  phone: "0901234567",
  companyName: "Công ty Minh Anh",
  businessType: "Bán lẻ thời trang",
  currentWebsite: "minhanh.example",
  mainOffer: "Trang phục công sở thiết kế tại Việt Nam",
  serviceArea: "TP.HCM và toàn quốc",
  seoGoals: "thời trang công sở nữ, váy thiết kế",
  websiteStatus: "idea",
  websiteGoal: "Bán hàng và nhận tư vấn trực tuyến",
  targetCustomers: "Khách hàng từ 20 đến 35 tuổi tại Việt Nam",
  estimatedTraffic: "1k_10k",
  budgetRange: "1m_3m",
};

describe("sổ đơn hàng HOSTORA", () => {
  it("phân trang, tìm kiếm và sắp xếp hóa đơn ở SQLite thay vì tải toàn bộ", () => {
    const store = new PaymentStore(":memory:");
    const first = store.createInvoice({
      title: "Hosting Cửa hàng Mộc An",
      amountVnd: 780000,
      customerEmail: "mocan@example.com",
      saleType: "partner_service",
      partnerProvider: "Vietnix",
    });
    const second = store.createInvoice({
      title: "Website doanh nghiệp",
      amountVnd: 1500000,
      customerEmail: "owner@example.com",
    });
    store.markPaid(second.id, "stripe", "cs_paid_123", 1500000, "vnd");
    const third = store.createInvoice({
      title: "Email doanh nghiệp",
      amountVnd: 320000,
      customerEmail: "finance@example.com",
    });
    store.requestCancel(third.id, third.accessCode, "Không còn nhu cầu");

    const searched = store.listInvoicesPage({
      search: "mocan@",
      page: 1,
      pageSize: 25,
    });
    expect(searched.items.map((item) => item.id)).toEqual([first.id]);
    expect(searched).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 25,
      pageCount: 1,
    });

    const paid = store.listInvoicesPage({
      queue: "paid",
      provider: "stripe",
      page: 1,
      pageSize: 25,
    });
    expect(paid.items.map((item) => item.id)).toEqual([second.id]);
    expect(paid.counts).toEqual({
      all: 3,
      awaitingPayment: 1,
      paid: 1,
      refunds: 0,
      cancelled: 1,
    });
    expect(paid.financials).toEqual({
      recognizedPaidOrders: 1,
      recognizedRevenueVnd: 1500000,
    });

    const expensiveFirst = store.listInvoicesPage({
      sortBy: "amountVnd",
      sortDirection: "desc",
      page: 1,
      pageSize: 2,
    });
    expect(expensiveFirst.items.map((item) => item.amountVnd)).toEqual([
      1500000, 780000,
    ]);
    expect(expensiveFirst.pageCount).toBe(2);
    store.close();
  });

  it("đếm đủ hơn một nghìn đơn dù mỗi trang chỉ hiển thị một phần", () => {
    const store = new PaymentStore(":memory:");
    for (let index = 1; index <= 1_205; index += 1) {
      store.createInvoice({
        title: `Đơn kiểm tra ${index}`,
        amountVnd: 100_000 + index,
      });
    }

    const firstPage = store.listInvoicesPage({ page: 1, pageSize: 25 });
    const lastPage = store.listInvoicesPage({ page: 49, pageSize: 25 });

    expect(firstPage.counts.all).toBe(1_205);
    expect(firstPage.total).toBe(1_205);
    expect(firstPage.items).toHaveLength(25);
    expect(firstPage.pageCount).toBe(49);
    expect(lastPage.items).toHaveLength(5);
    store.close();
  });

  it("lọc hóa đơn theo loại dịch vụ, cổng và khoảng ngày", () => {
    const store = new PaymentStore(":memory:");
    const partner = store.createInvoice({
      title: "Tên miền đối tác",
      amountVnd: 250000,
      customerEmail: "domain@example.com",
      saleType: "partner_service",
      partnerProvider: "Nhà đăng ký A",
    });
    store.beginPayment(partner.id, "vnpay");
    store.setCheckoutReference(partner.id, partner.id, "20261027120000");

    expect(
      store
        .listInvoicesPage({
          saleType: "partner_service",
          provider: "vnpay",
          createdFrom: "2026-01-01T00:00:00.000Z",
          createdTo: "2027-01-01T00:00:00.000Z",
          page: 1,
          pageSize: 25,
        })
        .items.map((item) => item.id),
    ).toEqual([partner.id]);
    store.close();
  });

  it("tìm hóa đơn bằng tên khách và doanh nghiệp trong hồ sơ mua liên kết", () => {
    const store = new PaymentStore(":memory:");
    const request = store.createSaleRequest({
      productId: "hosting-business",
      provider: "HOSTORA",
      productName: "Hosting doanh nghiệp",
      contact: "buy@example.com",
      profile: {
        ...purchaseProfile,
        customerName: "Trần Ngọc Lan",
        companyName: "Nội thất Gỗ Việt",
      },
      consultationPreference: "ai",
      consultationChannel: "email",
    });
    const invoice = store.createInvoiceForSaleRequest(request.id, {
      amountVnd: 1_200_000,
      description: "Gói một năm",
    });

    expect(
      store
        .listInvoicesPage({
          search: "Gỗ Việt",
          page: 1,
          pageSize: 25,
        })
        .items.map((item) => item.id),
    ).toEqual([invoice.id]);
    store.close();
  });

  it("phân trang và lọc yêu cầu mua ngay tại SQLite", () => {
    const store = new PaymentStore(":memory:");
    store.createSaleRequest({
      productId: "hosting-a",
      provider: "HOSTORA",
      productName: "Hosting cửa hàng",
      contact: "shop@example.com",
      profile: { ...purchaseProfile, companyName: "Tiệm Hoa Nắng" },
      consultationPreference: "ai",
      consultationChannel: "email",
    });
    store.createSaleRequest({
      productId: "hosting-b",
      provider: "HOSTORA",
      productName: "Hosting giới thiệu",
      contact: "intro@example.com",
      profile: { ...purchaseProfile, companyName: "Công ty Mây Việt" },
      consultationPreference: "ai",
      consultationChannel: "email",
    });

    const page = store.listSaleRequestsPage({
      search: "Hoa Nắng",
      status: "new",
      page: 1,
      pageSize: 25,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].profile.companyName).toBe("Tiệm Hoa Nắng");
    expect(page).toMatchObject({ total: 1, page: 1, pageCount: 1 });
    store.close();
  });

  it("lưu số tiền admin phát hành và chỉ mở đơn bằng mã riêng", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Thiết lập trang web",
      amountVnd: 320000,
      customerEmail: "KHACH@example.com",
    });
    expect(order.amountVnd).toBe(320000);
    expect(order.customerEmail).toBe("khach@example.com");
    expect(store.findForCustomer(order.id, order.accessCode)?.title).toBe(
      "Thiết lập trang web",
    );
    expect(store.findForCustomer(order.id, "sai-ma")).toBeNull();
    expect(store.listInvoices()[0]).not.toHaveProperty("accessCode");
    store.close();
  });

  it("gắn email yêu cầu mua vào hóa đơn để web và app dùng chung backend", () => {
    const store = new PaymentStore(":memory:");
    const request = store.createSaleRequest({
      productId: "hosting-demo",
      provider: "Nhà cung cấp thử nghiệm",
      productName: "Hosting thử nghiệm",
      contact: "nguoi.mua@example.com",
      profile: purchaseProfile,
      consultationPreference: "ai",
      consultationChannel: "email",
    });
    const invoice = store.createInvoiceForSaleRequest(request.id, {
      amountVnd: 150000,
      description: "Gói 12 tháng",
    });
    expect(invoice.customerEmail).toBe("nguoi.mua@example.com");
    expect(store.listSaleRequests()[0].invoiceId).toBe(invoice.id);
    store.close();
  });

  it("lưu đầy đủ hồ sơ, lịch tư vấn và chỉ cho mã riêng hủy yêu cầu", () => {
    const store = new PaymentStore(":memory:");
    const consultationAt = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();
    const request = store.createSaleRequest({
      productId: "hosting-demo",
      provider: "HOSTORA",
      productName: "Hosting doanh nghiệp",
      contact: "owner@example.com",
      note: "Cần chuyển website trong tháng này",
      profile: purchaseProfile,
      consultationPreference: "scheduled",
      consultationAt,
      consultationChannel: "phone",
    });
    expect(store.findSaleRequestForCustomer(request.id, "sai-ma")).toBeNull();
    expect(
      store.findSaleRequestForCustomer(request.id, request.accessCode),
    ).toMatchObject({
      profile: purchaseProfile,
      consultationAt,
      consultationChannel: "phone",
    });
    expect(() =>
      store.cancelSaleRequest(request.id, "sai-ma", "Tôi đổi kế hoạch"),
    ).toThrow();
    expect(
      store.cancelSaleRequest(
        request.id,
        request.accessCode,
        "Tôi đổi kế hoạch",
      ),
    ).toMatchObject({
      status: "cancelled",
      cancelReason: "Tôi đổi kế hoạch",
    });
    store.close();
  });

  it("không bắt số điện thoại khi khách chọn AI tư vấn", () => {
    const store = new PaymentStore(":memory:");
    expect(() =>
      store.createSaleRequest({
        productId: "hosting-demo",
        provider: "HOSTORA",
        productName: "Hosting doanh nghiệp",
        contact: "owner@example.com",
        profile: { ...purchaseProfile, phone: "" },
        consultationPreference: "ai",
        consultationChannel: "phone",
      }),
    ).not.toThrow();
    store.close();
  });

  it("chỉ xác nhận thanh toán đúng số tiền VND và bỏ qua callback lặp", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Tư vấn triển khai",
      amountVnd: 250000,
    });
    expect(() =>
      store.markPaid(order.id, "stripe", "pi_123", 250001, "vnd"),
    ).toThrow();
    expect(() =>
      store.markPaid(order.id, "stripe", "pi_123", 250000, "usd"),
    ).toThrow();
    store.markPaid(order.id, "stripe", "pi_123", 250000, "vnd");
    store.markPaid(order.id, "stripe", "pi_123", 250000, "vnd");
    expect(store.getInvoice(order.id)?.status).toBe("paid");
    expect(
      store.getEvents(order.id).filter((event) => event.type === "paid"),
    ).toHaveLength(1);
    store.close();
  });

  it("hoàn tất thanh toán mô phỏng đúng một lần và tách khỏi cổng thật", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Gói doanh nghiệp",
      amountVnd: 1_200_000,
    });

    const paid = store.completeDemoPayment(order.id, order.accessCode, "vnpay");
    const repeated = store.completeDemoPayment(
      order.id,
      order.accessCode,
      "vnpay",
    );

    expect(paid).toMatchObject({ status: "paid", provider: "demo" });
    expect(paid.providerReference).toBe(`DEMO-vnpay-${order.id}`);
    expect(repeated.earnedVoucherCode).toBe(paid.earnedVoucherCode);
    expect(
      store.getEvents(order.id).filter((event) => event.type === "paid"),
    ).toHaveLength(1);
    expect(
      store
        .getEvents(order.id)
        .some((event) => event.detail.includes("mô phỏng VNPay")),
    ).toBe(true);
    expect(() =>
      store.completeDemoPayment(order.id, "sai-ma", "vnpay"),
    ).toThrow();
    store.close();
  });

  it("không hoàn tiền trước khi đã trả hoặc hoàn hai lần", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Thiết lập email",
      amountVnd: 190000,
    });
    expect(() =>
      store.requestRefund(order.id, order.accessCode, "Tôi muốn hủy dịch vụ"),
    ).toThrow();
    store.markPaid(order.id, "vnpay", "VNP-1", 190000, "vnd");
    store.requestRefund(order.id, order.accessCode, "Tôi muốn hủy dịch vụ");
    store.startRefund(order.id, "refund-1");
    store.markRefunded(order.id, "refund-1", 190000);
    expect(store.getInvoice(order.id)?.status).toBe("refunded");
    expect(() => store.startRefund(order.id, "refund-2")).toThrow();
    store.close();
  });

  it("khóa một cổng thanh toán cho mỗi hóa đơn đang chờ", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Dịch vụ HOSTORA",
      amountVnd: 100000,
    });
    store.beginPayment(order.id, "stripe");
    expect(() => store.beginPayment(order.id, "vnpay")).toThrow();
    expect(() =>
      store.markPaid(order.id, "vnpay", "VN-1", 100000, "vnd"),
    ).toThrow();
    store.close();
  });

  it("hủy chưa thanh toán và giữ yêu cầu hủy khi cổng báo đã thu sau đó", () => {
    const store = new PaymentStore(":memory:");
    const plain = store.createInvoice({
      title: "Dịch vụ A",
      amountVnd: 100000,
    });
    expect(
      store.requestCancel(plain.id, plain.accessCode, "Tôi đổi ý").status,
    ).toBe("cancelled");
    expect(() =>
      store.markPaid(plain.id, "stripe", "pi_late", 100000, "vnd"),
    ).toThrow();

    const started = store.createInvoice({
      title: "Dịch vụ B",
      amountVnd: 120000,
    });
    store.beginPayment(started.id, "stripe");
    expect(
      store.requestCancel(started.id, started.accessCode, "Không cần nữa")
        .status,
    ).toBe("cancel_requested");
    expect(
      store.markPaid(started.id, "stripe", "pi_paid", 120000, "vnd").status,
    ).toBe("refund_requested");
    store.close();
  });

  it("ghi rõ đơn dịch vụ đối tác nhưng không lấy giá từ catalog", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Gói lưu trữ theo thỏa thuận",
      amountVnd: 490000,
      saleType: "partner_service",
      partnerProvider: "Vietnix",
    });
    expect(order.saleType).toBe("partner_service");
    expect(order.partnerProvider).toBe("Vietnix");
    expect(order.amountVnd).toBe(490000);
    store.close();
  });

  it("lưu mã phiên để đối soát và ngày giao dịch VNPay để hoàn tiền", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Dịch vụ C",
      amountVnd: 200000,
    });
    store.beginPayment(order.id, "vnpay");
    store.setCheckoutReference(order.id, order.id, "20261026134000");
    expect(store.getInvoice(order.id)?.providerReference).toBe(order.id);
    expect(() =>
      store.markPaid(
        order.id,
        "vnpay",
        "VN-GATEWAY-1",
        200000,
        "vnd",
        "20261026134200",
      ),
    ).toThrow();
    store.markPaid(
      order.id,
      "vnpay",
      order.id,
      200000,
      "vnd",
      "20261026134200",
      "987654",
    );
    expect(store.getInvoice(order.id)?.gatewayPaymentDate).toBe(
      "20261026134200",
    );
    expect(store.getInvoice(order.id)?.gatewayTransactionNo).toBe("987654");
    store.close();
  });

  it("cho admin từ chối yêu cầu hoặc thử lại khi cổng hoàn tiền báo lỗi", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({
      title: "Dịch vụ D",
      amountVnd: 200000,
    });
    store.markPaid(order.id, "stripe", "pi_1", 200000, "vnd");
    store.requestRefund(order.id, order.accessCode, "Không dùng nữa");
    expect(
      store.rejectRefund(order.id, "Không thuộc điều kiện hoàn tiền").status,
    ).toBe("paid");
    store.requestRefund(order.id, order.accessCode, "Dịch vụ không hoạt động");
    store.startRefund(order.id, "re_1");
    expect(
      store.markRefundFailed(order.id, "re_1", "Gateway từ chối").status,
    ).toBe("refund_requested");
    store.close();
  });

  it("phát đúng một voucher cho đơn đã trả từ một triệu và áp dụng cho đơn sau", () => {
    const store = new PaymentStore(":memory:");
    const first = store.createInvoice({
      title: "Gói doanh nghiệp",
      amountVnd: 1_000_000,
    });
    const paid = store.markPaid(
      first.id,
      "stripe",
      "pi_voucher",
      1_000_000,
      "vnd",
    );
    const repeated = store.markPaid(
      first.id,
      "stripe",
      "pi_voucher",
      1_000_000,
      "vnd",
    );
    expect(paid.earnedVoucherCode).toMatch(/^HOSTORA-[A-F0-9]{10}$/);
    expect(repeated.earnedVoucherCode).toBe(paid.earnedVoucherCode);
    expect(
      store
        .getEvents(first.id)
        .filter((event) => event.type === "voucher_issued"),
    ).toHaveLength(1);

    const next = store.createInvoice({
      title: "Gói tiếp theo",
      amountVnd: 1_000_000,
      voucherCode: paid.earnedVoucherCode!,
    });
    expect(next).toMatchObject({
      subtotalVnd: 1_000_000,
      discountVnd: 100_000,
      amountVnd: 900_000,
      voucherCode: paid.earnedVoucherCode,
    });
    expect(() =>
      store.createInvoice({
        title: "Dùng lại trái phép",
        amountVnd: 1_000_000,
        voucherCode: paid.earnedVoucherCode!,
      }),
    ).toThrow();

    store.requestCancel(next.id, next.accessCode, "Tôi muốn đổi gói khác");
    expect(() =>
      store.createInvoice({
        title: "Gói thay thế",
        amountVnd: 1_000_000,
        voucherCode: paid.earnedVoucherCode!,
      }),
    ).not.toThrow();
    store.close();
  });

  it("không phát voucher cho đơn dưới một triệu", () => {
    const store = new PaymentStore(":memory:");
    const order = store.createInvoice({ title: "Gói nhỏ", amountVnd: 999_999 });
    expect(
      store.markPaid(order.id, "vnpay", "VNP-SMALL", 999_999, "vnd")
        .earnedVoucherCode,
    ).toBeNull();
    store.close();
  });

  it("tính doanh thu thật và loại đơn đã hoàn tiền khỏi dashboard", () => {
    const store = new PaymentStore(":memory:");
    expect(store.getRevenueAnalytics().current30Days).toEqual({ revenueVnd: 0, paidOrders: 0 });

    const kept = store.createInvoice({ title: "Hosting đã mua", amountVnd: 600_000 });
    store.markPaid(kept.id, "stripe", "pi-kept", 600_000, "vnd");
    const refunded = store.createInvoice({ title: "Dịch vụ hoàn tiền", amountVnd: 400_000 });
    store.markPaid(refunded.id, "stripe", "pi-refunded", 400_000, "vnd");
    store.requestRefund(refunded.id, refunded.accessCode, "Không còn phù hợp nhu cầu");
    store.startRefund(refunded.id, "re-refunded");
    store.markRefunded(refunded.id, "re-refunded", 400_000);

    const analytics = store.getRevenueAnalytics();
    expect(analytics.current30Days).toEqual({ revenueVnd: 600_000, paidOrders: 1 });
    expect(analytics.statusMix.refunded).toBe(1);
    expect(analytics.daily.at(-1)).toMatchObject({ revenueVnd: 600_000, paidOrders: 1 });
    store.close();
  });

  it("giới hạn mã đăng nhập email, hết hạn và chỉ dùng một lần", () => {
    const store = new PaymentStore(":memory:");
    const now = 1_000_000;
    const first = store.createAdminEmailCode(now);
    expect(() => store.createAdminEmailCode(now + 59_999)).toThrow();
    expect(store.verifyAdminEmailCode(first.code, now + 60_000)).toBe(true);
    expect(store.verifyAdminEmailCode(first.code, now + 60_001)).toBe(false);

    const expired = store.createAdminEmailCode(now + 120_000);
    expect(store.verifyAdminEmailCode(expired.code, now + 13 * 60_000)).toBe(
      false,
    );

    const limited = store.createAdminEmailCode(now + 12 * 60_000);
    const wrongCode = limited.code === "000000" ? "999999" : "000000";
    for (let attempt = 0; attempt < 5; attempt += 1)
      expect(
        store.verifyAdminEmailCode(wrongCode, now + 12 * 60_000 + attempt),
      ).toBe(false);
    expect(
      store.verifyAdminEmailCode(limited.code, now + 12 * 60_000 + 6),
    ).toBe(false);
    store.close();
  });
});
