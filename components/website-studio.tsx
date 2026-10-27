"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Download,
  LoaderCircle,
  MonitorSmartphone,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  buildPreviewHtml,
  type SiteBrief,
  type SiteIdea,
} from "@/lib/site-studio";
import { getAnonymousSessionId, trackFunnelStep } from "@/lib/funnel-client";
import { TextRevealHeading } from "@/components/text-reveal-heading";
import { SitePreviewWindow } from "@/components/site-preview-window";
import { StudioSharedProject } from "@/components/studio-shared-project";

type Recommendation = {
  id: string;
  provider: string;
  name: string;
  score: number;
  promoMonthlyVnd: number;
  renewalMonthlyVnd: number | null;
  billingMonths: number;
  sourceUrl: string;
  verifiedAt: string;
  reasons: string[];
  cautions: string[];
};

type StudioResult = {
  idea: SiteIdea;
  brief: SiteBrief;
  recommendations: Recommendation[];
  generationMode: "local-ai" | "template-fallback";
  notice: string;
  project?: {
    id: string;
    url: string;
    downloadUrl: string;
    published: boolean;
    repositoryUrl: string | null;
    publishMessage: string;
  };
};

const businessOptions = [
  ["food", "Ẩm thực"],
  ["retail", "Bán lẻ"],
  ["service", "Dịch vụ"],
  ["portfolio", "Cá nhân"],
  ["education", "Giáo dục"],
] as const;
const goalOptions = [
  ["sell", "Bán hàng"],
  ["book", "Nhận đặt lịch"],
  ["showcase", "Giới thiệu sản phẩm"],
  ["contact", "Nhận liên hệ"],
] as const;
const styleOptions = [
  ["editorial", "Biên tập"],
  ["bold", "Táo bạo"],
  ["warm", "Ấm áp"],
  ["minimal", "Tối giản"],
] as const;
const trafficPresets = [1_000, 5_000, 10_000, 50_000, 100_000] as const;
const budgetPresets = [100_000, 300_000, 600_000, 1_000_000] as const;
const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const initialIdea: SiteIdea = {
  brand: "",
  idea: "",
  business: "service",
  goal: "contact",
  audience: "",
  style: "editorial",
  monthlyVisits: 5000,
  monthlyBudget: 100000,
  needsDomain: true,
  color: "#11695e",
};

