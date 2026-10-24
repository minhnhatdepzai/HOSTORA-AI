import { auditSeoHtml } from "@/lib/seo";
import { buildSeoAutomationPlan } from "@/lib/seo-automation";
import { sanitizeCitations } from "@/lib/chat-citations";
import { structuredChat } from "@/lib/ollama";
import { retrieve } from "@/lib/rag";
import { validatePublicUrl } from "@/lib/ssrf";
import { z } from "zod";

const aiOutput = z.object({
  executiveSummary: z.string(),
  priorities: z.array(z.string()).min(2).max(6),
  contentIdeas: z.array(z.string()).min(2).max(5),
});
const aiFormat = {
  type: "object",
  properties: {
    executiveSummary: { type: "string" },
    priorities: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    contentIdeas: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
  },
  required: ["executiveSummary", "priorities", "contentIdeas"],
};

async function fetchPublic(url: URL, maxBytes = 1_000_000) {
  let target = url;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "HOSTORA-AI-SEO-Audit/1.0" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location)
        return { ok: false, text: "", url: target, contentType: "" };
      target = await validatePublicUrl(new URL(location, target).toString());
      continue;
    }
    return {
      ok: response.ok,
      text: (await response.text()).slice(0, maxBytes),
      url: target,
      contentType: response.headers.get("content-type") ?? "",
    };
  }
  return { ok: false, text: "", url: target, contentType: "" };
}

export async function POST(request: Request) {
  try {
    const { url: raw, keyword } = z
      .object({
        url: z.string().min(4).max(2048),
        keyword: z.string().trim().max(120).default(""),
      })
      .parse(await request.json());
    const initial = await validatePublicUrl(raw);
    const page = await fetchPublic(initial);
    if (!page.ok || !page.contentType.includes("text/html"))
      return Response.json(
        { error: "URL không trả HTML công khai hợp lệ." },
        { status: 422 },
      );
    const origin = page.url.origin;
    const [robots, sitemap] = await Promise.all([
      validatePublicUrl(`${origin}/robots.txt`)
        .then((url) => fetchPublic(url, 200_000))
        .catch(() => ({ ok: false })),
      validatePublicUrl(`${origin}/sitemap.xml`)
        .then((url) => fetchPublic(url, 200_000))
        .catch(() => ({ ok: false })),
    ]);
    const audit = auditSeoHtml(page.text, page.url, {
      robots: robots.ok,
      sitemap: sitemap.ok,
    });
    const failed = audit.findings.filter(
      (finding) => finding.status !== "pass",
    );
    const automationPlan = buildSeoAutomationPlan(audit.findings, {
      keyword,
      url: page.url,
      title: audit.title,
    });
    const sources = await retrieve(
      `SEO ${keyword} ${failed.map((finding) => finding.label).join(" ")}`,
      5,
    );
    let ai = {
      executiveSummary: `Trang đạt ${audit.score}/100 theo các mục công khai đã kiểm tra; có ${failed.length} mục cần xem xét.`,
      priorities: automationPlan.slice(0, 6).map((task) => task.action),
      contentIdeas: keyword
        ? [
            `Trang trụ cột giải quyết ý định tìm kiếm “${keyword}”`,
            `FAQ trả lời các câu hỏi mua hàng quanh “${keyword}”`,
          ]
        : [
            "Trang trụ cột theo nhu cầu khách hàng",
            "FAQ từ câu hỏi bán hàng thực tế",
          ],
    };
    try {
      const generated = await structuredChat(
        "Bạn là cố vấn giúp chủ kinh doanh cải thiện khả năng được tìm thấy trên Google. Chỉ dùng kết quả kiểm tra và nguồn được cung cấp. Viết tiếng Việt đơn giản, hướng vào lợi ích và hành động; không nhắc tên cơ chế nội bộ, mã lập trình hay thuật ngữ chuyên môn khi có thể nói bằng lời phổ thông. Không hứa hạng 1, không bịa lượng truy cập hay dữ liệu không được cung cấp. Không nêu thương hiệu hoặc công cụ chưa có trong nguồn. Mỗi ưu tiên có dữ kiện phải gắn [K1]...[K5]. Ý tưởng nội dung là bản nháp cần biên tập, không phải dữ kiện.",
        `URL: ${page.url}\nTừ khóa mục tiêu: ${keyword || "chưa nhập"}\nAudit: ${JSON.stringify({ score: audit.score, findings: audit.findings })}\nNguồn:\n${sources.map((source, index) => `[K${index + 1}] ${source.title}: ${source.content}`).join("\n")}`,
        aiOutput,
        aiFormat,
        "seo_audit",
      );
      const allowedCitations = new Set(
        sources.map((_, index) => `[K${index + 1}]`),
      );
      const clean = (value: string) =>
        sanitizeCitations(value, allowedCitations);
      ai = {
        // Nhận định về trạng thái hiện tại chỉ phản ánh kết quả audit code;
        // model được dùng cho ý tưởng sáng tạo, không được viết lại sự thật quét được.
        executiveSummary: `Trang đạt ${audit.score}/100 theo các mục công khai đã kiểm tra; có ${failed.length} mục cần xem xét.`,
        // Thứ tự sửa lỗi do audit code quyết định, không giao cho model.
        priorities: automationPlan.slice(0, 6).map((task) => task.action),
        contentIdeas: generated.contentIdeas.map(clean),
      };
    } catch {}
    return Response.json({
      url: page.url.toString(),
      keyword: keyword || null,
      ...audit,
      ai,
      automationPlan,
      sources: sources.map(({ id, title, sourceUrl, verifiedAt }, index) => ({
        citation: `K${index + 1}`,
        id,
        title,
        sourceUrl,
        verifiedAt,
      })),
      limits: [
        "Kết quả này không đo vị trí thực tế trên Google, liên kết từ website khác hoặc trải nghiệm của khách thật.",
        "Điểm số chỉ phản ánh các mục nhìn thấy tại thời điểm kiểm tra, không dự báo lượng khách truy cập.",
      ],
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Không thể audit URL.",
      },
      { status: 400 },
    );
  }
}
