import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = join(root, "output");

function newestResult() {
  return readdirSync(outputRoot, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("judge-mobile-"),
    )
    .map((entry) => join(outputRoot, entry.name, "result.json"))
    .filter(existsSync)
    .sort()
    .at(-1);
}

const resultPath = resolve(process.argv[2] || newestResult() || "");
if (!resultPath || !existsSync(resultPath)) {
  throw new Error("Không tìm thấy result.json của bộ kiểm thử mobile.");
}

const result = JSON.parse(readFileSync(resultPath, "utf8"));
const destination = join(root, "docs/submission/HOSTORA_MOBILE_9_CASES.html");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageData(path) {
  const absolute = resolve(dirname(resultPath), path);
  if (!existsSync(absolute)) return "";
  const extension = absolute.endsWith(".jpg") ? "jpeg" : "png";
  return `data:image/${extension};base64,${readFileSync(absolute).toString("base64")}`;
}

const labels = {
  normal: "Bình thường",
  invalid: "Không hợp lệ",
  edge: "Biên / sự cố",
};
const passed = result.cases.filter((item) => item.status === "passed").length;
const partial = result.cases.filter((item) => item.status === "partial").length;
const failed = result.cases.filter((item) => item.status === "failed").length;
const images = (result.images ?? [])
  .map((item) => ({ ...item, data: imageData(item.path) }))
  .filter((item) => item.data);
const isEmulator =
  /sdk_gphone|emulator|virtual/i.test(result.device?.model ?? "") ||
  /^emu/i.test(result.device?.serialMasked ?? "");
const androidEvidenceLabel = isEmulator
  ? "BẰNG CHỨNG MÁY ẢO ANDROID"
  : "BẰNG CHỨNG THIẾT BỊ ANDROID";
const screenshotHeading = isEmulator
  ? "Ảnh chụp trực tiếp từ máy ảo Android"
  : "Ảnh chụp trực tiếp từ thiết bị Android";

const caseCards = result.cases
  .map(
    (item) => `
      <article class="case ${escapeHtml(item.status)}">
        <div class="case-top">
          <span class="case-id">${escapeHtml(item.id)}</span>
          <span class="kind">${escapeHtml(labels[item.kind] ?? item.kind)}</span>
          <span class="status">${item.status === "passed" ? "ĐẠT" : item.status === "partial" ? "MỘT PHẦN" : "CHƯA ĐẠT"}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <dl>
          <div><dt>Mong đợi</dt><dd>${escapeHtml(item.expected)}</dd></div>
          <div><dt>Quan sát</dt><dd>${escapeHtml(item.observed)}</dd></div>
          <div><dt>Bằng chứng</dt><dd>${escapeHtml(item.evidence)}</dd></div>
        </dl>
      </article>`,
  )
  .join("");

