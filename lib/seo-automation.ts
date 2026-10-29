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

const verifyOnly = new Set([
  "https",
  "indexable",
  "robots",
  "sitemap",
  "llms-txt",
  "entity-schema",
]);

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
      "Thêm tên riêng, mô tả đúng nội dung của trang.",
      "Tên trang rõ ràng, không bỏ trống và đã được người phụ trách duyệt.",
    ],
    description: [
      "Thêm đoạn mô tả ngắn; coi gợi ý là bản nháp cần biên tập.",
      "Đoạn mô tả đúng với nội dung thật và dễ hiểu với khách hàng.",
    ],
    headings: [
      "Sắp xếp nội dung để có một tiêu đề chính rõ ràng.",
      "Trang có một tiêu đề chính và các tiêu đề phụ theo thứ tự dễ đọc.",
    ],
    language: [
      "Cho trình duyệt biết ngôn ngữ chính của trang.",
      "Ngôn ngữ khai báo khớp với nội dung khách nhìn thấy.",
    ],
    viewport: [
      "Điều chỉnh cách hiển thị và kiểm tra lại trên điện thoại.",
      "Trang dễ đọc, dễ bấm và không bị tràn ngang trên điện thoại.",
    ],
    https: [
      "Bật kết nối an toàn theo hướng dẫn của nhà cung cấp.",
      "Website mở an toàn và trình duyệt không hiển thị cảnh báo.",
    ],
    indexable: [
      "Hỏi người quản lý website xem việc ẩn trang khỏi Google có chủ đích hay không.",
      "Trang cần bán hàng hoặc giới thiệu đã được phép xuất hiện trên Google.",
    ],
    canonical: [
      "Chọn một địa chỉ chính cho trang sau khi kiểm tra các bản trùng lặp.",
      "Địa chỉ chính mở được và đúng là phiên bản muốn khách tìm thấy.",
    ],
    robots: [
      "Kiểm tra hướng dẫn dành cho công cụ tìm kiếm.",
      "Google không bị chặn nhầm khỏi những trang cần xuất hiện.",
    ],
    sitemap: [
      "Tạo danh sách các trang chính muốn Google khám phá.",
      "Danh sách mở được và chỉ chứa những trang thật sự muốn giới thiệu.",
    ],
    "structured-data": [
      "Bổ sung thông tin để Google hiểu đúng loại nội dung của trang.",
      "Thông tin bổ sung khớp nội dung khách nhìn thấy; không thêm đánh giá, giá hay tồn kho không có thật.",
    ],
    "open-graph": [
      "Chuẩn bị tiêu đề, mô tả và ảnh khi chia sẻ lên mạng xã hội.",
      "Bản xem trước khi chia sẻ hiển thị đúng nội dung của trang.",
    ],
    "image-alt": [
      "Bổ sung mô tả ngắn cho những ảnh truyền tải nội dung.",
      "Mỗi ảnh quan trọng có mô tả đúng ngữ cảnh và không lặp từ khóa gượng ép.",
    ],
    "internal-links": [
      "Thêm liên kết tới những nội dung liên quan trong cùng website.",
      "Tên liên kết dễ hiểu và trang được dẫn tới vẫn hoạt động.",
    ],
    "llms-txt": [
      "Tạo tài liệu llms.txt ngắn, chỉ nêu nội dung chính thức, URL nội bộ và quy tắc không đoán dữ kiện.",
      "Tệp llms.txt mở được, cập nhật cùng website và không chứa dữ liệu khách hàng.",
    ],
    "entity-schema": [
      "Bổ sung Organization, WebSite hoặc WebApplication khớp thương hiệu thật.",
      "Tên thương hiệu, URL và tính năng trong dữ liệu cấu trúc khớp nội dung khách nhìn thấy.",
    ],
  };
  return (
    actions[finding.id] ?? [
      "Nhờ người quản lý website kiểm tra và xử lý mục này.",
      "Kiểm tra lại và xác nhận mục này đã đạt.",
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
