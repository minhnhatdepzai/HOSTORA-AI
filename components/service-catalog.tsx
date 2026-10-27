"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ProductCategory, ProductOffering } from "@/data/product-catalog";
import { trackFunnelStep } from "@/lib/funnel-client";

const categoryLabels: Record<ProductCategory | "all", string> = {
  all: "Tất cả",
  hosting: "Hosting",
  wordpress: "WordPress",
  vps: "VPS",
  cloud: "Cloud",
  domain: "Tên miền",
  email: "Email",
  ssl: "SSL",
  automation: "Tự động hóa",
  workspace: "Văn phòng",
};

const unitLabels: Record<ProductOffering["billingUnit"], string> = {
  month: "/tháng",
  year: "/năm",
  usage: "/lượt dùng",
  contact: "",
};

function money(value: number | null) {
  return value === null
    ? "Liên hệ"
    : new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

export function ServiceCatalog({
  offerings,
  initialCategory = "all",
}: {
  offerings: ProductOffering[];
  initialCategory?: ProductCategory | "all";
}) {
  const [category, setCategory] = useState<ProductCategory | "all">(
    initialCategory,
  );
  const [provider, setProvider] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductOffering | null>(null);
  const [contact, setContact] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currentWebsite, setCurrentWebsite] = useState("");
  const [mainOffer, setMainOffer] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [seoGoals, setSeoGoals] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("idea");
  const [websiteGoal, setWebsiteGoal] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [estimatedTraffic, setEstimatedTraffic] = useState("under_1k");
  const [budgetRange, setBudgetRange] = useState("under_500k");
  const [consultationPreference, setConsultationPreference] = useState<"scheduled" | "ai">("ai");
  const [consultationDate, setConsultationDate] = useState("");
  const [consultationTime, setConsultationTime] = useState("09:00");
  const [consultationChannel, setConsultationChannel] = useState<"email" | "phone" | "video">("email");
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestResult, setRequestResult] = useState<{ id: string; accessCode: string; consultationPreference: "scheduled" | "ai" } | null>(null);
  const [requestError, setRequestError] = useState("");
  const [consultationDateBounds] = useState(() => {
    const today = new Date();
    const latest = new Date(today);
    latest.setDate(latest.getDate() + 89);
    return { today: today.toISOString().slice(0, 10), latest: latest.toISOString().slice(0, 10) };
  });
  const providers = useMemo(
    () => [...new Set(offerings.map((item) => item.provider))],
    [offerings],
  );
  const categories = useMemo(
    () =>
      ["all", ...new Set(offerings.map((item) => item.category))] as (
        ProductCategory | "all"
      )[],
    [offerings],
  );

  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    return offerings.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (provider !== "all" && item.provider !== provider) return false;
      if (!keyword) return true;
      return [item.name, item.provider, item.summary, ...item.bestFor]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword);
    });
  }, [category, offerings, provider, query]);

  async function requestPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setRequestError("");
    setRequestResult(null);
    try {
      const response = await fetch("/api/payments/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: selected.id, contact, note,
          profile: { customerName, phone, companyName, businessType, currentWebsite, mainOffer, serviceArea, seoGoals, websiteStatus, websiteGoal, targetCustomers, estimatedTraffic, budgetRange },
          consultationPreference,
          consultationAt: consultationPreference === "scheduled" ? new Date(`${consultationDate}T${consultationTime}:00+07:00`).toISOString() : null,
          consultationChannel: consultationPreference === "ai" ? "email" : consultationChannel,
          voucherCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chưa gửi được yêu cầu.");
      setRequestResult({ id: data.id as string, accessCode: data.accessCode as string, consultationPreference: data.consultationPreference as "scheduled" | "ai" });
      trackFunnelStep("product_purchase_requested");
      setContact("");
      setNote("");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Chưa gửi được yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="service-catalog commerce-shell"
      aria-labelledby="catalog-title"
    >
      <div className="catalog-toolbar">
        <div>
          <p className="commerce-kicker dark">TÌM DỊCH VỤ</p>
          <h2 id="catalog-title">Catalog do HOSTORA kiểm tra</h2>
        </div>
        <div className="catalog-controls">
          <label className="catalog-search">
            <Search size={18} />
            <span className="sr-only">Tìm dịch vụ</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: shop, WordPress, email…"
            />
          </label>
          <label className="catalog-select">
            <SlidersHorizontal size={17} />
            <span className="sr-only">Lọc nhà cung cấp</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="all">Mọi nhà cung cấp</option>
              {providers.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="catalog-categories" aria-label="Lọc theo nhóm dịch vụ">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "is-active" : ""}
            onClick={() => setCategory(item)}
          >
            {categoryLabels[item]}
          </button>
        ))}
      </div>

      <div className="catalog-result-line">
        <strong>{visible.length}</strong> dịch vụ phù hợp <span>·</span> Giá xếp
        theo catalog, không phải vị trí quảng cáo
      </div>
      {visible.length > 0 ? (
        <div className="service-list">
          {visible.map((item, index) => (
            <article className="service-row" key={item.id}>
              <div className="service-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="service-identity">
                <p>{item.provider}</p>
                <h3>{item.name}</h3>
                <span>{categoryLabels[item.category]}</span>
              </div>
              <div className="service-description">
                <p>{item.summary}</p>
                <div>
                  {item.bestFor.map((use) => (
                    <span key={use}>{use}</span>
                  ))}
                </div>
              </div>
              <div className="service-price">
                <small>Từ</small>
                <strong>{money(item.priceFromVnd)}</strong>
                <span>{unitLabels[item.billingUnit]}</span>
                {item.priceNote && <p>{item.priceNote}</p>}
              </div>
            <div className="service-source">
                <p>
                  <CalendarDays size={14} />
                  Kiểm tra{" "}
                  {new Intl.DateTimeFormat("vi-VN").format(
                    new Date(item.verifiedAt + "T00:00:00"),
                  )}
                </p>
                <button type="button" onClick={() => { setSelected(item); setRequestResult(null); setRequestError(""); }}>
                  Đặt mua qua HOSTORA
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <Search size={24} />
          <h3>Chưa thấy dịch vụ phù hợp</h3>
          <p>Thử bỏ bớt bộ lọc hoặc mô tả nhu cầu ngắn hơn.</p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setCategory("all");
              setProvider("all");
              setQuery("");
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
      {selected && typeof document !== "undefined" ? createPortal(<div className="purchase-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="purchase-sheet" role="dialog" aria-modal="true" aria-labelledby="purchase-sheet-title">
          <button type="button" className="purchase-sheet-close" onClick={() => setSelected(null)} aria-label="Đóng">×</button>
          <p className="commerce-kicker dark">MUA HÀNG QUA HOSTORA</p>
          <h2 id="purchase-sheet-title">{selected.name}</h2>
          <p>{selected.provider} · {selected.summary}</p>
          {requestResult ? <div className="purchase-confirmation" role="status"><Check size={20} /><div><strong>Hồ sơ đã gửi tới HOSTORA</strong><span>Mã yêu cầu: {requestResult.id}</span><small>Email xác nhận có nút theo dõi và hủy yêu cầu. Chưa có khoản tiền nào bị thu.</small><div className="purchase-confirmation-actions">{requestResult.consultationPreference === "ai" && <Link href="/ai-assistant">Bắt đầu tư vấn với AI</Link>}<Link href={`/orders#requestId=${encodeURIComponent(requestResult.id)}&requestCode=${encodeURIComponent(requestResult.accessCode)}`}>Theo dõi hoặc hủy yêu cầu</Link></div></div></div> : <form onSubmit={requestPurchase} className="purchase-request-form">
            <fieldset className="purchase-form-section"><legend>1. Người mua và doanh nghiệp</legend><div className="purchase-form-grid">
              <label>Họ tên người phụ trách<input required minLength={2} maxLength={100} autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nguyễn Minh Anh" /></label>
              <label>Email nhận xác nhận và hóa đơn<input type="email" required maxLength={160} autoComplete="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="ban@example.com" /></label>
              <label>Số điện thoại <span>(bắt buộc nếu tư vấn qua điện thoại)</span><input maxLength={30} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09…" /></label>
              <label>Tên doanh nghiệp <span>(không bắt buộc)</span><input maxLength={160} autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Công ty / cửa hàng của bạn" /></label>
              <label className="purchase-field-wide">Ngành hoặc loại hình kinh doanh<input required minLength={2} maxLength={120} value={businessType} onChange={(event) => setBusinessType(event.target.value)} placeholder="Ví dụ: thời trang nữ, nha khoa, giáo dục" /></label>
              <label className="purchase-field-wide">Sản phẩm hoặc dịch vụ chủ lực<textarea required minLength={3} maxLength={500} value={mainOffer} onChange={(event) => setMainOffer(event.target.value)} placeholder="Bạn bán gì, điểm khác biệt là gì và khách thường chọn sản phẩm nào?" /></label>
            </div></fieldset>
            <fieldset className="purchase-form-section"><legend>2. Website và khách hàng</legend><div className="purchase-form-grid">
              <label>Tình trạng website<select value={websiteStatus} onChange={(event) => setWebsiteStatus(event.target.value)}><option value="idea">Mới có ý tưởng</option><option value="building">Đang xây dựng</option><option value="live">Đã hoạt động</option><option value="migrating">Muốn chuyển hệ thống</option></select></label>
              <label>Website hiện tại <span>(nếu có)</span><input maxLength={253} inputMode="url" value={currentWebsite} onChange={(event) => setCurrentWebsite(event.target.value)} placeholder="tenmien.vn" /></label>
              <label>Lượt truy cập dự kiến<select value={estimatedTraffic} onChange={(event) => setEstimatedTraffic(event.target.value)}><option value="under_1k">Dưới 1.000/tháng</option><option value="1k_10k">1.000–10.000/tháng</option><option value="10k_50k">10.000–50.000/tháng</option><option value="over_50k">Trên 50.000/tháng</option></select></label>
              <label>Khu vực phục vụ<input required minLength={2} maxLength={160} value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} placeholder="Ví dụ: TP.HCM, toàn quốc" /></label>
              <label className="purchase-field-wide">Mục tiêu chính của website<textarea required minLength={5} maxLength={500} value={websiteGoal} onChange={(event) => setWebsiteGoal(event.target.value)} placeholder="Bán hàng, nhận đặt lịch, giới thiệu doanh nghiệp…" /></label>
              <label className="purchase-field-wide">Khách hàng mục tiêu<textarea required minLength={3} maxLength={500} value={targetCustomers} onChange={(event) => setTargetCustomers(event.target.value)} placeholder="Ai sẽ truy cập và họ cần làm gì trên website?" /></label>
              <label className="purchase-field-wide">Mục tiêu tìm kiếm / SEO <span>(không bắt buộc)</span><textarea maxLength={500} value={seoGoals} onChange={(event) => setSeoGoals(event.target.value)} placeholder="Khách thường gõ từ khóa nào để tìm sản phẩm hoặc dịch vụ của bạn?" /></label>
              <label>Ngân sách vận hành mỗi tháng<select value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)}><option value="under_500k">Dưới 500.000đ</option><option value="500k_1m">500.000đ–1 triệu</option><option value="1m_3m">1–3 triệu</option><option value="over_3m">Trên 3 triệu</option></select></label>
              <label>Mã voucher <span>(nếu có)</span><input maxLength={40} value={voucherCode} onChange={(event) => setVoucherCode(event.target.value.toUpperCase())} placeholder="HOSTORA-…" /></label>
            </div></fieldset>
            <fieldset className="purchase-form-section"><legend>3. Cách bạn muốn được tư vấn</legend><div className="purchase-choice-row"><button type="button" aria-pressed={consultationPreference === "ai"} className={consultationPreference === "ai" ? "is-active" : ""} onClick={() => setConsultationPreference("ai")}>AI tư vấn ngay</button><button type="button" aria-pressed={consultationPreference === "scheduled"} className={consultationPreference === "scheduled" ? "is-active" : ""} onClick={() => setConsultationPreference("scheduled")}>Chọn lịch với chuyên viên</button></div>{consultationPreference === "scheduled" && <div className="purchase-form-grid"><label>Ngày mong muốn<input type="date" required min={consultationDateBounds.today} max={consultationDateBounds.latest} value={consultationDate} onChange={(event) => setConsultationDate(event.target.value)} /></label><label>Khung giờ<select value={consultationTime} onChange={(event) => setConsultationTime(event.target.value)}><option value="09:00">09:00</option><option value="14:00">14:00</option><option value="19:00">19:00</option></select></label><label className="purchase-field-wide">Kênh tư vấn<select value={consultationChannel} onChange={(event) => setConsultationChannel(event.target.value as "email" | "phone" | "video")}><option value="email">Email</option><option value="phone">Điện thoại</option><option value="video">Cuộc gọi video</option></select></label></div>}</fieldset>
            <label htmlFor="purchase-note">Yêu cầu chi tiết <span>(không bắt buộc)</span></label><textarea id="purchase-note" maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sản phẩm đang bán, tính năng cần có, thời hạn triển khai hoặc điều bạn đang lo nhất…" />
            <div className="purchase-voucher-note"><strong>Quà cho đơn từ 1.000.000đ</strong><span>Sau khi thanh toán thành công, nhận voucher 100.000đ cho lần mua tiếp theo từ 1.000.000đ, hiệu lực 30 ngày.</span></div>
            <p className="purchase-note">HOSTORA chỉ dùng hồ sơ này để tư vấn, báo giá và vận hành đơn. Dữ liệu cá nhân không được gửi vào AI.</p>
            {requestError && <p role="alert" className="purchase-error">{requestError}</p>}
            <button type="submit" disabled={busy || (consultationPreference === "scheduled" && consultationChannel === "phone" && phone.trim().length < 8)}>{busy ? "Đang tạo hồ sơ…" : "Gửi hồ sơ mua hàng"}</button>
          </form>}
        </section>
      </div>, document.body) : null}
    </section>
  );
}
