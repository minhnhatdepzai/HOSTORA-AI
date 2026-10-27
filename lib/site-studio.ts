import { z } from "zod";
import { recommendPlans } from "@/lib/recommendation";
import type { Requirements } from "@/lib/types";

export const siteIdeaSchema = z
  .object({
    brand: z.string().trim().min(2).max(60),
    idea: z.string().trim().min(12).max(500),
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

export function buildFallbackBrief(idea: SiteIdea): SiteBrief {
  const summary = idea.idea.trim().slice(0, 150).trimEnd();
  return {
    headline: `${idea.brand} — xem trước website`,
    subheadline: `Bản demo dựa trên ý tưởng của bạn: ${summary}${idea.idea.trim().length > 150 ? "…" : ""}`,
    ctaLabel:
      idea.goal === "sell"
        ? "Xem sản phẩm"
        : idea.goal === "book"
          ? "Đặt lịch ngay"
          : idea.goal === "showcase"
            ? "Khám phá ngay"
            : "Nhận tư vấn",
    aboutTitle: `Về ${idea.brand}`,
    aboutCopy: `Đây là bản demo website của ${idea.brand}. Hãy kiểm tra và bổ sung thông tin sản phẩm, liên hệ trước khi xuất bản.`,
    features: [
      {
        title: "Dễ hiểu",
        copy: "Thông tin quan trọng xuất hiện sớm, không buộc khách phải đoán bước tiếp theo.",
      },
      {
        title: "Có thể điều chỉnh",
        copy: "Bạn có thể sửa nội dung và màu sắc trước khi dùng website này.",
      },
      {
        title: "Sẵn sàng phát triển",
        copy: "Bố cục có chỗ để bổ sung thông tin khi bạn đã xác nhận nội dung.",
      },
    ],
    seoTitle: `${idea.brand.slice(0, 38)} | Xem trước website`,
    seoDescription: `Bản demo website của ${idea.brand} dựa trên ý tưởng do khách hàng cung cấp.`,
  };
}

/** Fast, conservative checks; human review is still required before publishing. */
export function unsupportedStudioClaims(
  idea: SiteIdea,
  brief: SiteBrief,
  customerChangeRequest = "",
) {
  const supplied =
    `${idea.brand} ${idea.idea} ${idea.audience} ${customerChangeRequest}`.toLocaleLowerCase(
      "vi",
    );
  const generated = [
    brief.headline,
    brief.subheadline,
    brief.aboutTitle,
    brief.aboutCopy,
    brief.seoTitle,
    brief.seoDescription,
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
    headline: escapeHtml(brief.headline),
    subheadline: escapeHtml(brief.subheadline),
    cta: escapeHtml(brief.ctaLabel),
    aboutTitle: escapeHtml(brief.aboutTitle),
    aboutCopy: escapeHtml(brief.aboutCopy),
    features: brief.features.map((item) => ({
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
  <title>${escapeHtml(brief.seoTitle)}</title>
  <meta name="description" content="${escapeHtml(brief.seoDescription)}">
  <style>
    :root{--accent:${idea.color};--accent-ink:${accentInk};--paper:${background};--ink:${ink};--night:#071c24;--line:#17333a22;--serif:${serif ? "Georgia,serif" : "Arial,sans-serif"}}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,sans-serif;overflow-x:hidden}
    a,button,input{font:inherit}
    a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
    .site-header{position:fixed;z-index:20;top:0;left:0;width:100%;height:74px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid #ffffff2b;background:#071c24d9;color:white;backdrop-filter:blur(16px)}
    .brand{display:flex;align-items:center;gap:12px;color:white;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.14em}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:italic 21px/1 var(--serif)}
    nav{display:flex;gap:clamp(12px,2.4vw,34px)}nav a{color:#d6e5e2;text-decoration:none;font-size:12px;font-weight:700}nav a:hover{color:white}
    section{position:relative}
    .hero{min-height:100svh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);align-items:center;gap:clamp(32px,7vw,112px);padding:clamp(128px,15vh,180px) clamp(24px,6vw,92px) 74px;background:var(--night);color:white;overflow:hidden}
    .hero:before{position:absolute;inset:0;background:radial-gradient(circle at 76% 42%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 38%),linear-gradient(115deg,transparent 40%,#ffffff08);content:""}
    .hero-copy{position:relative;z-index:2;max-width:790px}.eyebrow{display:flex;align-items:center;gap:12px;font-size:10px;font-weight:800;letter-spacing:.2em;color:color-mix(in srgb,var(--accent) 72%,white)}.eyebrow:before{width:34px;height:1px;background:currentColor;content:""}
    h1{max-width:860px;margin:20px 0 24px;font:clamp(52px,7.4vw,116px)/.9 var(--serif);letter-spacing:-.065em;text-wrap:balance}.hero-copy>p{max-width:620px;margin:0;color:#bacdca;font-size:clamp(15px,1.5vw,20px);line-height:1.65}
    .cta{display:inline-flex;align-items:center;justify-content:center;min-height:52px;margin-top:32px;padding:14px 23px;border:1px solid #ffffff25;background:var(--accent);color:var(--accent-ink);text-decoration:none;font-weight:800;transition:transform .2s ease,box-shadow .2s ease}.cta:hover{transform:translateY(-3px);box-shadow:0 14px 34px #0005}
    .hero-stage{position:relative;z-index:1;min-height:min(62vw,650px);isolation:isolate}.hero-stage canvas{position:absolute;inset:0;width:100%;height:100%}.stage-label{position:absolute;z-index:2;right:0;bottom:8%;display:flex;align-items:flex-end;gap:16px;color:#d8e9e5}.stage-label strong{font:clamp(26px,3vw,44px)/1 var(--serif)}.stage-label span{max-width:105px;font-size:9px;font-weight:800;line-height:1.5;letter-spacing:.14em}
    .scroll-note{position:absolute;z-index:3;bottom:30px;left:clamp(24px,6vw,92px);display:flex;align-items:center;gap:12px;color:#8ea9a5;font-size:10px;font-weight:800;letter-spacing:.14em}.scroll-note:before{width:42px;height:1px;background:#8ea9a5;content:""}
    .manifesto{min-height:90svh;padding:clamp(90px,12vw,180px) clamp(24px,7vw,110px);background:var(--paper)}
    .section-number{font-size:10px;font-weight:800;letter-spacing:.18em;color:var(--accent)}.manifesto h2,.contact h2{max-width:980px;margin:20px 0 28px;font:clamp(43px,6vw,88px)/.96 var(--serif);letter-spacing:-.055em;text-wrap:balance}.manifesto-lead{max-width:720px;margin-left:auto;color:#536970;font-size:clamp(17px,2vw,25px);line-height:1.55}
    .features{display:grid;grid-template-columns:repeat(3,1fr);margin-top:clamp(70px,10vw,140px);border-top:1px solid var(--line)}.features article{min-height:250px;padding:30px 28px 34px 0;border-bottom:1px solid var(--line)}.features article+article{padding-left:28px;border-left:1px solid var(--line)}.features small{color:var(--accent);font-weight:800;letter-spacing:.14em}.features h3{margin:44px 0 14px;font:clamp(23px,2.6vw,36px)/1.08 var(--serif);letter-spacing:-.035em}.features p{margin:0;color:#61757a;font-size:14px;line-height:1.7}
    .interlude{min-height:70svh;display:grid;place-items:center;padding:90px 24px;background:var(--accent);color:var(--accent-ink);overflow:hidden}.interlude-mark{position:absolute;font:italic clamp(230px,45vw,680px)/1 var(--serif);opacity:.11;transform:translateY(8%)}.interlude blockquote{position:relative;z-index:1;max-width:980px;margin:0;text-align:center;font:clamp(38px,6vw,86px)/1.02 var(--serif);letter-spacing:-.05em}.interlude p{position:absolute;bottom:36px;margin:0;font-size:10px;font-weight:800;letter-spacing:.18em}
    .contact{min-height:84svh;display:grid;grid-template-columns:1fr .8fr;gap:clamp(48px,10vw,150px);align-items:end;padding:clamp(100px,12vw,180px) clamp(24px,7vw,110px);background:var(--night);color:white}.contact h2{margin-bottom:0}.contact-copy{padding-bottom:8px}.contact-copy p{max-width:500px;color:#a9bfbb;line-height:1.7}.contact-card{border-top:1px solid #ffffff30;padding-top:24px}.contact-card strong{display:block;font:clamp(28px,3vw,44px)/1.1 var(--serif)}.contact-card span{display:block;margin-top:14px;color:#a9bfbb;font-size:13px;line-height:1.65}.contact-card .cta{width:100%;margin-top:28px}
    footer{display:flex;justify-content:space-between;gap:20px;padding:25px clamp(24px,7vw,110px);border-top:1px solid #ffffff1a;background:var(--night);color:#7f9995;font-size:10px;letter-spacing:.1em}
    @media(max-width:760px){.site-header{height:62px;padding-inline:17px}.brand{font-size:11px}.brand-mark{width:30px;height:30px}nav{gap:11px}nav a{font-size:9px}.hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:98px 22px 42px}.hero-copy{width:100%}h1{font-size:clamp(48px,14vw,72px);margin-block:17px}.hero-copy>p{font-size:14px}.cta{min-height:48px;margin-top:22px}.hero-stage{width:100%;min-height:280px}.stage-label{right:8px;bottom:6%}.scroll-note{display:none}.manifesto{padding:84px 22px}.manifesto h2,.contact h2{font-size:43px}.manifesto-lead{font-size:17px}.features{display:block;margin-top:60px}.features article{min-height:0;padding:26px 0}.features article+article{padding-left:0;border-left:0}.features h3{margin-top:22px}.interlude{min-height:62svh}.contact{display:block;padding:90px 22px}.contact-card{margin-top:65px}footer{flex-direction:column;padding:24px 22px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.cta{transition:none}}
  </style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#trang-chu"><span class="brand-mark">${monogram}</span>${escaped.brand}</a>
    <nav aria-label="Điều hướng chính"><a href="#gioi-thieu">Giới thiệu</a><a href="#diem-noi-bat">Điểm nổi bật</a><a href="#lien-he">Liên hệ</a></nav>
  </header>
  <main>
    <section class="hero" id="trang-chu">
      <div class="hero-copy" data-reveal>
        <div class="eyebrow">${escapeHtml(businessLabels[idea.business].toUpperCase())} · ${escapeHtml(goalLabels[idea.goal].toUpperCase())}</div>
        <h1>${escaped.headline}</h1>
        <p>${escaped.subheadline}</p>
        <a class="cta" href="#gioi-thieu">${escaped.cta} <span aria-hidden="true">&nbsp;↘</span></a>
      </div>
      <div class="hero-stage" aria-label="Chuyển động 3D trang trí"><canvas id="studio-webgl" aria-hidden="true"></canvas><div class="stage-label"><strong>${escaped.brand}</strong><span>CHUYỂN ĐỘNG THEO BẠN</span></div></div>
      <div class="scroll-note">CUỘN ĐỂ KHÁM PHÁ</div>
    </section>
    <section class="manifesto" id="gioi-thieu">
      <div class="section-number">01 · CÂU CHUYỆN</div>
      <h2 data-reveal>${escaped.aboutTitle}</h2>
      <p class="manifesto-lead" data-reveal>${escaped.aboutCopy}</p>
      <div class="features" id="diem-noi-bat">${escaped.features.map((item, index) => `<article data-reveal><small>0${index + 1}</small><h3>${item.title}</h3><p>${item.copy}</p></article>`).join("")}</div>
    </section>
    <section class="interlude"><div class="interlude-mark" aria-hidden="true">${monogram}</div><blockquote data-reveal>“${escaped.headline}”</blockquote><p>TỪ Ý TƯỞNG ĐẾN TRẢI NGHIỆM</p></section>
    <section class="contact" id="lien-he">
      <div><div class="section-number">02 · BƯỚC TIẾP THEO</div><h2 data-reveal>${escaped.cta}</h2></div>
      <div class="contact-copy" data-reveal><p>Đây là bản xem trước của ${escaped.brand}. Khi xuất bản, hãy bổ sung thông tin liên hệ và quy trình phục vụ chính thức của bạn.</p><div class="contact-card"><strong>Sẵn sàng hoàn thiện?</strong><span>Kiểm tra nội dung, thay thông tin liên hệ và đưa website lên tên miền riêng.</span><a class="cta" href="#trang-chu">Quay lại đầu trang</a></div></div>
    </section>
  </main>
  <footer><span>${escaped.brand.toUpperCase()}</span><span>WEBSITE PREVIEW · HOSTORA STUDIO</span></footer>
  <script src="${safeAssetBase}/gsap.min.js"></script>
  <script src="${safeAssetBase}/ScrollTrigger.min.js"></script>
  <script>
    (()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{const target=document.querySelector(link.getAttribute('href'));if(!target)return;event.preventDefault();setTimeout(()=>window.scrollTo({top:Math.max(0,target.offsetTop-58),behavior:'auto'}),0)}));if(reduced||!window.gsap)return;window.gsap.registerPlugin(window.ScrollTrigger);window.gsap.from('.hero-copy>*',{opacity:0,y:34,duration:.9,stagger:.09,ease:'power3.out'});window.gsap.utils.toArray('[data-reveal]').forEach(element=>{if(element.closest('.hero'))return;window.gsap.from(element,{scrollTrigger:{trigger:element,start:'top 86%',once:true},opacity:0,y:54,duration:.85,ease:'power3.out'})});window.gsap.to('.interlude-mark',{scrollTrigger:{trigger:'.interlude',start:'top bottom',end:'bottom top',scrub:true},yPercent:-20,rotation:8})})();
  </script>
  <script type="module">
    import * as THREE from '${safeAssetBase}/three.module.js';
    const canvas=document.querySelector('#studio-webgl');const host=canvas?.parentElement;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(canvas&&host){try{const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,0,6);const group=new THREE.Group();scene.add(group);const material=new THREE.MeshPhysicalMaterial({color:'${idea.color}',roughness:.2,metalness:.34,transmission:.08,clearcoat:1,clearcoatRoughness:.18});const core=new THREE.Mesh(new THREE.TorusKnotGeometry(1.25,.42,180,32,2,3),material);group.add(core);const wireMaterial=new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.16});const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(2.05,2),wireMaterial);group.add(wire);const ringMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55});const ring=new THREE.Mesh(new THREE.TorusGeometry(2.45,.018,10,180),ringMaterial);ring.rotation.x=1.12;group.add(ring);scene.add(new THREE.HemisphereLight(0xffffff,0x21454d,2.8));const point=new THREE.PointLight('${idea.color}',34,12);point.position.set(2.5,2.2,3);scene.add(point);const rim=new THREE.PointLight(0xb5efd2,16,10);rim.position.set(-2.4,-1.4,2);scene.add(rim);let pointerX=0,pointerY=0,frame=0,visible=true;const resize=()=>{const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;camera.aspect=width/height;camera.position.z=width<500?7.2:6;camera.updateProjectionMatrix();renderer.setSize(width,height,false);renderer.render(scene,camera)};new ResizeObserver(resize).observe(host);addEventListener('pointermove',event=>{pointerX=(event.clientX/innerWidth-.5)*.45;pointerY=(event.clientY/innerHeight-.5)*.3},{passive:true});new IntersectionObserver(([entry])=>{visible=entry.isIntersecting},{threshold:.05}).observe(host);const animate=time=>{frame=requestAnimationFrame(animate);if(!visible||document.hidden||reduced)return;const t=time*.00022;group.rotation.y=t+pointerX;group.rotation.x=Math.sin(t*.7)*.14+pointerY;wire.rotation.y=-t*.64;ring.rotation.z=t*.38;renderer.render(scene,camera)};resize();if(reduced)renderer.render(scene,camera);else frame=requestAnimationFrame(animate);addEventListener('pagehide',()=>{cancelAnimationFrame(frame);renderer.dispose();core.geometry.dispose();wire.geometry.dispose();ring.geometry.dispose();material.dispose();wireMaterial.dispose();ringMaterial.dispose()},{once:true})}catch{host.classList.add('no-webgl')}}
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
