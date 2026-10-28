"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  FileText,
  Filter,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmailStatus } from "@/lib/payments/email";
import type {
  CreatedInvoice,
  Invoice,
  InvoiceEvent,
  InvoicePage,
  InvoiceQueue,
  PaymentProvider,
  SaleRequest,
  SaleRequestPage,
} from "@/lib/payments/types";

const statusLabels: Record<Invoice["status"], string> = {
  pending: "Chờ thanh toán",
  cancel_requested: "Cần kiểm tra hủy",
  paid: "Đã thanh toán",
  refund_requested: "Cần duyệt hoàn",
  refund_pending: "Đang hoàn tiền",
  refunded: "Đã hoàn tiền",
  cancelled: "Đã hủy",
};
const requestLabels: Record<SaleRequest["status"], string> = {
  new: "Chờ báo giá",
  invoiced: "Đã tạo hóa đơn",
  declined: "Đã từ chối",
  cancelled: "Khách đã hủy",
};
const websiteLabels = {
  idea: "Chưa có trang web",
  building: "Đang xây dựng",
  live: "Đã hoạt động",
  migrating: "Đang chuyển hệ thống",
} as const;
const emptyPage: InvoicePage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  pageCount: 1,
  counts: { all: 0, awaitingPayment: 0, paid: 0, refunds: 0, cancelled: 0 },
  financials: { recognizedPaidOrders: 0, recognizedRevenueVnd: 0 },
};

type View = "orders" | "requests" | "create";
type Filters = {
  search: string;
  queue: InvoiceQueue;
  provider: "" | PaymentProvider | "unassigned";
  saleType: "" | Invoice["saleType"];
  createdFrom: string;
  createdTo: string;
  sortBy: "createdAt" | "updatedAt" | "amountVnd";
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
};
type OrderDetail = { invoice: Invoice; events: InvoiceEvent[] };

const initialFilters: Filters = {
  search: "",
  queue: "all",
  provider: "",
  saleType: "",
  createdFrom: "",
  createdTo: "",
  sortBy: "createdAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 25,
};

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có dữ liệu";
const gatewayDate = (value: string | null) =>
  value && /^\d{14}$/.test(value)
    ? `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`
    : "Chưa có dữ liệu";

function providerLabel(invoice: Invoice) {
  if (invoice.provider === "stripe") return "Stripe";
  if (invoice.provider === "vnpay") return "VNPay";
  if (invoice.provider === "demo")
    return invoice.providerReference?.toLowerCase().includes("vnpay")
      ? "VNPay · kiểm thử"
      : "Stripe · kiểm thử";
  return "Chưa chọn cổng";
}

function QueueButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`admin-queue ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{new Intl.NumberFormat("vi-VN").format(count)}</strong>
    </button>
  );
}

export function AdminOrders() {
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [emailLoginEnabled, setEmailLoginEnabled] = useState(false);
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<View>("orders");
  const [pageData, setPageData] = useState<InvoicePage>(emptyPage);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [requestPage, setRequestPage] = useState<SaleRequestPage>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    pageCount: 1,
    counts: { all: 0, new: 0, invoiced: 0, declined: 0, cancelled: 0 },
  });
  const [requestPageNumber, setRequestPageNumber] = useState(1);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState<
    "" | SaleRequest["status"]
  >("");
  const [quoteAmounts, setQuoteAmounts] = useState<Record<string, string>>({});
  const [quoteDescriptions, setQuoteDescriptions] = useState<
    Record<string, string>
  >({});
  const [created, setCreated] = useState<CreatedInvoice | null>(null);
  const [saleType, setSaleType] =
    useState<Invoice["saleType"]>("hostora_service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [partnerProvider, setPartnerProvider] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    configured: false,
    adminRecipientConfigured: false,
    mode: "disabled",
  });
  const [lastSynced, setLastSynced] = useState("");

  const orderParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== "all") params.set(key, String(value));
    });
    return params.toString();
  }, [filters]);

  const loadOrders = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/payments/orders?${orderParams}`,
          { cache: "no-store" },
        );
        if (response.status === 401) {
          window.location.replace("/admin/login?next=%2Fadmin%2Forders");
          return;
        }
        const result = (await response.json()) as {
          page?: InvoicePage;
          email?: EmailStatus;
          error?: string;
        };
        if (!response.ok || !result.page)
          throw new Error(result.error || "Kho đơn hàng chưa phản hồi.");
        setPageData(result.page);
        if (result.email) setEmailStatus(result.email);
        setLastSynced(new Date().toLocaleTimeString("vi-VN"));
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Không đồng bộ được đơn hàng.",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [orderParams],
  );

  const loadRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(requestPageNumber),
        pageSize: "25",
      });
      if (requestSearch.trim()) params.set("search", requestSearch.trim());
      if (requestStatus) params.set("status", requestStatus);
      const response = await fetch(`/api/admin/payments/requests?${params}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        window.location.replace("/admin/login?next=%2Fadmin%2Forders");
        return;
      }
      const result = (await response.json()) as {
        page?: SaleRequestPage;
        error?: string;
      };
      if (!response.ok || !result.page)
        throw new Error(result.error || "Không tải được yêu cầu mua.");
      setRequestPage(result.page);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không tải được yêu cầu mua.",
      );
    }
  }, [requestPageNumber, requestSearch, requestStatus]);

  const openOrder = useCallback(async (id: string) => {
    setBusy(`detail-${id}`);
    try {
      const response = await fetch(`/api/admin/payments/orders/${id}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as OrderDetail & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Không tải được chi tiết đơn.");
      setSelected(result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không tải được chi tiết đơn.",
      );
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setFilters((old) => ({
          ...old,
          search: searchInput.trim(),
          page: 1,
        })),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void fetch("/api/admin/payments/session", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (result: {
          configured: boolean;
          authenticated: boolean;
          emailLoginEnabled?: boolean;
          passwordLoginEnabled?: boolean;
        }) => {
          setConfigured(result.configured);
          if (!result.authenticated) {
            window.location.replace("/admin/login?next=%2Fadmin%2Forders");
            return;
          }
          setAuthenticated(true);
          setEmailLoginEnabled(Boolean(result.emailLoginEnabled));
          setPasswordLoginEnabled(Boolean(result.passwordLoginEnabled));
        },
      )
      .catch(() => setMessage("Không kết nối được máy HOSTORA."));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, loadOrders]);
  useEffect(() => {
    if (!authenticated || view !== "requests") return;
    const timer = window.setTimeout(() => void loadRequests(), 300);
    return () => window.clearTimeout(timer);
  }, [authenticated, view, loadRequests]);
  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => void loadOrders(true), 15_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadOrders(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [authenticated, loadOrders]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy("login");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đăng nhập.");
      setPassword("");
      setAuthenticated(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể đăng nhập.",
      );
    } finally {
      setBusy("");
    }
  }

  async function requestEmailCode() {
    setBusy("email-code");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/login/email/request", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không gửi được mã đăng nhập.");
      setEmailCodeSent(true);
      setMessage("Đã gửi mã 6 số tới email quản trị. Mã có hiệu lực 10 phút.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không gửi được mã đăng nhập.",
      );
    } finally {
      setBusy("");
    }
  }

  async function verifyEmailCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy("verify-code");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/login/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: emailCode }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Mã đăng nhập không đúng.");
      setEmailCode("");
      setAuthenticated(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mã đăng nhập không đúng.",
      );
    } finally {
      setBusy("");
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy("create");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          amountVnd: Number(amount),
          saleType,
          partnerProvider,
          customerEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không tạo được hóa đơn.");
      setCreated(data as CreatedInvoice);
      setTitle("");
      setDescription("");
      setAmount("");
      setPartnerProvider("");
      setCustomerEmail("");
      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không tạo được hóa đơn.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createRequestInvoice(request: SaleRequest) {
    setBusy(request.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          amountVnd: Number(quoteAmounts[request.id]),
          description: quoteDescriptions[request.id],
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Không tạo được hóa đơn.");
      setCreated(data as CreatedInvoice);
      setMessage(
        `Đã tạo hóa đơn cho ${request.productName}; email xác nhận đang được gửi tới khách.`,
      );
      await Promise.all([loadRequests(), loadOrders()]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không tạo được hóa đơn.",
      );
    } finally {
      setBusy("");
    }
  }

  async function action(invoice: Invoice, path: string, body?: object) {
    setBusy(invoice.id + path);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/payments/orders/${invoice.id}/${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body ?? {}),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Không xử lý được yêu cầu.");
      setMessage(
        path === "reconcile"
          ? "Đã đối chiếu trạng thái mới nhất với cổng thanh toán."
          : "Đã ghi nhận quyết định và gửi email cập nhật cho khách.",
      );
      await loadOrders();
      await openOrder(invoice.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không xử lý được yêu cầu.",
      );
    } finally {
      setBusy("");
    }
  }

  const setQueue = (queue: InvoiceQueue) =>
    setFilters((old) => ({ ...old, queue, page: 1 }));
  const hasAdvancedFilters = Boolean(
    filters.provider ||
    filters.saleType ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.sortBy !== "createdAt" ||
    filters.sortDirection !== "desc",
  );

  return (
    <div className="admin-orders-page">
      <header className="admin-ops-header">
        <div className="admin-ops-header-inner">
          <div>
            <Link href="/admin" className="admin-back">
              <ArrowLeft size={16} /> Trung tâm quản trị
            </Link>
            <div className="admin-ops-brand">
              <span className="admin-ops-mark">H</span>
              <div>
                <strong>HOSTORA VẬN HÀNH</strong>
                <small>Đơn hàng và kiểm tra giao dịch</small>
              </div>
            </div>
          </div>
          <div className="admin-environment">
            <ShieldCheck size={16} />
            <span>
              <strong>Môi trường kiểm thử</strong>
              <small>Không thu tiền thật</small>
            </span>
          </div>
        </div>
      </header>

      <main className="admin-ops-shell">
        {message && (
          <div className="admin-toast" role="status">
            <span>{message}</span>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setMessage("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {!configured ? (
          <section className="admin-access-card">
            <span className="admin-access-icon">
              <ShieldCheck size={22} />
            </span>
            <p className="admin-kicker">Thiết lập một lần</p>
            <h1>Chưa có phương thức đăng nhập quản trị</h1>
            <p>
              Người cài đặt chưa bật cách đăng nhập cho khu vực này. Hãy nhờ họ
              thiết lập nhận mã qua thư điện tử hoặc cấp mật khẩu quản trị.
            </p>
          </section>
        ) : !authenticated ? (
          <section className="admin-access-card">
            <span className="admin-access-icon">
              <ShieldCheck size={22} />
            </span>
            <p className="admin-kicker">Khu vực giới hạn</p>
            <h1>Đăng nhập bàn vận hành</h1>
            <p>
              Dữ liệu đơn, email và hồ sơ doanh nghiệp chỉ dành cho người phụ
              trách.
            </p>
            {emailLoginEnabled &&
              (!emailCodeSent ? (
                <button
                  type="button"
                  className="admin-primary admin-wide"
                  disabled={Boolean(busy)}
                  onClick={() => void requestEmailCode()}
                >
                  <Mail size={17} />{" "}
                  {busy === "email-code"
                    ? "Đang gửi mã…"
                    : "Nhận mã qua email quản trị"}
                </button>
              ) : (
                <form onSubmit={verifyEmailCode}>
                  <label htmlFor="admin-email-code">Mã xác minh 6 số</label>
                  <input
                    id="admin-email-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={emailCode}
                    onChange={(event) =>
                      setEmailCode(event.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                  <button
                    className="admin-primary admin-wide"
                    disabled={Boolean(busy) || emailCode.length !== 6}
                  >
                    Mở bàn vận hành <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-quiet admin-wide"
                    disabled={Boolean(busy)}
                    onClick={() => void requestEmailCode()}
                  >
                    Gửi lại mã
                  </button>
                </form>
              ))}
            {passwordLoginEnabled && (
              <form onSubmit={login}>
                <label htmlFor="admin-password">Mật khẩu quản trị</label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="admin-quiet admin-wide"
                  disabled={Boolean(busy)}
                >
                  Đăng nhập bằng mật khẩu <ArrowRight size={16} />
                </button>
              </form>
            )}
          </section>
        ) : (
          <>
            <section className="admin-ops-heading">
              <div>
                <p className="admin-kicker">Bàn vận hành giao dịch</p>
                <h1>Đơn hàng, không phải danh sách vô tận.</h1>
                <p>
                  Tìm đúng đơn, xem bằng chứng cổng và xử lý hoàn tiền trong một
                  màn hình.
                </p>
              </div>
              <div
                className={`admin-system-state ${
                  emailStatus.configured ? "is-ready" : "is-warning"
                }`}
              >
                <span>
                  <i /> Kho đơn hàng đã kết nối
                </span>
                <small>
                  {lastSynced ? `Lần cuối ${lastSynced}` : "Đang tải dữ liệu"} ·{" "}
                  {emailStatus.configured
                    ? "Gửi thư đã sẵn sàng"
                    : "Chưa thiết lập gửi thư"}
                </small>
              </div>
            </section>

            <nav className="admin-work-nav" aria-label="Khu vực vận hành">
              <button
                type="button"
                className={view === "orders" ? "is-active" : ""}
                onClick={() => setView("orders")}
              >
                <FileText size={16} /> Đơn hàng
              </button>
              <button
                type="button"
                className={view === "requests" ? "is-active" : ""}
                onClick={() => setView("requests")}
              >
                <Mail size={16} /> Yêu cầu mua
              </button>
              <button
                type="button"
                className={view === "create" ? "is-active" : ""}
                onClick={() => setView("create")}
              >
                <Plus size={16} /> Tạo hóa đơn
              </button>
            </nav>

            {view === "orders" && (
              <section className="admin-orders-workspace">
                <div
                  className="admin-queue-strip"
                  aria-label="Phân nhóm trạng thái đơn"
                >
                  <QueueButton
                    active={filters.queue === "all"}
                    count={pageData.counts.all}
                    label="Tất cả"
                    onClick={() => setQueue("all")}
                  />
                  <QueueButton
                    active={filters.queue === "awaiting_payment"}
                    count={pageData.counts.awaitingPayment}
                    label="Chờ thanh toán"
                    onClick={() => setQueue("awaiting_payment")}
                  />
                  <QueueButton
                    active={filters.queue === "paid"}
                    count={pageData.counts.paid}
                    label="Đã thanh toán"
                    onClick={() => setQueue("paid")}
                  />
                  <QueueButton
                    active={filters.queue === "refunds"}
                    count={pageData.counts.refunds}
                    label="Hoàn tiền"
                    onClick={() => setQueue("refunds")}
                  />
                  <QueueButton
                    active={filters.queue === "cancelled"}
                    count={pageData.counts.cancelled}
                    label="Đã hủy"
                    onClick={() => setQueue("cancelled")}
                  />
                </div>

                <div className="admin-toolbar">
                  <label className="admin-search">
                    <Search size={17} />
                    <span className="sr-only">Tìm đơn hàng</span>
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Mã đơn, email, dịch vụ, nhà cung cấp…"
                    />
                  </label>
                  <button
                    type="button"
                    className={`admin-filter-trigger ${
                      showFilters || hasAdvancedFilters ? "is-active" : ""
                    }`}
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters((value) => !value)}
                  >
                    <SlidersHorizontal size={16} /> Bộ lọc
                    {hasAdvancedFilters ? <i /> : null}
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button"
                    aria-label="Tải lại danh sách"
                    disabled={loading}
                    onClick={() => void loadOrders()}
                  >
                    <RefreshCw
                      size={16}
                      className={loading ? "is-spinning" : ""}
                    />
                  </button>
                </div>

                {showFilters && (
                  <div className="admin-filter-panel">
                    <label>
                      <span>Cách thanh toán</span>
                      <select
                        value={filters.provider}
                        onChange={(event) =>
                          setFilters((old) => ({
                            ...old,
                            provider: event.target.value as Filters["provider"],
                            page: 1,
                          }))
                        }
                      >
                        <option value="">Tất cả cách thanh toán</option>
                        <option value="stripe">Stripe</option>
                        <option value="vnpay">VNPay</option>
                        <option value="demo">Thanh toán thử nghiệm</option>
                        <option value="unassigned">Chưa chọn cách</option>
                      </select>
                    </label>
                    <label>
                      <span>Loại dịch vụ</span>
                      <select
                        value={filters.saleType}
                        onChange={(event) =>
                          setFilters((old) => ({
                            ...old,
                            saleType: event.target.value as Filters["saleType"],
                            page: 1,
                          }))
                        }
                      >
                        <option value="">Tất cả dịch vụ</option>
                        <option value="hostora_service">Dịch vụ HOSTORA</option>
                        <option value="partner_service">Dịch vụ đối tác</option>
                      </select>
                    </label>
                    <label>
                      <span>Từ ngày</span>
                      <input
                        type="date"
                        value={filters.createdFrom.slice(0, 10)}
                        onChange={(event) =>
                          setFilters((old) => ({
                            ...old,
                            createdFrom: event.target.value
                              ? new Date(
                                  `${event.target.value}T00:00:00+07:00`,
                                ).toISOString()
                              : "",
                            page: 1,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Đến ngày</span>
                      <input
                        type="date"
                        value={filters.createdTo.slice(0, 10)}
                        onChange={(event) =>
                          setFilters((old) => ({
                            ...old,
                            createdTo: event.target.value
                              ? new Date(
                                  `${event.target.value}T23:59:59+07:00`,
                                ).toISOString()
                              : "",
                            page: 1,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Sắp xếp</span>
                      <select
                        value={`${filters.sortBy}:${filters.sortDirection}`}
                        onChange={(event) => {
                          const [sortBy, sortDirection] =
                            event.target.value.split(":") as [
                              Filters["sortBy"],
                              Filters["sortDirection"],
                            ];
                          setFilters((old) => ({
                            ...old,
                            sortBy,
                            sortDirection,
                            page: 1,
                          }));
                        }}
                      >
                        <option value="createdAt:desc">Mới nhất trước</option>
                        <option value="createdAt:asc">Cũ nhất trước</option>
                        <option value="amountVnd:desc">
                          Giá trị cao trước
                        </option>
                        <option value="amountVnd:asc">
                          Giá trị thấp trước
                        </option>
                        <option value="updatedAt:desc">Vừa cập nhật</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="admin-reset"
                      onClick={() => {
                        setFilters(initialFilters);
                        setSearchInput("");
                      }}
                    >
                      <RotateCcw size={14} /> Đặt lại
                    </button>
                  </div>
                )}

                <div
                  className={`admin-data-frame ${loading ? "is-loading" : ""}`}
                >
                  <div className="admin-table-meta">
                    <strong>
                      Tổng trong kho:{" "}
                      {new Intl.NumberFormat("vi-VN").format(
                        pageData.counts.all,
                      )}{" "}
                      đơn
                    </strong>
                    <span>
                      Sau khi lọc:{" "}
                      {new Intl.NumberFormat("vi-VN").format(pageData.total)} ·
                      Đang xem{" "}
                      {pageData.total === 0
                        ? 0
                        : (pageData.page - 1) * pageData.pageSize + 1}
                      –
                      {Math.min(
                        pageData.page * pageData.pageSize,
                        pageData.total,
                      )}
                    </span>
                  </div>
                  {pageData.items.length === 0 ? (
                    <div className="admin-empty-state">
                      <Filter size={24} />
                      <h2>Không có đơn phù hợp</h2>
                      <p>
                        Thử bỏ bớt điều kiện lọc hoặc tìm bằng email, mã đơn
                        khác.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-table-scroll">
                        <table className="admin-orders-table">
                          <thead>
                            <tr>
                              <th>Đơn & khách</th>
                              <th>Dịch vụ</th>
                              <th>Cổng</th>
                              <th>Trạng thái</th>
                              <th>Cập nhật</th>
                              <th className="is-numeric">Tổng tiền</th>
                              <th>
                                <span className="sr-only">Mở</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageData.items.map((invoice) => (
                              <tr key={invoice.id}>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-order-link"
                                    onClick={() => void openOrder(invoice.id)}
                                  >
                                    <strong>{invoice.id}</strong>
                                    <span>
                                      {invoice.customerEmail ?? "Chưa có email"}
                                    </span>
                                  </button>
                                </td>
                                <td>
                                  <strong>{invoice.title}</strong>
                                  <span>
                                    {invoice.saleType === "partner_service"
                                      ? invoice.partnerProvider
                                      : "HOSTORA"}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`admin-gateway admin-gateway-${
                                      invoice.provider ?? "none"
                                    }`}
                                  >
                                    {providerLabel(invoice)}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`order-status order-status-${invoice.status}`}
                                  >
                                    {statusLabels[invoice.status]}
                                  </span>
                                </td>
                                <td>
                                  <time>{dateTime(invoice.updatedAt)}</time>
                                </td>
                                <td className="is-numeric">
                                  <strong>{money(invoice.amountVnd)}</strong>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-row-open"
                                    aria-label={`Mở chi tiết đơn ${invoice.id}`}
                                    disabled={busy === `detail-${invoice.id}`}
                                    onClick={() => void openOrder(invoice.id)}
                                  >
                                    <ChevronRight size={17} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="admin-mobile-orders">
                        {pageData.items.map((invoice) => (
                          <button
                            type="button"
                            className="admin-mobile-order"
                            key={invoice.id}
                            onClick={() => void openOrder(invoice.id)}
                          >
                            <span className="admin-mobile-order-top">
                              <strong>{invoice.id}</strong>
                              <span
                                className={`order-status order-status-${invoice.status}`}
                              >
                                {statusLabels[invoice.status]}
                              </span>
                            </span>
                            <b>{invoice.title}</b>
                            <small>
                              {invoice.customerEmail ?? "Chưa có email"} ·{" "}
                              {providerLabel(invoice)}
                            </small>
                            <span className="admin-mobile-order-bottom">
                              <time>{dateTime(invoice.updatedAt)}</time>
                              <strong>{money(invoice.amountVnd)}</strong>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="admin-pagination">
                    <label>
                      <span>Hiển thị</span>
                      <select
                        value={filters.pageSize}
                        onChange={(event) =>
                          setFilters((old) => ({
                            ...old,
                            pageSize: Number(event.target.value),
                            page: 1,
                          }))
                        }
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </label>
                    <div>
                      <button
                        type="button"
                        disabled={filters.page <= 1}
                        aria-label="Trang trước"
                        onClick={() =>
                          setFilters((old) => ({
                            ...old,
                            page: old.page - 1,
                          }))
                        }
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <span>
                        {pageData.page} / {pageData.pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={filters.page >= pageData.pageCount}
                        aria-label="Trang sau"
                        onClick={() =>
                          setFilters((old) => ({
                            ...old,
                            page: old.page + 1,
                          }))
                        }
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {view === "requests" && (
              <section className="admin-requests-workspace">
                <div className="admin-section-heading">
                  <div>
                    <p className="admin-kicker">Hồ sơ từ web và ứng dụng</p>
                    <h2>
                      Yêu cầu mua cần báo giá
                      <small className="admin-heading-count">
                        {new Intl.NumberFormat("vi-VN").format(
                          requestPage.total,
                        )}{" "}
                        hồ sơ
                      </small>
                    </h2>
                  </div>
                  <button
                    className="admin-quiet"
                    type="button"
                    onClick={() => void loadRequests()}
                  >
                    <RefreshCw size={15} /> Tải lại
                  </button>
                </div>
                <div className="admin-request-toolbar">
                  <label className="admin-search">
                    <Search size={17} />
                    <span className="sr-only">Tìm yêu cầu mua</span>
                    <input
                      value={requestSearch}
                      onChange={(event) => {
                        setRequestSearch(event.target.value);
                        setRequestPageNumber(1);
                      }}
                      placeholder="Khách hàng, email, doanh nghiệp, dịch vụ…"
                    />
                  </label>
                  <select
                    aria-label="Lọc trạng thái yêu cầu"
                    value={requestStatus}
                    onChange={(event) => {
                      setRequestStatus(
                        event.target.value as typeof requestStatus,
                      );
                      setRequestPageNumber(1);
                    }}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="new">Chờ báo giá</option>
                    <option value="invoiced">Đã tạo hóa đơn</option>
                    <option value="declined">Đã từ chối</option>
                    <option value="cancelled">Khách đã hủy</option>
                  </select>
                </div>
                {requestPage.items.length === 0 ? (
                  <div className="admin-empty-state">
                    <Mail size={24} />
                    <h2>Chưa có yêu cầu phù hợp</h2>
                    <p>
                      Yêu cầu mua mới từ web và ứng dụng sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="admin-request-list">
                    {requestPage.items.map((request) => (
                      <article className="admin-request-card" key={request.id}>
                        <header>
                          <div>
                            <span
                              className={`order-status order-status-${
                                request.status === "new"
                                  ? "pending"
                                  : request.status === "cancelled"
                                    ? "cancelled"
                                    : request.status === "invoiced"
                                      ? "paid"
                                      : "refund_requested"
                              }`}
                            >
                              {requestLabels[request.status]}
                            </span>
                            <h3>{request.productName}</h3>
                            <p>
                              {request.id} · {request.provider}
                            </p>
                          </div>
                          <time>{dateTime(request.createdAt)}</time>
                        </header>
                        <div className="admin-dossier-grid">
                          <div>
                            <small>Khách hàng</small>
                            <strong>{request.profile.customerName}</strong>
                            <span>
                              {request.contact}
                              {request.profile.phone
                                ? ` · ${request.profile.phone}`
                                : ""}
                            </span>
                          </div>
                          <div>
                            <small>Doanh nghiệp</small>
                            <strong>
                              {request.profile.companyName ||
                                "Cá nhân / chưa cung cấp"}
                            </strong>
                            <span>{request.profile.businessType}</span>
                          </div>
                          <div>
                            <small>Website</small>
                            <strong>
                              {websiteLabels[request.profile.websiteStatus]}
                            </strong>
                            <span>
                              {request.profile.currentWebsite ||
                                "Chưa có trang web"}
                            </span>
                          </div>
                          <div>
                            <small>Sản phẩm chủ lực</small>
                            <strong>
                              {request.profile.mainOffer || "Chưa cung cấp"}
                            </strong>
                            <span>{request.profile.websiteGoal}</span>
                          </div>
                          <div>
                            <small>Khách hàng mục tiêu</small>
                            <strong>{request.profile.targetCustomers}</strong>
                            <span>{request.profile.serviceArea}</span>
                          </div>
                          <div>
                            <small>Tư vấn</small>
                            <strong>
                              {request.consultationPreference === "ai"
                                ? "AI HOSTORA tư vấn"
                                : request.consultationAt
                                  ? dateTime(request.consultationAt)
                                  : "Chờ chọn lịch"}
                            </strong>
                            <span>
                              {request.consultationChannel === "video"
                                ? "Cuộc gọi video"
                                : request.consultationChannel === "phone"
                                  ? "Điện thoại"
                                  : "Email"}
                            </span>
                          </div>
                        </div>
                        {request.note && (
                          <p className="admin-note">
                            <strong>Yêu cầu:</strong> {request.note}
                          </p>
                        )}
                        {request.cancelReason && (
                          <p className="admin-note">
                            <strong>Lý do hủy:</strong> {request.cancelReason}
                          </p>
                        )}
                        {request.invoiceId && (
                          <p className="admin-note">
                            <strong>Hóa đơn:</strong> {request.invoiceId}
                          </p>
                        )}
                        {request.status === "new" && (
                          <div className="admin-quote-form">
                            <input
                              aria-label={`Tổng tiền đơn ${request.id}`}
                              type="number"
                              min="5000"
                              max="1000000000"
                              placeholder="Giá đã chốt (VND)"
                              value={quoteAmounts[request.id] ?? ""}
                              onChange={(event) =>
                                setQuoteAmounts((old) => ({
                                  ...old,
                                  [request.id]: event.target.value,
                                }))
                              }
                            />
                            <textarea
                              aria-label={`Điều kiện đơn ${request.id}`}
                              rows={2}
                              placeholder="Kỳ hạn, VAT, hỗ trợ và điều kiện đã chốt"
                              value={quoteDescriptions[request.id] ?? ""}
                              onChange={(event) =>
                                setQuoteDescriptions((old) => ({
                                  ...old,
                                  [request.id]: event.target.value,
                                }))
                              }
                            />
                            <button
                              className="admin-primary"
                              type="button"
                              disabled={
                                Boolean(busy) ||
                                Number(quoteAmounts[request.id]) < 5000 ||
                                !(quoteDescriptions[request.id] ?? "").trim()
                              }
                              onClick={() => void createRequestInvoice(request)}
                            >
                              Xác nhận giá & gửi hóa đơn
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                <div className="admin-pagination admin-request-pagination">
                  <span>
                    Trang {requestPage.page} / {requestPage.pageCount}
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label="Trang yêu cầu trước"
                      disabled={requestPageNumber <= 1}
                      onClick={() => setRequestPageNumber((page) => page - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="Trang yêu cầu sau"
                      disabled={requestPageNumber >= requestPage.pageCount}
                      onClick={() => setRequestPageNumber((page) => page + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {view === "create" && (
              <section className="admin-create-workspace">
                <div className="admin-create-intro">
                  <p className="admin-kicker">Phát hành thủ công</p>
                  <h2>Tạo khoản cần thu</h2>
                  <p>
                    Chỉ nhập giá đã thống nhất với khách. Email hóa đơn được gửi
                    ngay sau khi tạo; giá danh mục không tự trở thành số tiền
                    phải trả.
                  </p>
                  {[
                    "Số tiền được khóa sau khi phát hành",
                    "Mọi thay đổi trạng thái đều có lịch sử",
                    "Khách nhận email sau thanh toán và hoàn tiền",
                  ].map((item) => (
                    <div className="admin-create-check" key={item}>
                      <Check size={15} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <form className="admin-create-form" onSubmit={create}>
                  <label>
                    Loại dịch vụ
                    <select
                      value={saleType}
                      onChange={(event) =>
                        setSaleType(event.target.value as Invoice["saleType"])
                      }
                    >
                      <option value="hostora_service">Dịch vụ HOSTORA</option>
                      <option value="partner_service">Dịch vụ đối tác</option>
                    </select>
                  </label>
                  {saleType === "partner_service" && (
                    <label>
                      Nhà cung cấp đối tác
                      <input
                        value={partnerProvider}
                        onChange={(event) =>
                          setPartnerProvider(event.target.value)
                        }
                        required
                      />
                    </label>
                  )}
                  <label>
                    Tên dịch vụ
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      minLength={2}
                      maxLength={160}
                      required
                    />
                  </label>
                  <label>
                    Mô tả trên hóa đơn
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  <label>
                    Email nhận hóa đơn
                    <input
                      type="email"
                      autoComplete="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      maxLength={160}
                      required
                    />
                  </label>
                  <label>
                    Tổng tiền (VND)
                    <input
                      type="number"
                      min="5000"
                      max="1000000000"
                      step="1"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                    />
                  </label>
                  <button
                    className="admin-primary admin-wide"
                    disabled={Boolean(busy)}
                  >
                    Tạo và gửi hóa đơn <ArrowRight size={16} />
                  </button>
                </form>
                {created && (
                  <div className="admin-created-panel" role="status">
                    <span className="admin-access-icon">
                      <Check size={20} />
                    </span>
                    <div>
                      <strong>Hóa đơn {created.id} đã được tạo</strong>
                      <p>
                        {emailStatus.configured
                          ? `Email đang được gửi tới ${created.customerEmail}.`
                          : "Chưa thiết lập gửi thư; hãy gửi thông tin tra cứu thủ công."}
                      </p>
                      <dl>
                        <div>
                          <dt>Mã truy cập</dt>
                          <dd>
                            <code>{created.accessCode}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Trang tra cứu</dt>
                          <dd>
                            <code>{location.origin}/orders</code>
                          </dd>
                        </div>
                      </dl>
                      <button
                        className="admin-quiet"
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            `Mã đơn: ${created.id}\nMã truy cập: ${created.accessCode}\nTra cứu: ${location.origin}/orders`,
                          )
                        }
                      >
                        <ClipboardCopy size={15} /> Sao chép thông tin gửi khách
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {selected && (
        <div
          className="admin-detail-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <aside
            className="admin-detail-panel"
            aria-labelledby="admin-detail-title"
          >
            <header>
              <div>
                <p className="admin-kicker">Chi tiết giao dịch</p>
                <h2 id="admin-detail-title">{selected.invoice.id}</h2>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết đơn"
                onClick={() => setSelected(null)}
              >
                <X size={19} />
              </button>
            </header>
            <div className="admin-detail-scroll">
              <section className="admin-detail-summary">
                <div>
                  <span
                    className={`order-status order-status-${selected.invoice.status}`}
                  >
                    {statusLabels[selected.invoice.status]}
                  </span>
                  <h3>{selected.invoice.title}</h3>
                  <p>
                    {selected.invoice.description || "Không có mô tả bổ sung."}
                  </p>
                </div>
                <strong>{money(selected.invoice.amountVnd)}</strong>
              </section>

              <section className="admin-detail-section">
                <h3>Khách hàng & dịch vụ</h3>
                <dl className="admin-evidence-grid">
                  <div>
                    <dt>Email</dt>
                    <dd>
                      {selected.invoice.customerEmail ?? "Chưa có dữ liệu"}
                    </dd>
                  </div>
                  <div>
                    <dt>Đơn vị cung cấp</dt>
                    <dd>
                      {selected.invoice.saleType === "partner_service"
                        ? selected.invoice.partnerProvider
                        : "HOSTORA"}
                    </dd>
                  </div>
                  <div>
                    <dt>Tạo lúc</dt>
                    <dd>{dateTime(selected.invoice.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Cập nhật lúc</dt>
                    <dd>{dateTime(selected.invoice.updatedAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="admin-detail-section">
                <div className="admin-detail-section-title">
                  <div>
                    <h3>Xác nhận từ nơi thanh toán</h3>
                    <p>
                      Mã tham chiếu và lịch sử dùng để kiểm tra, không dựa vào
                      màn hình quay về của khách.
                    </p>
                  </div>
                  {selected.invoice.provider &&
                    selected.invoice.provider !== "demo" &&
                    ["pending", "cancel_requested", "refund_pending"].includes(
                      selected.invoice.status,
                    ) && (
                      <button
                        className="admin-quiet"
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void action(selected.invoice, "reconcile")
                        }
                      >
                        <RefreshCw size={14} /> Kiểm tra giao dịch
                      </button>
                    )}
                </div>
                <dl className="admin-evidence-grid">
                  <div>
                    <dt>Cách thanh toán</dt>
                    <dd>{providerLabel(selected.invoice)}</dd>
                  </div>
                  <div>
                    <dt>Mã phiên / tham chiếu</dt>
                    <dd>
                      {selected.invoice.providerReference ?? "Chưa có dữ liệu"}
                    </dd>
                  </div>
                  <div>
                    <dt>Thời điểm bắt đầu thanh toán</dt>
                    <dd>{gatewayDate(selected.invoice.gatewayCreateDate)}</dd>
                  </div>
                  <div>
                    <dt>Thời điểm được xác nhận</dt>
                    <dd>{gatewayDate(selected.invoice.gatewayPaymentDate)}</dd>
                  </div>
                  <div>
                    <dt>Mã giao dịch</dt>
                    <dd>
                      {selected.invoice.gatewayTransactionNo ??
                        "Chưa có dữ liệu"}
                    </dd>
                  </div>
                  <div>
                    <dt>Mã hoàn tiền</dt>
                    <dd>
                      {selected.invoice.refundReference ?? "Chưa có dữ liệu"}
                    </dd>
                  </div>
                </dl>
              </section>

              {selected.invoice.refundReason && (
                <section className="admin-detail-section">
                  <h3>Lý do khách yêu cầu hoàn</h3>
                  <p>{selected.invoice.refundReason}</p>
                </section>
              )}

              {selected.invoice.status === "refund_requested" && (
                <section className="admin-refund-action">
                  <h3>Xử lý yêu cầu hoàn tiền</h3>
                  <textarea
                    rows={3}
                    aria-label={`Ghi chú xử lý đơn ${selected.invoice.id}`}
                    placeholder="Kết quả kiểm tra và lý do quyết định (ít nhất 8 ký tự)"
                    value={notes[selected.invoice.id] ?? ""}
                    maxLength={500}
                    onChange={(event) =>
                      setNotes((old) => ({
                        ...old,
                        [selected.invoice.id]: event.target.value,
                      }))
                    }
                  />
                  <div>
                    <button
                      className="admin-primary"
                      type="button"
                      disabled={
                        Boolean(busy) ||
                        (notes[selected.invoice.id] ?? "").trim().length < 8
                      }
                      onClick={() =>
                        void action(selected.invoice, "refund", {
                          action: "approve",
                          note: notes[selected.invoice.id],
                        })
                      }
                    >
                      <Check size={15} /> Duyệt hoàn tiền
                    </button>
                    <button
                      className="admin-danger"
                      type="button"
                      disabled={
                        Boolean(busy) ||
                        (notes[selected.invoice.id] ?? "").trim().length < 8
                      }
                      onClick={() =>
                        void action(selected.invoice, "refund", {
                          action: "reject",
                          note: notes[selected.invoice.id],
                        })
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                </section>
              )}

              <section className="admin-detail-section">
                <h3>Lịch sử sự kiện</h3>
                <ol className="admin-audit-list">
                  {selected.events.map((event) => (
                    <li key={event.id}>
                      <span />
                      <div>
                        <strong>{event.detail}</strong>
                        <time>{dateTime(event.createdAt)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
