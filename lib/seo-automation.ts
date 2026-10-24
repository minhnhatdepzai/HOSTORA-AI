import type { SeoFinding } from "@/lib/seo";

export type SeoAutomationTask = {
  id: string;
  priority: "P0" | "P1" | "P2";
  mode: "draft" | "verify";
  title: string;
  action: string;
  acceptance: string;
  evidence: string;
  draft: string | null;
};

const priority = (
  impact: SeoFinding["impact"],
): SeoAutomationTask["priority"] =>
  impact === "high" ? "P0" : impact === "medium" ? "P1" : "P2";

const verifyOnly = new Set(["https", "indexable", "robots", "sitemap"]);

function draftFor(
  finding: SeoFinding,
  input: { keyword: string; url: URL; title: string | null },
) {
  const topic = input.keyword || input.title || input.url.hostname;
  if (finding.id === "title")
    return `${topic} | Thông tin và giải pháp phù hợp`;
  if (finding.id === "description")
    return `Tìm hiểu ${topic}, tiêu chí lựa chọn và các bước bắt đầu phù hợp với nhu cầu thực tế.`;
  if (finding.id === "canonical") return input.url.toString();
  if (finding.id === "language") return '<html lang="vi">';
  if (finding.id === "viewport")
    return '<meta name="viewport" content="width=device-width, initial-scale=1">';
  if (finding.id === "open-graph")
    return `<meta property="og:title" content="${topic}">`;
  return null;
}

function instruction(finding: SeoFinding) {
  const actions: Record<string, [string, string]> = {
    title: [
      "Thêm title riêng, mô tả đúng nội dung trang.",
      "HTML trả về có đúng một title không rỗng và đã được người phụ trách duyệt.",
    ],
    description: [
      "Thêm meta description riêng; coi bản nháp là gợi ý cần biên tập.",
      "HTML trả về có meta description đúng với nội dung thật của trang.",
    ],
    headings: [
      "Sắp xếp lại heading để có một H1 chính.",
      "HTML trả về có đúng một H1 và thứ bậc heading đọc được.",
    ],
    language: [
      "Khai báo ngôn ngữ tài liệu trên thẻ html.",
      "Thuộc tính lang khớp ngôn ngữ nội dung chính.",
    ],
    viewport: [
      "Thêm mobile viewport và kiểm tra lại trên màn hình hẹp.",
      "Trang có viewport và không tràn ngang ở kích thước mobile.",
    ],
    https: [
      "Bật HTTPS bằng quy trình của nhà cung cấp hạ tầng.",
      "URL cuối cùng dùng HTTPS và không phát sinh cảnh báo chứng chỉ.",
    ],
    indexable: [
      "Xác minh noindex có chủ đích trước khi thay đổi.",
      "Trạng thái index phù hợp môi trường production hoặc staging.",
    ],
    canonical: [
      "Thêm canonical tự tham chiếu sau khi xác minh URL chuẩn.",
      "Canonical là URL tuyệt đối, trả thành công và đúng phiên bản trang cần index.",
    ],
    robots: [
      "Kiểm tra vị trí robots.txt và quy tắc crawl.",
      "robots.txt truy cập được và không vô tình chặn khu vực cần index.",
    ],
    sitemap: [
      "Xác minh hoặc tạo sitemap chứa các URL chuẩn cần index.",
      "Sitemap truy cập được, hợp lệ và chỉ chứa URL canonical mong muốn.",
    ],
    "structured-data": [
      "Chọn schema đúng với loại nội dung thật rồi tạo bản nháp JSON-LD.",
      "Markup khớp nội dung nhìn thấy; không thêm rating, giá hay tồn kho không có thật.",
    ],
    "open-graph": [
      "Tạo metadata chia sẻ xã hội từ nội dung đã duyệt.",
      "Preview chia sẻ có tiêu đề, mô tả và ảnh đúng nội dung trang.",
    ],
    "image-alt": [
      "Bổ sung alt mô tả mục đích của ảnh; để trống nếu ảnh chỉ trang trí.",
      "Mỗi ảnh nội dung có alt đúng ngữ cảnh, không nhồi từ khóa.",
    ],
    "internal-links": [
      "Thêm liên kết nội bộ hữu ích tới nội dung liên quan.",
      "Liên kết crawlable, anchor rõ nghĩa và URL đích hoạt động.",
    ],
  };
  return (
    actions[finding.id] ?? [
      "Kiểm tra và xử lý phát hiện này trên mã nguồn website.",
      "Chạy lại audit và xác nhận phát hiện đã chuyển sang pass.",
    ]
  );
}

export function buildSeoAutomationPlan(
  findings: SeoFinding[],
  input: { keyword: string; url: URL; title: string | null },
) {
  return findings
    .filter((finding) => finding.status !== "pass")
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 } as const;
      return rank[a.impact] - rank[b.impact];
    })
    .map((finding) => {
      const [action, acceptance] = instruction(finding);
      const draft = draftFor(finding, input);
      return {
        id: finding.id,
        priority: priority(finding.impact),
        mode: verifyOnly.has(finding.id) ? "verify" : "draft",
        title: finding.label,
        action,
        acceptance,
        evidence: finding.detail,
        draft,
      } satisfies SeoAutomationTask;
    });
}
