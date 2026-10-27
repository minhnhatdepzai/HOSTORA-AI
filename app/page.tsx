import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  Gauge,
  Globe2,
  ReceiptText,
  Server,
  Sparkles,
} from "lucide-react";
import { FAQ } from "@/components/faq";
import { HeroVisual } from "@/components/hero-visual";
import { TextRevealHeading } from "@/components/text-reveal-heading";
import { StructuredData } from "@/components/structured-data";
import ClickSpark from "@/components/ui/click-spark";
import { hostingCatalog } from "@/data/hosting-catalog";
import { pageMetadata } from "@/lib/page-metadata";
import { absoluteSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = pageMetadata({
  title: "Hosting, tên miền và website AI cho doanh nghiệp Việt",
  description:
    "Tạo thử website, so sánh hosting và tên miền, gửi hồ sơ mua và theo dõi thanh toán ngay tại HOSTORA.",
  path: "/",
  keywords: [
    "mua hosting Việt Nam",
    "tạo website AI",
    "tên miền doanh nghiệp",
    "hosting cho website bán hàng",
  ],
});

const featuredIds = [
  "hostinger-single",
  "azdigi-az-pro-1",
  "vietnix-wordpress-1",
] as const;
const featuredPlans = featuredIds.map((id) => {
  const plan = hostingCatalog.find((item) => item.id === id);
  if (!plan) throw new Error(`Không tìm thấy gói nổi bật ${id}`);
  return plan;
});

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteSiteUrl("/")}#organization`,
        name: "HOSTORA",
        url: absoluteSiteUrl("/"),
        logo: absoluteSiteUrl("/hostora-icon.png"),
        description:
          "Nền tảng tư vấn, tạo website và đặt mua dịch vụ hạ tầng số cho doanh nghiệp Việt.",
      },
      {
        "@type": "WebSite",
        "@id": `${absoluteSiteUrl("/")}#website`,
        name: "HOSTORA AI",
        url: absoluteSiteUrl("/"),
        inLanguage: "vi-VN",
        publisher: { "@id": `${absoluteSiteUrl("/")}#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "HOSTORA AI",
        operatingSystem: "Android",
        applicationCategory: "BusinessApplication",
        inLanguage: "vi-VN",
        description:
          "Ứng dụng tạo ý tưởng website, so sánh dịch vụ và theo dõi đơn hàng HOSTORA.",
        downloadUrl: absoluteSiteUrl("/downloads/android"),
        offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
      },
    ],
  };
  return (
    <>
      <StructuredData data={structuredData} />
      <section className="commerce-hero compact-home-hero">
        <div className="commerce-shell commerce-hero-grid">
          <div className="commerce-hero-copy">
            <p className="commerce-kicker">
              ỨNG DỤNG CỐ VẤN TRANG WEB · ANDROID
            </p>
            <TextRevealHeading
              level="h1"
              segments={[
                { text: "Chọn dịch vụ cho trang web." },
                { text: "Rõ giá trước khi mua.", emphasis: true },
              ]}
            />
            <p className="commerce-lede">
              Dùng HOSTORA để tạo ý tưởng trang web, xem trọn danh sách dịch vụ,
              gửi yêu cầu mua và theo dõi hóa đơn.
            </p>
            <div className="commerce-hero-actions">
              <ClickSpark
                sparkColor={["#b7ead8", "#f0c29f"]}
                sparkCount={7}
                sparkRadius={22}
                sparkSize={7}
                sparkWidth={1.5}
                style={{ width: "fit-content", height: "auto" }}
              >
                <a
                  className="button-primary commerce-primary"
                  href="/downloads/android"
                  download
                >
                  <Download size={18} /> Tải ứng dụng Android
                </a>
              </ClickSpark>
              <Link className="commerce-text-link" href="/website-studio">
                Tạo trang web với trợ lý <Sparkles size={17} />
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="home-quick-entry" aria-label="Lối tắt HOSTORA">
        <div className="commerce-shell home-quick-grid">
          <a href="/downloads/android" download>
            <span>01</span>
            <Download size={22} />
            <div>
              <strong>Tải ứng dụng</strong>
              <small>Trải nghiệm đầy đủ trên Android</small>
            </div>
            <ArrowRight size={18} />
          </a>
          <Link href="/website-studio">
            <span>02</span>
            <Sparkles size={22} />
            <div>
              <strong>Tạo trang web với trợ lý</strong>
              <small>Xem bản thử rồi chọn nơi lưu trữ</small>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/orders">
            <span>03</span>
            <ReceiptText size={22} />
            <div>
              <strong>Thanh toán nhanh</strong>
              <small>Tra mã hóa đơn HOSTORA</small>
            </div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="app-editorial home-app-first">
        <div className="commerce-shell app-editorial-grid">
          <div className="app-editorial-copy">
            <p className="commerce-kicker">ƯU TIÊN TRẢI NGHIỆM TRÊN ỨNG DỤNG</p>
            <h2>Mang cố vấn trang web theo cùng bạn.</h2>
            <p>
              Tạo ý tưởng, xem dịch vụ, nhận hướng dẫn và tra cứu đơn hàng trên
              điện thoại. Giao diện đã tối ưu vùng an toàn cho màn hình nhỏ.
            </p>
            <ClickSpark
              sparkColor={["#b7ead8", "#f0c29f"]}
              sparkCount={7}
              sparkRadius={22}
              sparkSize={7}
              sparkWidth={1.5}
              style={{ width: "fit-content", height: "auto" }}
            >
              <a
                className="button-primary commerce-primary"
                href="/downloads/android"
                download
              >
                <Download size={18} /> Tải HOSTORA 2.0.5
              </a>
            </ClickSpark>
          </div>
          <div
            className="app-specimen"
            aria-label="Các tính năng của ứng dụng HOSTORA"
          >
            <div className="app-specimen-brand">
              <Sparkles size={18} />
              <strong>HOSTORA</strong>
              <span>ANDROID</span>
            </div>
            <p>
              Từ một ý tưởng
              <br />
              đến trang web đầu tiên.
            </p>
            <ul>
              <li>
                <Check size={15} />
                Hướng dẫn hoàn toàn bằng tiếng Việt
              </li>
              <li>
                <Check size={15} />
                Giá và gia hạn tách rõ
              </li>
              <li>
                <Check size={15} />
                Tra cứu hóa đơn riêng tư
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-studio-teaser">
        <div className="commerce-shell home-studio-grid">
          <div>
            <p className="commerce-kicker dark">
              CHƯA BIẾT NÊN LÀM WEBSITE GÌ?
            </p>
            <h2>Kể ý tưởng. HOSTORA dựng thử.</h2>
            <p>
              Trợ lý hỏi về khách hàng, mục tiêu và phong cách. Bạn nhận một
              trang web xem trước có thể tải xuống, sau đó HOSTORA gợi ý nơi lưu
              trữ theo nhu cầu đã chọn.
            </p>
            <ClickSpark
              sparkColor={["#b7ead8", "#f0c29f"]}
              sparkCount={7}
              sparkRadius={22}
              sparkSize={7}
              sparkWidth={1.5}
              style={{ width: "fit-content", height: "auto" }}
            >
              <Link className="button-primary" href="/website-studio">
                Mở xưởng tạo trang web <ArrowRight size={17} />
              </Link>
            </ClickSpark>
          </div>
          <div className="home-studio-demo" aria-hidden="true">
            <div>
              <span>XƯỞNG WEBSITE HOSTORA</span>
              <b>
                Website của bạn
                <br />
                bắt đầu từ đây.
              </b>
              <i>TẠO BẢN XEM TRƯỚC</i>
            </div>
            <aside>
              <small>01 · Ý TƯỞNG</small>
              <small>02 · PHONG CÁCH</small>
              <small>03 · NƠI LƯU TRỮ</small>
            </aside>
          </div>
        </div>
      </section>

      <section className="commerce-section commerce-popular home-plans-compact">
        <div className="commerce-shell">
          <div className="commerce-section-heading">
            <div>
              <p className="commerce-kicker dark">
                MỘT VÀI GÓI ĐỂ SO SÁNH NHANH
              </p>
              <h2>Không cần xem cả danh sách dài.</h2>
            </div>
            <p>
              Ba gói khởi điểm được lấy trực tiếp từ danh mục đã ghi nguồn. Muốn
              xem đầy đủ, mở danh sách dịch vụ hoặc dùng ứng dụng.
            </p>
          </div>
          <div className="plan-rail">
            {featuredPlans.map((plan, index) => (
              <article className="plan-card" key={plan.id}>
                <div className="plan-card-topline">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{plan.provider}</span>
                </div>
                <h3>{plan.productFamily ?? plan.name}</h3>
                {plan.productFamily && (
                  <p className="plan-name">Gói {plan.name}</p>
                )}
                <p className="plan-price">
                  <strong>{money(plan.promoMonthlyVnd)}</strong>
                  <span>/ tháng</span>
                </p>
                <p className="plan-cycle">
                  Thanh toán theo kỳ {plan.billingMonths} tháng
                </p>
                <ul>
                  <li>
                    <Server size={15} />
                    {plan.storageGb} GB {plan.storageType}
                  </li>
                  <li>
                    <Globe2 size={15} />
                    {plan.websites} website
                  </li>
                  <li>
                    <Gauge size={15} />
                    {plan.backup === "daily"
                      ? "Sao lưu hằng ngày"
                      : plan.backup === "weekly"
                        ? "Sao lưu hằng tuần"
                        : "Có chính sách sao lưu"}
                  </li>
                </ul>
                {plan.renewalMonthlyVnd ? (
                  <p className="plan-renewal">
                    Gia hạn tham khảo:{" "}
                    <strong>{money(plan.renewalMonthlyVnd)}/tháng</strong>
                  </p>
                ) : (
                  <p className="plan-renewal">
                    Giá gia hạn: <strong>Chưa có dữ liệu</strong>
                  </p>
                )}
                <div className="plan-card-actions">
                  <Link href="/services?category=hosting">
                    Đặt mua qua HOSTORA <ArrowRight size={15} />
                  </Link>
                  <Link href="/website-studio">Tạo web thử</Link>
                </div>
              </article>
            ))}
          </div>
          <Link className="commerce-inline-action" href="/services">
            Xem đầy đủ dịch vụ <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="home-payment-fast">
        <div className="commerce-shell">
          <div>
            <p className="commerce-kicker">ĐÃ CÓ MÃ HÓA ĐƠN?</p>
            <h2>Tra cứu và thanh toán ngay.</h2>
            <p>
              Stripe và VNPay hiện chỉ dùng để thử quy trình, chưa thu tiền
              thật.
            </p>
          </div>
          <Link className="button-primary commerce-primary" href="/orders">
            <ReceiptText size={18} /> Thanh toán nhanh
          </Link>
        </div>
      </section>
      <FAQ />
    </>
  );
}
