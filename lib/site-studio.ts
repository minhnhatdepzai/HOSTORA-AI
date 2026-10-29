import { z } from "zod";
import { recommendPlans } from "@/lib/recommendation";
import type { Requirements } from "@/lib/types";

export const siteIdeaSchema = z
  .object({
    brand: z.string().trim().min(2).max(60),
    idea: z.string().trim().min(12).max(1000),
    story: z.string().trim().max(400).optional(),
    offerings: z.string().trim().max(400).optional(),
    customerAction: z.string().trim().max(300).optional(),
    business: z.enum(["food", "retail", "service", "portfolio", "education"]),
    goal: z.enum(["sell", "book", "showcase", "contact"]),
    audience: z.string().trim().min(3).max(160),
    style: z.enum(["editorial", "bold", "warm", "minimal"]),
    monthlyVisits: z.number().int().min(1).max(100000000),
    monthlyBudget: z.number().int().min(10000).max(100000000),
    needsDomain: z.boolean(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();

export type SiteIdea = z.infer<typeof siteIdeaSchema>;

export const siteBriefSchema = z
  .object({
    headline: z.string().trim().min(6).max(90),
    subheadline: z.string().trim().min(20).max(220),
    ctaLabel: z.string().trim().min(2).max(28),
    aboutTitle: z.string().trim().min(4).max(70),
    aboutCopy: z.string().trim().min(30).max(320),
    features: z
      .array(
        z.object({
          title: z.string().trim().min(2).max(45),
          copy: z.string().trim().min(12).max(130),
        }),
      )
      .length(3),
    offerTitle: z.string().trim().min(4).max(80).optional(),
    offerCopy: z.string().trim().min(30).max(320).optional(),
    audienceTitle: z.string().trim().min(4).max(80).optional(),
    audienceCopy: z.string().trim().min(30).max(320).optional(),
    closingLine: z.string().trim().min(12).max(160).optional(),
    seoTitle: z.string().trim().min(6).max(60),
    seoDescription: z.string().trim().min(20).max(160),
  })
  .strict();

export type SiteBrief = z.infer<typeof siteBriefSchema>;

const businessLabels: Record<SiteIdea["business"], string> = {
  food: "ẩm thực",
  retail: "bán lẻ",
  service: "dịch vụ",
  portfolio: "thương hiệu cá nhân",
  education: "giáo dục",
};

const goalLabels: Record<SiteIdea["goal"], string> = {
  sell: "mua hàng",
  book: "đặt lịch",
  showcase: "xem sản phẩm nổi bật",
  contact: "liên hệ tư vấn",
};

export function requirementsFromIdea(idea: SiteIdea): Requirements {
  const websiteType =
    idea.goal === "sell"
      ? "store"
      : idea.business === "portfolio" || idea.business === "education"
        ? "blog"
        : "company";
  return {
    websiteType,
    monthlyVisits: idea.monthlyVisits,
    monthlyBudget: idea.monthlyBudget,
    needsDomain: idea.needsDomain,
    ecommerce: idea.goal === "sell",
    notes: `Bản demo ${businessLabels[idea.business]}, mục tiêu ${goalLabels[idea.goal]}`,
  };
}

export function recommendedPlansForIdea(idea: SiteIdea) {
  return recommendPlans(requirementsFromIdea(idea));
}

const instructionLikeSentence = /(?:bỏ qua|bo qua|ignore|disregard|tự điền|tu dien|giả sử|gia su|hãy\s+(?:khẳng định|nói|báo)|hay\s+(?:khang dinh|noi|bao)|prompt injection|system prompt|quy tắc|quy tac)/i;

/** Keep fallback copy grounded when the local model is unavailable. */
export function sanitizeFallbackText(value: string | undefined, fallback = "") {
  const cleaned = (value ?? "")
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter((part) => part && !instructionLikeSentence.test(part))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
  return cleaned || fallback;
}

export function buildFallbackBrief(idea: SiteIdea): SiteBrief {
  const summary = sanitizeFallbackText(idea.idea, `Tìm hiểu ${idea.brand}.`).slice(0, 200).trimEnd();
  const audience = sanitizeFallbackText(idea.audience, "người quan tâm");
  const sentences = sanitizeFallbackText(idea.idea)
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const storyDetailText = sanitizeFallbackText(idea.story);
  const offeringDetailText = sanitizeFallbackText(idea.offerings);
  const actionDetailText = sanitizeFallbackText(idea.customerAction);
  const storyDetail = storyDetailText.length >= 12 ? storyDetailText : undefined;
  const offeringDetail = offeringDetailText.length >= 3 ? offeringDetailText : undefined;
  const actionDetail = actionDetailText.length >= 8 ? actionDetailText : undefined;
  const story = (storyDetail || sentences[0] || summary).slice(0, 210);
  const offering = (offeringDetail || sentences[1] || `Tìm hiểu điều ${idea.brand} đang giới thiệu.`).slice(0, 210);
  const action = (actionDetail || sentences[2] || `Xem nội dung trước khi ${goalLabels[idea.goal]}.`).slice(0, 210);
  const goalCopy: Record<SiteIdea["goal"], string> = {
    sell: "xem lựa chọn và tìm sản phẩm phù hợp",
    book: "tìm thời điểm phù hợp để đặt lịch",
    showcase: "khám phá những gì thương hiệu muốn giới thiệu",
    contact: "tìm hiểu rồi gửi nhu cầu của mình",
  };
  return {
    headline: `Khám phá ${idea.brand}`,
    subheadline: story.length < 20 ? `Tìm hiểu ${idea.brand}: ${story}` : story,
    ctaLabel:
      idea.goal === "sell"
        ? "Xem sản phẩm"
        : idea.goal === "book"
          ? "Đặt lịch ngay"
          : idea.goal === "showcase"
            ? "Khám phá ngay"
            : "Nhận tư vấn",
    aboutTitle: `Một nơi dành cho ${audience}`.slice(0, 70),
    aboutCopy: `${story} ${idea.brand} hướng đến ${audience}.`.slice(0, 320),
    features: [
      {
        title: "Lý do bắt đầu",
        copy: story.length >= 12 ? story.slice(0, 130) : `Tìm hiểu lý do ${idea.brand} bắt đầu.`,
      },
      {
        title: "Sản phẩm và dịch vụ",
        copy: offering.length >= 12 ? offering.slice(0, 130) : `Xem nội dung của ${idea.brand} trước khi chọn.`,
      },
      {
        title: "Cách bắt đầu",
        copy: action.length >= 12 ? action.slice(0, 130) : `Khi đã hiểu điều mình cần, bạn có thể ${goalCopy[idea.goal]}.`,
      },
    ],
    offerTitle: offeringDetail ? "Điều bạn có thể khám phá" : `Khám phá ${businessLabels[idea.business]} của ${idea.brand}`.slice(0, 80),
    offerCopy: offering.length >= 30 ? offering : `${offering} Hãy xem thông tin chủ trang đã cung cấp trước khi chọn.`.slice(0, 320),
    audienceTitle: `Dành cho ${audience}`.slice(0, 80),
    audienceCopy: (`Dành cho ${audience}. ${action}`.length >= 30 ? `Dành cho ${audience}. ${action}` : `Dành cho ${audience}. Xem nội dung rồi ${goalLabels[idea.goal]} khi bạn đã sẵn sàng.`).slice(0, 320),
    closingLine: `Tìm hiểu ${idea.brand}, rồi ${goalCopy[idea.goal]}.`.slice(0, 160),
    seoTitle: `${idea.brand.slice(0, 38)} | ${businessLabels[idea.business]}`,
    seoDescription: `${idea.brand} dành cho ${audience}: ${summary}`.slice(0, 160),
  };
}

/** Apply the narrow, unambiguous copy edits without asking the content audit to
 * judge an existing sentence as a new business claim. */
export function applySimpleStudioCopyRevision(current: SiteBrief, request: string) {
  const next = { ...current, features: current.features.map((feature) => ({ ...feature })) };
  let changed = false;
  if (/(?:đổi|sửa|viết lại).{0,24}(?:tiêu đề|headline)/i.test(request) && /ngắn hơn|ngắn gọn/i.test(request)) {
    const words = current.headline.trim().split(/\s+/u);
    const shortened = words.length > 5 ? words.slice(0, 5).join(" ") : current.headline;
    if (shortened.length >= 6 && shortened !== current.headline) {
      next.headline = shortened;
      changed = true;
    }
  }
  const cta = request.match(/(?:cta|nút|lời kêu gọi)\s+(?:thành|là)\s+['“]?([^'”\".!?\n]{2,28})['”\"]?/i);
  if (cta) {
    const label = cta[1].trim();
    if (label.length >= 2) {
      next.ctaLabel = label;
      changed = true;
    }
  }
  return changed ? next : null;
}

/** Fast, conservative checks; human review is still required before publishing. */
export function unsupportedStudioClaims(
  idea: SiteIdea,
  brief: SiteBrief,
  customerChangeRequest = "",
) {
  const supplied =
    `${idea.brand} ${idea.idea} ${idea.story ?? ""} ${idea.offerings ?? ""} ${idea.customerAction ?? ""} ${idea.audience} ${customerChangeRequest}`.toLocaleLowerCase(
      "vi",
    );
  const generated = [
    brief.headline,
    brief.subheadline,
    brief.aboutTitle,
    brief.aboutCopy,
    brief.seoTitle,
    brief.seoDescription,
    brief.offerTitle ?? "",
    brief.offerCopy ?? "",
    brief.audienceTitle ?? "",
    brief.audienceCopy ?? "",
    brief.closingLine ?? "",
    ...brief.features.flatMap((feature) => [feature.title, feature.copy]),
  ]
    .join(" ")
    .toLocaleLowerCase("vi");
  const riskyClaims = [
    "cam kết",
    "đảm bảo",
    "uy tín",
    "chất lượng",
    "giải thưởng",
    "độc bản",
    "bền",
    "nhiều năm",
    "nung ở",
    "vẽ tay",
    "miễn phí",
    "tốt nhất",
    "hàng đầu",
    "cập nhật thường xuyên",
    "được chứng nhận",
    "khách hàng tin tưởng",
    "tin cậy",
    "thu gom",
    "ấm cúng",
    "giữ nhịp sống cân bằng",
    "không bị gián đoạn",
    "ổn định",
    "phù hợp với nhiều lựa chọn",
    "menu đa dạng",
    "trải nghiệm độc đáo",
    "nâng tầm",
    "đẳng cấp",
  ];
  return riskyClaims.filter(
    (claim) => generated.includes(claim) && !supplied.includes(claim),
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function headlineWords(value: string) {
  return value.trim().split(/\s+/u).map((word) =>
    `<span class="hero-word-wrap"><span class="hero-word" aria-hidden="true">${escapeHtml(word)}</span></span>`,
  ).join(" ");
}

function sectionWords(value: string) {
  return `<span class="section-words" aria-hidden="true">${value.trim().split(/\s+/u).map((word) => `<span class="section-word-wrap"><span class="section-word">${escapeHtml(word)}</span></span>`).join(" ")}</span>`;
}

function contrastInk(color: string) {
  const rgb = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return luminance > 0.18 ? "#102831" : "#fffaf1";
}

export function buildPreviewHtml(
  idea: SiteIdea,
  brief: SiteBrief,
  assetBase = "/vendor",
) {
  const content = { ...buildFallbackBrief(idea), ...brief };
  const serif = idea.style === "editorial" || idea.style === "warm";
  const background =
    idea.style === "warm"
      ? "#fff7ed"
      : idea.style === "bold"
        ? "#f2f0e8"
        : "#f8faf8";
  const ink = idea.style === "bold" ? "#10130f" : "#102831";
  const escaped = {
    brand: escapeHtml(idea.brand),
    headline: escapeHtml(content.headline),
    headlineWords: headlineWords(content.headline),
    subheadline: escapeHtml(content.subheadline),
    cta: escapeHtml(content.ctaLabel),
    aboutTitle: escapeHtml(content.aboutTitle),
    aboutTitleWords: sectionWords(content.aboutTitle),
    aboutCopy: escapeHtml(content.aboutCopy),
    offerTitle: escapeHtml(content.offerTitle ?? ""),
    offerTitleWords: sectionWords(content.offerTitle ?? ""),
    offerCopy: escapeHtml(content.offerCopy ?? ""),
    audienceTitle: escapeHtml(content.audienceTitle ?? ""),
    audienceTitleWords: sectionWords(content.audienceTitle ?? ""),
    audienceCopy: escapeHtml(content.audienceCopy ?? ""),
    closingLine: escapeHtml(content.closingLine ?? ""),
    closingLineWords: sectionWords(content.closingLine ?? ""),
    ctaWords: sectionWords(content.ctaLabel),
    features: content.features.map((item) => ({
      title: escapeHtml(item.title),
      copy: escapeHtml(item.copy),
    })),
  };
  const accentInk = contrastInk(idea.color);
  const monogram = escapeHtml(
    Array.from(idea.brand.trim())[0]?.toUpperCase() ?? "H",
  );
  const safeAssetBase = escapeHtml(assetBase.replace(/\/$/, ""));
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="${idea.color}">
  <title>${escapeHtml(content.seoTitle)}</title>
  <meta name="description" content="${escapeHtml(content.seoDescription)}">
  <style>
    :root{--accent:${idea.color};--accent-ink:${accentInk};--paper:${background};--ink:${ink};--night:#071c24;--line:#17333a22;--sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--serif:${serif ? "Georgia,serif" : "ui-serif,Georgia,serif"}}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--night);color:var(--ink);font-family:var(--sans);overflow-x:hidden}
    .ambient-stage{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.82}.ambient-stage canvas{width:100%;height:100%;display:block}.reading-progress{position:fixed;z-index:30;top:0;left:0;width:100%;height:3px;background:var(--accent);transform:scaleX(0);transform-origin:left;pointer-events:none}main,footer{position:relative;z-index:1}.section-word-wrap{display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.08em}.section-word{display:inline-block;will-change:transform,opacity}
    a,button,input{font:inherit}
    a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
    .site-header{position:fixed;z-index:20;top:0;left:0;width:100%;height:74px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid #ffffff2b;background:#071c24d9;color:white;backdrop-filter:blur(16px)}
    .brand{display:flex;align-items:center;gap:12px;color:white;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.14em}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:italic 21px/1 var(--serif)}
    nav{display:flex;gap:clamp(12px,2.4vw,34px)}nav a{color:#d6e5e2;text-decoration:none;font-size:12px;font-weight:700}nav a:hover{color:white}
    section{position:relative;scroll-margin-top:74px}
    .hero{min-height:100svh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);align-items:center;gap:clamp(32px,7vw,112px);padding:clamp(128px,15vh,180px) clamp(24px,6vw,92px) 74px;background:linear-gradient(100deg,#071c24f0 4%,#071c245a 100%);color:white;overflow:hidden}
    .hero:before{position:absolute;inset:0;background:radial-gradient(circle at 76% 42%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 38%),linear-gradient(115deg,transparent 40%,#ffffff08);content:""}
    .hero-copy{position:relative;z-index:2;max-width:790px}.eyebrow{display:flex;align-items:center;gap:12px;font-size:10px;font-weight:800;letter-spacing:.2em;color:color-mix(in srgb,var(--accent) 72%,white)}.eyebrow:before{width:34px;height:1px;background:currentColor;content:""}
    h1{max-width:860px;margin:20px 0 24px;font:clamp(52px,7.4vw,116px)/.9 var(--serif);letter-spacing:-.065em;text-wrap:balance}.hero-word-wrap{display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.08em}.hero-word{display:inline-block}.hero-copy>p{max-width:620px;margin:0;color:#bacdca;font-size:clamp(15px,1.5vw,20px);line-height:1.65}
    .cta{display:inline-flex;align-items:center;justify-content:center;min-height:52px;margin-top:32px;padding:14px 23px;border:1px solid #ffffff25;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:800;transition:transform .2s ease,box-shadow .2s ease}.cta:hover{transform:translateY(-3px);box-shadow:0 14px 34px #0005}
    .hero-stage{position:relative;z-index:1;min-height:min(62vw,650px);isolation:isolate;display:grid;place-items:center}.visual-orbit{width:min(38vw,520px);aspect-ratio:1;border:1px solid #ffffff7a;border-radius:50%;box-shadow:0 0 0 38px #ffffff09,0 0 0 100px #ffffff06;transform:rotate(-16deg)}.visual-orbit:before,.visual-orbit:after{content:"";position:absolute;inset:14%;border:1px solid #ffffff4a;border-radius:50%;transform:scaleX(.62) rotate(25deg)}.visual-orbit:after{inset:29%;transform:scaleY(.54) rotate(-20deg)}.stage-initial{position:absolute;font:italic clamp(160px,30vw,460px)/1 var(--serif);color:#ffffff20;user-select:none}.stage-label{position:absolute;z-index:2;right:0;bottom:8%;display:flex;align-items:flex-end;gap:16px;color:#d8e9e5}.stage-label strong{font:clamp(26px,3vw,44px)/1 var(--serif)}.stage-label span{max-width:105px;font-size:9px;font-weight:800;line-height:1.5;letter-spacing:.14em}
    .scroll-note{position:absolute;z-index:3;bottom:30px;left:clamp(24px,6vw,92px);display:flex;align-items:center;gap:12px;color:#8ea9a5;font-size:10px;font-weight:800;letter-spacing:.14em}.scroll-note:before{width:42px;height:1px;background:#8ea9a5;content:""}
    .manifesto{min-height:82svh;padding:clamp(90px,12vw,180px) clamp(24px,7vw,110px);background:color-mix(in srgb,var(--paper) 84%,transparent)}
    .section-number{font-size:10px;font-weight:800;letter-spacing:.18em;color:var(--accent)}.manifesto h2,.contact h2{max-width:980px;margin:20px 0 28px;font:clamp(43px,6vw,88px)/.96 var(--serif);letter-spacing:-.055em;text-wrap:balance}.manifesto-lead{max-width:720px;margin-left:auto;color:#536970;font-size:clamp(17px,2vw,25px);line-height:1.55}
    .offer{padding:clamp(100px,12vw,170px) clamp(24px,7vw,110px);background:#071c24c7;color:white}.offer-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.55fr);align-items:end;gap:48px}.offer h2,.audience h2{margin:20px 0 0;font:clamp(43px,6vw,88px)/.96 var(--serif);letter-spacing:-.055em;text-wrap:balance}.offer-head p{max-width:490px;margin:0 0 7px;color:#b8ccc8;line-height:1.7;font-size:clamp(16px,1.5vw,20px)}.features{display:grid;grid-template-columns:repeat(3,1fr);margin-top:clamp(70px,10vw,140px);border-top:1px solid #ffffff45}.features article{min-height:270px;padding:30px 28px 34px 0;border-bottom:1px solid #ffffff45}.features article+article{padding-left:28px;border-left:1px solid #ffffff45}.features small{color:var(--accent);font-weight:800;letter-spacing:.14em}.features h3{margin:44px 0 14px;font:clamp(23px,2.6vw,36px)/1.08 var(--serif);letter-spacing:-.035em}.features p{margin:0;color:#bdd0cb;font-size:14px;line-height:1.7}
    .audience{min-height:78svh;display:grid;grid-template-columns:minmax(190px,.5fr) minmax(0,1fr);gap:clamp(32px,8vw,130px);align-items:center;padding:clamp(110px,13vw,190px) clamp(24px,7vw,110px);background:color-mix(in srgb,var(--paper) 84%,transparent)}.audience-index{font:italic clamp(150px,25vw,390px)/.8 var(--serif);color:color-mix(in srgb,var(--accent) 18%,transparent);letter-spacing:-.08em}.audience p{max-width:660px;color:#536970;font-size:clamp(18px,2vw,26px);line-height:1.55}
    .interlude{min-height:70svh;display:grid;place-items:center;padding:90px 24px;background:var(--accent);color:var(--accent-ink);overflow:hidden}.interlude-mark{position:absolute;font:italic clamp(230px,45vw,680px)/1 var(--serif);opacity:.11;transform:translateY(8%)}.interlude blockquote{position:relative;z-index:1;max-width:980px;margin:0;text-align:center;font:clamp(38px,6vw,86px)/1.02 var(--serif);letter-spacing:-.05em}.interlude p{position:absolute;bottom:36px;margin:0;font-size:10px;font-weight:800;letter-spacing:.18em}
    .contact{min-height:84svh;display:grid;grid-template-columns:1fr .8fr;gap:clamp(48px,10vw,150px);align-items:end;padding:clamp(100px,12vw,180px) clamp(24px,7vw,110px);background:linear-gradient(100deg,#071c24ed,#071c24bc);color:white}.contact h2{margin-bottom:0}.contact-copy{padding-bottom:8px}.contact-copy p{max-width:500px;color:#a9bfbb;line-height:1.7}.contact-card{border-top:1px solid #ffffff30;padding-top:24px}.contact-card strong{display:block;font:clamp(28px,3vw,44px)/1.1 var(--serif)}.contact-card span{display:block;margin-top:14px;color:#a9bfbb;font-size:13px;line-height:1.65}.contact-card .cta{width:100%;margin-top:28px}
    footer{display:flex;justify-content:space-between;gap:20px;padding:25px clamp(24px,7vw,110px);border-top:1px solid #ffffff1a;background:var(--night);color:#7f9995;font-size:10px;letter-spacing:.1em}
    @media(max-width:760px){.site-header{height:62px;padding-inline:17px}nav{gap:11px}nav a{font-size:10px}.site-header nav a:nth-child(1),.site-header nav a:nth-child(3){display:none}.brand{font-size:11px}.brand-mark{width:30px;height:30px}.ambient-stage{opacity:.55}.hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:98px 22px 42px}.hero-copy{width:100%}h1{font-size:clamp(46px,13vw,72px);margin-block:17px}.hero-copy>p{font-size:14px}.cta{min-height:48px;margin-top:22px}.hero-stage{width:100%;min-height:250px}.visual-orbit{width:220px}.stage-initial{font-size:190px}.stage-label{right:8px;bottom:6%}.scroll-note{display:none}.manifesto,.offer,.audience{padding:84px 22px}.manifesto h2,.offer h2,.audience h2,.contact h2{font-size:43px}.manifesto-lead{font-size:17px}.offer-head,.audience{display:block}.offer-head p{margin-top:28px}.features{display:block;margin-top:60px}.features article{min-height:0;padding:26px 0}.features article+article{padding-left:0;border-left:0}.features h3{margin-top:22px}.audience-index{font-size:145px;margin-bottom:20px}.interlude{min-height:62svh}.contact{display:block;padding:90px 22px}.contact-card{margin-top:65px}footer{flex-direction:column;padding:24px 22px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.cta{transition:none}}
  </style>
</head>
<body>
  <div class="ambient-stage" aria-hidden="true"><canvas id="studio-webgl"></canvas></div>
  <div class="reading-progress" aria-hidden="true"></div>
  <header class="site-header">
    <a class="brand" href="#trang-chu"><span class="brand-mark">${monogram}</span>${escaped.brand}</a>
    <nav aria-label="Điều hướng chính"><a href="#gioi-thieu">Câu chuyện</a><a href="#trai-nghiem">Khám phá</a><a href="#cho-ban">Dành cho bạn</a><a href="#lien-he">Tiếp theo</a></nav>
  </header>
  <main>
    <section class="hero" id="trang-chu">
      <div class="hero-copy" data-reveal>
        <div class="eyebrow">${escapeHtml(businessLabels[idea.business].toUpperCase())} · ${escapeHtml(goalLabels[idea.goal].toUpperCase())}</div>
        <h1 aria-label="${escaped.headline}">${escaped.headlineWords}</h1>
        <p>${escaped.subheadline}</p>
        <a class="cta" href="#gioi-thieu">${escaped.cta} <span aria-hidden="true">&nbsp;↘</span></a>
      </div>
      <div class="hero-stage" aria-hidden="true"><div class="visual-orbit"></div><span class="stage-initial">${monogram}</span><div class="stage-label"><strong>${escaped.brand}</strong><span>MỘT CÂU CHUYỆN ĐANG MỞ</span></div></div>
      <div class="scroll-note">CUỘN ĐỂ KHÁM PHÁ</div>
    </section>
    <section class="manifesto" id="gioi-thieu">
      <div class="section-number">01 · CÂU CHUYỆN</div>
      <h2 data-reveal-words aria-label="${escaped.aboutTitle}">${escaped.aboutTitleWords}</h2>
      <p class="manifesto-lead" data-reveal>${escaped.aboutCopy}</p>
    </section>
    <section class="offer" id="trai-nghiem"><div class="section-number">02 · KHÁM PHÁ</div><div class="offer-head"><h2 data-reveal-words aria-label="${escaped.offerTitle}">${escaped.offerTitleWords}</h2><p data-reveal>${escaped.offerCopy}</p></div><div class="features" id="diem-noi-bat">${escaped.features.map((item, index) => `<article data-reveal><small>0${index + 1}</small><h3>${item.title}</h3><p>${item.copy}</p></article>`).join("")}</div></section>
    <section class="audience" id="cho-ban"><div class="audience-index" aria-hidden="true">03</div><div><div class="section-number">03 · DÀNH CHO BẠN</div><h2 data-reveal-words aria-label="${escaped.audienceTitle}">${escaped.audienceTitleWords}</h2><p data-reveal>${escaped.audienceCopy}</p><a class="cta" href="#lien-he">${escaped.cta} <span aria-hidden="true">&nbsp;↘</span></a></div></section>
    <section class="interlude"><div class="interlude-mark" aria-hidden="true">${monogram}</div><blockquote data-reveal-words aria-label="${escaped.closingLine}">“${escaped.closingLineWords}”</blockquote><p>TỪ CÂU CHUYỆN ĐẾN LỰA CHỌN</p></section>
    <section class="contact" id="lien-he">
      <div><div class="section-number">04 · BƯỚC TIẾP THEO</div><h2 data-reveal-words aria-label="${escaped.cta}">${escaped.ctaWords}</h2></div>
      <div class="contact-copy" data-reveal><p>${escaped.closingLine}</p><div class="contact-card"><strong>${escaped.brand}</strong><span>Thông tin liên hệ, sản phẩm và cách đặt hàng cần được chủ trang xác nhận trước khi xuất bản.</span><a class="cta" href="#trai-nghiem">Xem lại nội dung <span aria-hidden="true">&nbsp;↗</span></a></div></div>
    </section>
  </main>
  <footer><span>${escaped.brand.toUpperCase()}</span><span>BẢN XEM TRƯỚC · NỘI DUNG CẦN XÁC NHẬN TRƯỚC KHI XUẤT BẢN</span></footer>
  <script src="${safeAssetBase}/gsap.min.js"></script>
  <script src="${safeAssetBase}/ScrollTrigger.min.js"></script>
  <script>
    (() => {
      window.__siteMotion = { progress: 0, chapter: 0 };
      document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
          const target = document.getElementById(link.getAttribute('href').slice(1));
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        });
      });
      if (!window.gsap || !window.ScrollTrigger) return;
      const gsap = window.gsap;
      gsap.registerPlugin(window.ScrollTrigger);
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.hero-word', { yPercent: 105, opacity: 0, duration: .95, stagger: .055, ease: 'power3.out' });
        gsap.from('.hero-copy > p, .hero-copy > .cta', { y: 24, opacity: 0, duration: .7, stagger: .13, delay: .22, ease: 'power2.out' });
        gsap.utils.toArray('[data-reveal-words]').forEach(element => {
          gsap.from(element.querySelectorAll('.section-word'), {
            yPercent: 105, opacity: 0, duration: .78, stagger: .045, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true }
          });
        });
        gsap.utils.toArray('[data-reveal]').forEach((element, index) => {
          if (element.closest('.hero') || element.closest('.features')) return;
          gsap.from(element, {
            y: index % 2 ? 32 : 22, opacity: 0, duration: .75, ease: 'power2.out',
            scrollTrigger: { trigger: element, start: 'top 88%', once: true }
          });
        });
        gsap.from('.features article', {
          y: 24, opacity: 0, duration: .6, stagger: .1, ease: 'power2.out',
          scrollTrigger: { trigger: '.features', start: 'top 82%', once: true }
        });
        gsap.utils.toArray('.section-number').forEach(element => {
          gsap.from(element, {
            x: -18, opacity: 0, duration: .6, ease: 'power2.out',
            scrollTrigger: { trigger: element, start: 'top 92%', once: true }
          });
        });
        gsap.to('.reading-progress', {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true }
        });
        gsap.to('.visual-orbit', {
          rotation: 85, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .7 }
        });
        gsap.to('.interlude-mark', {
          yPercent: -19, rotation: 8, ease: 'none',
          scrollTrigger: { trigger: '.interlude', start: 'top bottom', end: 'bottom top', scrub: .7 }
        });
        gsap.utils.toArray('main > section').forEach((section, chapter) => {
          window.ScrollTrigger.create({
            trigger: section, start: 'top 52%', end: 'bottom 52%',
            onEnter: () => { window.__siteMotion.chapter = chapter; },
            onEnterBack: () => { window.__siteMotion.chapter = chapter; }
          });
        });
        window.ScrollTrigger.create({
          trigger: 'main', start: 'top top', end: 'bottom bottom',
          onUpdate: self => { window.__siteMotion.progress = self.progress; }
        });
      });
      addEventListener('pagehide', () => media.revert(), { once: true });
    })();
  </script>
  <script type="module">
    import { animate } from '${safeAssetBase}/anime.esm.min.js';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.cta').forEach(link => {
        const icon = link.querySelector('span[aria-hidden]');
        if (!icon) return;
        const nudge = () => animate(icon, { x: [0, 6, 0], duration: 420, ease: 'out(3)' });
        link.addEventListener('pointerenter', nudge);
        link.addEventListener('focus', nudge);
      });
    }
  </script>
  <script type="module">
    import * as THREE from '${safeAssetBase}/three.module.js';
    const canvas = document.querySelector('#studio-webgl');
    const host = canvas?.parentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (canvas && host) {
      try {
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: innerWidth > 760, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.2 : 1.65));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
        const group = new THREE.Group();
        scene.add(group);
        const kind = '${idea.business}';
        const shape = kind === 'food' ? new THREE.TorusGeometry(1.48, .45, 22, 84) :
          kind === 'education' ? new THREE.OctahedronGeometry(1.85, 1) :
          kind === 'portfolio' ? new THREE.IcosahedronGeometry(1.75, 1) :
          kind === 'retail' ? new THREE.TorusKnotGeometry(1.18, .34, 110, 16, 2, 5) :
          new THREE.SphereGeometry(1.64, 36, 22);
        const material = new THREE.MeshStandardMaterial({ color: '${idea.color}', metalness: .38, roughness: .32, transparent: true, opacity: .84 });
        const core = new THREE.Mesh(shape, material);
        group.add(core);
        const satelliteGeometry = new THREE.OctahedronGeometry(.95, 0);
        const satelliteMaterial = new THREE.MeshStandardMaterial({ color: '${idea.color}', metalness: .58, roughness: .23, transparent: true, opacity: .68 });
        const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
        satellite.position.set(-2.35, 1.35, -.8);
        group.add(satellite);
        const pebbleGeometry = new THREE.IcosahedronGeometry(.42, 1);
        const pebbleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .56 });
        const pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
        pebble.position.set(2.5, -1.3, .2);
        group.add(pebble);
        const wireGeometry = new THREE.IcosahedronGeometry(2.33, 1);
        const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .17 });
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        group.add(wire);
        const ringGeometry = new THREE.TorusGeometry(2.62, .013, 6, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .38 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = 1.2;
        group.add(ring);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x19333c, 2.3));
        const light = new THREE.PointLight('${idea.color}', 22, 13);
        light.position.set(3, 2, 4);
        scene.add(light);
        const resize = () => {
          const width = host.clientWidth, height = host.clientHeight;
          if (!width || !height) return;
          camera.aspect = width / height;
          camera.position.z = width < 760 ? 7.7 : 6.2;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          renderer.render(scene, camera);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        let pointerX = 0, frame = 0;
        const pointer = event => { pointerX = (event.clientX / innerWidth - .5) * .35; };
        if (innerWidth > 760 && !reduced) addEventListener('pointermove', pointer, { passive: true });
        let chapter = 0, lastFrame = 0;
        const tick = time => {
          frame = requestAnimationFrame(tick);
          if (time - lastFrame < 32) return;
          lastFrame = time;
          const progress = window.__siteMotion?.progress || 0;
          chapter += ((window.__siteMotion?.chapter || 0) - chapter) * .055;
          const drift = time * .00016;
          group.rotation.y = progress * 4.8 + drift + pointerX;
          group.rotation.x = .14 + Math.sin(progress * Math.PI * 3) * .2 + chapter * .1;
          group.position.x = (innerWidth < 760 ? 1.1 : 2.2) + Math.sin(chapter * 1.22) * (innerWidth < 760 ? .65 : 1.25);
          group.position.y = Math.cos(chapter * 1.35) * .7;
          camera.position.z = (innerWidth < 760 ? 7.7 : 6.2) - Math.min(chapter, 5) * .12;
          core.scale.setScalar(1 - Math.min(chapter, 4) * .08);
          satellite.position.x = -2.35 + Math.sin(chapter * 1.9) * .85;
          satellite.position.y = 1.35 - Math.cos(chapter * 1.5) * .7;
          satellite.rotation.set(drift + chapter * .8, progress * 5, drift);
          pebble.position.x = 2.5 - Math.cos(chapter * 1.4) * 1.2;
          pebble.position.y = -1.3 + Math.sin(chapter * 1.5) * .9;
          wire.rotation.z = progress * -2.4 - drift;
          ring.rotation.z = progress * 1.8 + drift;
          light.position.x = 3 * Math.cos(chapter * .65);
          light.position.y = 2 + Math.sin(chapter * .8) * 1.8;
          light.intensity = 22 + Math.sin(chapter * 1.2) * 5;
          renderer.render(scene, camera);
        };
        const pause = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
        const visibility = () => { if (document.hidden) pause(); else if (!reduced && !frame) frame = requestAnimationFrame(tick); };
        addEventListener('visibilitychange', visibility);
        resize();
        if (!reduced) frame = requestAnimationFrame(tick);
        addEventListener('pagehide', () => {
          pause(); observer.disconnect(); removeEventListener('visibilitychange', visibility);
          removeEventListener('pointermove', pointer);
          renderer.dispose(); shape.dispose(); wireGeometry.dispose(); ringGeometry.dispose();
          satelliteGeometry.dispose(); pebbleGeometry.dispose();
          material.dispose(); wireMaterial.dispose(); ringMaterial.dispose();
          satelliteMaterial.dispose(); pebbleMaterial.dispose();
        }, { once: true });
      } catch { host.classList.add('no-webgl'); }
    }
  </script>
</body>
</html>`;
}

/** A contained, clickable preview. Exported HTML remains a normal full page. */
export function buildCompactPreviewHtml(idea: SiteIdea, brief: SiteBrief) {
  const source = buildPreviewHtml(idea, brief, "/vendor");
  const compactStyle = `<style>
    .site-header{height:58px;padding-inline:18px}.brand{font-size:10px}.brand-mark{width:28px;height:28px;font-size:17px}nav{gap:11px}nav a{font-size:9px}
    .hero{min-height:100vh;padding:86px 6vw 38px}.manifesto{min-height:100vh}.interlude{min-height:76vh}.contact{min-height:92vh}
    @media(max-width:700px){.hero{padding-top:80px}.hero-stage{min-height:250px}.stage-label strong{font-size:22px}.manifesto h2,.contact h2{font-size:39px}}
  </style>`;
  return source.replace("</head>", `${compactStyle}</head>`);
}