function money(value: number | null) {
  return value === null
    ? "Chưa có dữ liệu"
    : new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

export function WebsiteStudio() {
  const [idea, setIdea] = useState<SiteIdea>(initialIdea);
  const [colorDraft, setColorDraft] = useState(initialIdea.color);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(
    () => (result ? buildPreviewHtml(result.idea, result.brief) : ""),
    [result],
  );
  const missingRequirements = [
    ...(idea.brand.trim().length < 2 ? ["tên thương hiệu"] : []),
    ...(idea.audience.trim().length < 3 ? ["khách hàng chính"] : []),
    ...(idea.idea.trim().length < 12 ? ["ý tưởng (ít nhất 12 ký tự)"] : []),
    ...(!isHexColor(colorDraft) ? ["mã HEX hợp lệ"] : []),
    ...(!Number.isInteger(idea.monthlyVisits) ||
    idea.monthlyVisits < 1 ||
    idea.monthlyVisits > 100_000_000
      ? ["lượt truy cập hợp lệ"]
      : []),
    ...(!Number.isInteger(idea.monthlyBudget) ||
    idea.monthlyBudget < 10_000 ||
    idea.monthlyBudget > 100_000_000
      ? ["ngân sách hợp lệ"]
      : []),
  ];

  useEffect(() => {
    trackFunnelStep("studio_opened");
  }, []);

  function update<Key extends keyof SiteIdea>(key: Key, value: SiteIdea[Key]) {
    setIdea((current) => ({ ...current, [key]: value }));
  }

  function updateColor(value: string) {
    setColorDraft(value);
    if (isHexColor(value)) update("color", value);
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/site-studio", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hostora-session": getAnonymousSessionId() ?? "",
        },
        body: JSON.stringify(idea),
      });
      const payload = (await response.json()) as StudioResult & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Chưa thể tạo bản demo.");
      setResult({ ...payload, idea });
      trackFunnelStep("demo_created");
      requestAnimationFrame(() =>
        document
          .getElementById("studio-preview")
          ?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chưa thể tạo bản demo.",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadPreview() {
    if (!preview) return;
    const url = URL.createObjectURL(
      new Blob([preview], { type: "text/html;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result?.idea.brand.toLocaleLowerCase("vi").replace(/[^a-z0-9]+/g, "-") || "website"}-demo.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="studio-page">
      <section className="studio-hero">
        <div className="commerce-shell studio-hero-grid">
          <div>
            <p className="commerce-kicker">HOSTORA · XƯỞNG TẠO WEBSITE</p>
            <TextRevealHeading
              level="h1"
              segments={[
                { text: "Mô tả ý tưởng." },
                {
                  text: "Nhìn thấy trang web.",
                  emphasis: true,
                  breakBefore: true,
                },
              ]}
            />
          </div>
          <div className="studio-hero-copy">
            <Sparkles size={19} />
            <p>
              Trả lời vài câu ngắn. AI cục bộ soạn nội dung, HOSTORA dựng bản
              demo và chọn gói hosting bằng dữ liệu đã kiểm tra.
            </p>
          </div>
        </div>
      </section>

      <section className="commerce-shell studio-workspace">
        <form className="studio-conversation" onSubmit={generate}>
          <div className="studio-conversation-head">
            <span>
              <Bot size={18} />
            </span>
            <div>
              <strong>Xưởng trang web HOSTORA</strong>
              <small>Trò chuyện riêng tư trên máy HOSTORA</small>
            </div>
          </div>
          <div className="studio-message">
            <span>01</span>
            <div>
              <strong>Bạn đang muốn tạo trang web gì?</strong>
              <p>
                Nói như đang kể cho một người thiết kế. Không cần dùng thuật ngữ
                kỹ thuật.
              </p>
            </div>
          </div>
          <div className="studio-fields two">
            <label>
              <span>Tên thương hiệu</span>
              <input
                required
                minLength={2}
                maxLength={60}
                value={idea.brand}
                onChange={(event) => update("brand", event.target.value)}
                placeholder="Ví dụ: Mộc Cafe"
              />
            </label>
            <label>
              <span>Khách hàng chính</span>
              <input
                required
                minLength={3}
                maxLength={160}
                value={idea.audience}
                onChange={(event) => update("audience", event.target.value)}
                placeholder="Ví dụ: dân văn phòng ở Quận 1"
              />
            </label>
          </div>
          <label className="studio-textarea">
            <span>Ý tưởng của bạn</span>
            <textarea
              required
              minLength={12}
              maxLength={500}
              value={idea.idea}
              onChange={(event) => update("idea", event.target.value)}
              placeholder="Tôi mở quán cà phê yên tĩnh, muốn khách xem menu, không gian và đặt bàn…"
            />
          </label>

          <div className="studio-message">
            <span>02</span>
            <div>
              <strong>Website thuộc nhóm nào và cần làm việc gì?</strong>
              <p>Lựa chọn này giúp AI viết đúng lời kêu gọi hành động.</p>
            </div>
          </div>
          <ChoiceGroup
            label="Loại hình"
            options={businessOptions}
            value={idea.business}
            onChange={(value) => update("business", value)}
          />
          <ChoiceGroup
            label="Mục tiêu chính"
            options={goalOptions}
            value={idea.goal}
            onChange={(value) => update("goal", value)}
          />

          <div className="studio-message">
            <span>03</span>
            <div>
              <strong>Bạn thích cảm giác nào?</strong>
              <p>
                Chọn phong cách làm điểm bắt đầu, đổi màu theo thương hiệu và tự
                nhập quy mô kinh doanh của bạn.
              </p>
            </div>
          </div>
          <ChoiceGroup
            label="Phong cách"
            options={styleOptions}
            value={idea.style}
            onChange={(value) => update("style", value)}
          />
          <fieldset className="studio-choice">
            <div className="studio-custom-color">
              <label htmlFor="studio-color-picker">
                Bảng mã màu · chọn bất kỳ màu thương hiệu nào
              </label>
              <div className="studio-palette-field">
                <label className="studio-color-trigger" title="Mở bảng màu">
                  <input
                    id="studio-color-picker"
                    type="color"
                    aria-label="Mở bảng màu"
                    value={idea.color}
                    onChange={(event) => updateColor(event.target.value)}
                  />
                  <span
                    className="studio-palette-preview"
                    style={{ backgroundColor: idea.color }}
                    aria-hidden="true"
                  />
                </label>
                <input
                  type="text"
                  aria-label="Mã màu HEX tùy chỉnh"
                  value={colorDraft}
                  onChange={(event) => updateColor(event.target.value)}
                  placeholder="#11695E"
                  maxLength={7}
                  pattern="#[0-9a-fA-F]{6}"
                  required
                />
                <span className="studio-palette-hint">
                  Mở bảng màu hoặc nhập mã HEX
                </span>
              </div>
              {!isHexColor(colorDraft) && (
                <small>Nhập mã màu đủ 6 ký tự, ví dụ #11695E.</small>
              )}
            </div>
          </fieldset>

          <div className="studio-message">
            <span>04</span>
            <div>
              <strong>Quy mô dự kiến ra sao?</strong>
              <p>
                Thông tin này chỉ dùng cho bộ chấm điểm hosting, không gửi tới
                nhà cung cấp.
              </p>
            </div>
          </div>
          <fieldset className="studio-choice">
            <legend>Lượt truy cập mỗi tháng · nhập theo dự tính của bạn</legend>
            <input
              className="studio-custom-number"
              type="number"
              min="1"
              max="100000000"
              step="1"
              required
              aria-label="Lượt truy cập dự kiến mỗi tháng"
              value={idea.monthlyVisits}
              onChange={(event) =>
                update("monthlyVisits", Number(event.target.value))
              }
            />
            <div className="studio-preset-caption">
              Cho phép 1 đến 100.000.000 lượt/tháng · mức dưới đây để chọn nhanh
            </div>
            <div className="studio-presets">
              {trafficPresets.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={idea.monthlyVisits === value}
                  className={idea.monthlyVisits === value ? "is-active" : ""}
                  onClick={() => update("monthlyVisits", value)}
                >
                  {value.toLocaleString("vi-VN")}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="studio-choice">
            <legend>
              Ngân sách hosting mỗi tháng · nhập theo khả năng của bạn
            </legend>
            <input
              className="studio-custom-number"
              type="number"
              min="10000"
              max="100000000"
              step="1000"
              required
              aria-label="Ngân sách hosting mỗi tháng bằng đồng"
              value={idea.monthlyBudget}
              onChange={(event) =>
                update("monthlyBudget", Number(event.target.value))
              }
            />
            <div className="studio-preset-caption">
              10.000đ đến 100.000.000đ/tháng · mức dưới đây để chọn nhanh
            </div>
            <div className="studio-presets">
              {budgetPresets.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={idea.monthlyBudget === value}
                  className={idea.monthlyBudget === value ? "is-active" : ""}
                  onClick={() => update("monthlyBudget", value)}
                >
                  {money(value)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={idea.needsDomain}
              onChange={(event) => update("needsDomain", event.target.checked)}
            />
            <span>
              <Check size={15} />
              Tôi cần mua tên miền mới
            </span>
          </label>

          {error && <p className="studio-error">{error}</p>}
          <button className="studio-generate" disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle className="animate-spin" size={18} /> AI đang dựng
                trang web và kiểm tra nội dung · có thể mất một đến hai phút…
              </>
            ) : (
              <>
                <Send size={18} /> Tạo trang web và chọn nơi lưu trữ
              </>
            )}
          </button>
          <p className="studio-form-help" aria-live="polite">
            {missingRequirements.length
              ? `Còn cần nhập: ${missingRequirements.join(", ")}.`
              : "Thông tin đã đủ. Nhấn nút để dựng trang web và đề xuất nơi lưu trữ."}
          </p>
          <p className="studio-privacy">
            Không nhập số điện thoại, email hoặc thông tin bí mật. HOSTORA lưu
            link bản demo; bạn quyết định khi nào xuất bản lên tên miền riêng.
          </p>
        </form>

        <aside id="studio-preview" className="studio-preview-pane">
          <div className="studio-preview-head">
            <span>
              <MonitorSmartphone size={17} /> BẢN XEM TRƯỚC
            </span>
            {result && (
              <button type="button" onClick={downloadPreview}>
                <Download size={15} /> Tải HTML
              </button>
            )}
          </div>
          {result ? (
            <SitePreviewWindow idea={result.idea} brief={result.brief} />
          ) : (
            <div className="studio-preview-empty">
              <Sparkles size={28} />
              <strong>Website của bạn sẽ xuất hiện ở đây</strong>
              <p>
                Hoàn thành bốn câu hỏi để xem bản demo thật, không phải ảnh minh
                họa.
              </p>
            </div>
          )}
        </aside>
      </section>

      {result && (
        <section id="studio-result" className="studio-result">
          <div className="commerce-shell">
            <div className="studio-result-title">
              <div>
                <p className="commerce-kicker dark">BƯỚC TIẾP THEO</p>
                <h2>Website đã có hình. Giờ chọn nơi đặt nó.</h2>
              </div>
              <p>{result.notice}</p>
            </div>
            <div className="studio-recommendations">
              {result.recommendations.map((item, index) => (
                <article key={item.id} className={index === 0 ? "is-best" : ""}>
                  <div>
                    <span>
                      {index === 0 ? "PHÙ HỢP NHẤT" : `PHƯƠNG ÁN ${index + 1}`}
                    </span>
                    <b>{item.score}/100</b>
                  </div>
                  <p>{item.provider}</p>
                  <h3>{item.name}</h3>
                  <strong>
                    {money(item.promoMonthlyVnd)}
                    <small>/tháng</small>
                  </strong>
                  <p>
                    Trả theo kỳ {item.billingMonths} tháng · Gia hạn:{" "}
                    {money(item.renewalMonthlyVnd)}
                  </p>
                  <ul>
                    {item.reasons.map((reason) => (
                      <li key={reason}>
                        <Check size={14} />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/services?category=hosting"
                    onClick={() => trackFunnelStep("plan_opened")}
                  >
                    Đặt mua qua HOSTORA <ArrowRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
            <div className="studio-result-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setResult(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <RotateCcw size={16} /> Làm ý tưởng khác
              </button>
              <Link className="button-primary" href="/orders">
                Thanh toán hóa đơn HOSTORA <ArrowRight size={16} />
              </Link>
            </div>
            {result.project && (
              <StudioSharedProject
                project={{
                  id: result.project.id,
                  idea: result.idea,
                  brief: result.brief,
                  downloadUrl: result.project.downloadUrl,
                  sharePath: result.project.url,
                  repositoryUrl: result.project.repositoryUrl,
                  publishMessage: result.project.publishMessage,
                }}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ChoiceGroup<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [Value, string])[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className="studio-choice">
      <legend>{label}</legend>
      <div>
        {options.map(([option, title]) => (
          <button
            key={option}
            type="button"
            className={value === option ? "is-active" : ""}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {title}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