const gallery = images
  .map(
    (item) => `
      <figure>
        <img src="${item.data}" alt="${escapeHtml(item.label)}" />
        <figcaption>${escapeHtml(item.label)}</figcaption>
      </figure>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HOSTORA — 9 ca kiểm thử Android</title>
  <style>
    :root { --ink:#071827; --green:#087f5b; --mint:#9ff7d2; --paper:#f4f7f5; --line:#d7e1dc; --danger:#b42318; --warn:#a15c00; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--paper); font:15px/1.55 Inter, ui-sans-serif, system-ui, sans-serif; }
    main { width:min(1160px, calc(100% - 32px)); margin:24px auto 64px; }
    .hero { padding:clamp(28px, 6vw, 64px); border-radius:32px; color:white; background:var(--ink); }
    .eyebrow,.kind,.case-id,dt { font-weight:800; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
    .eyebrow { color:var(--mint); }
    h1 { max-width:760px; margin:18px 0 12px; font-size:clamp(36px, 6vw, 72px); line-height:1.02; letter-spacing:-.045em; }
    .hero p { max-width:720px; color:#bcd0c7; }
    .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; margin-top:34px; background:#284239; border:1px solid #284239; }
    .metric { padding:20px; background:#102a25; }
    .metric strong { display:block; font-size:27px; }
    .metric span { color:#a9c1b7; font-size:11px; text-transform:uppercase; }
    section { margin-top:42px; }
    h2 { margin:0 0 18px; font-size:clamp(26px,4vw,42px); letter-spacing:-.03em; }
    .meta { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); border-radius:20px; overflow:hidden; background:white; }
    .meta div { padding:18px; border-right:1px solid var(--line); }
    .meta div:last-child { border:0; }
    .meta b,.meta span { display:block; }
    .meta span { margin-top:5px; color:#66756f; font-size:12px; overflow-wrap:anywhere; }
    .gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:16px; }
    figure { margin:0; padding:10px; background:white; border:1px solid var(--line); border-radius:22px; }
    figure img { display:block; width:100%; aspect-ratio:9/16; object-fit:cover; object-position:top; border-radius:14px; background:#dfe8e3; }
    figcaption { padding:10px 4px 2px; font-weight:700; }
    .cases { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .case { min-height:330px; padding:22px; border:1px solid var(--line); border-radius:22px; background:white; }
    .case.failed { border-color:#efb4af; }
    .case.partial { border-color:#edcb91; }
    .case-top { display:flex; gap:8px; align-items:center; }
    .case-id { color:var(--green); }
    .kind { color:#71817a; }
    .status { margin-left:auto; padding:5px 8px; border-radius:999px; color:#08704f; background:#e3f8ef; font-size:9px; font-weight:900; letter-spacing:.06em; }
    .failed .status { color:var(--danger); background:#feeceb; }
    .partial .status { color:var(--warn); background:#fff4dd; }
    .case h3 { margin:18px 0; font-size:21px; line-height:1.25; }
    dl,dd { margin:0; }
    dl div { padding:12px 0; border-top:1px solid var(--line); }
    dt { color:#66756f; }
    dd { margin-top:4px; font-size:13px; }
    .note { padding:20px; border-left:4px solid var(--green); background:white; }
    code { padding:2px 5px; border-radius:5px; background:#e8efeb; }
    footer { margin-top:38px; color:#6a7973; font-size:12px; }
    @media (max-width:800px) { .metrics,.meta { grid-template-columns:1fr 1fr; } .cases { grid-template-columns:1fr; } .meta div:nth-child(2) { border-right:0; } }
    @media print { body { background:white; } main { width:100%; margin:0; } .hero { border-radius:0; } .case { break-inside:avoid; } }
  </style>
</head>
<body>
<main>
  <header class="hero">
    <div class="eyebrow">HOSTORA AI · BẢNG A · ${androidEvidenceLabel}</div>
    <h1>9 ca kiểm thử, nhìn là hiểu ngay.</h1>
    <p>Bộ hồ sơ này tách rõ bằng chứng Android, kiểm thử logic và mô phỏng sự cố. Không dùng ảnh mockup thay cho APK thật.</p>
    <div class="metrics">
      <div class="metric"><strong>${passed}/9</strong><span>Ca đạt</span></div>
      <div class="metric"><strong>${partial}</strong><span>Một phần</span></div>
      <div class="metric"><strong>${failed}</strong><span>Chưa đạt</span></div>
      <div class="metric"><strong>05</strong><span>Tính năng demo</span></div>
    </div>
  </header>

  <section>
    <h2>Môi trường kiểm thử</h2>
    <div class="meta">
      <div><b>Thiết bị</b><span>${escapeHtml(result.device?.model)} · Android ${escapeHtml(result.device?.android)}</span></div>
      <div><b>APK</b><span>${escapeHtml(result.app?.versionName)} · versionCode ${escapeHtml(result.app?.versionCode)}</span></div>
      <div><b>Thời điểm</b><span>${escapeHtml(result.finishedAt)}</span></div>
      <div><b>Serial đã rút gọn</b><span>${escapeHtml(result.device?.serialMasked)}</span></div>
    </div>
  </section>

  <section>
    <h2>${screenshotHeading}</h2>
    <div class="gallery">${gallery}</div>
  </section>

  <section>
    <h2>Kết quả từng ca</h2>
    <div class="cases">${caseCards}</div>
  </section>

  <section class="note">
    <b>Cách đọc bằng chứng:</b> “Native” là quan sát trên APK cài ở Android; “unit” là kiểm thử logic tất định; “failure simulation” là chủ động tháo chuyển tiếp ADB rồi kiểm tra thông báo bản lưu. Dữ liệu cá nhân không được dùng trong bộ kiểm thử.
  </section>
  <footer>Nguồn máy: ${escapeHtml(relative(root, resultPath))} · Báo cáo sinh tự động, có thể mở offline trong trình duyệt.</footer>
</main>
</body>
</html>`;

writeFileSync(destination, html);
console.log(destination);
