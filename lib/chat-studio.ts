import { recommendedPlansForIdea } from "@/lib/site-studio";
import type { StoredStudioProject } from "@/lib/site-studio-store";

const studioProjectPath = /(?:^|\s|https?:\/\/[^\s]+?)\/website-studio\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=$|[\s/?#.,)])/i;

export function studioProjectIdFromMessage(message: string) {
  return message.match(studioProjectPath)?.[1] ?? null;
}

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ/tháng`;

export function buildStudioProjectAdvice(project: StoredStudioProject) {
  const recommendations = recommendedPlansForIdea(project.idea);
  const sources = recommendations.map(({ plan }, index) => ({
    citation: `P${index + 1}`,
    title: `${plan.provider} ${plan.name}`,
    sourceUrl: plan.sourceUrl,
    verifiedAt: plan.verifiedAt,
    kind: "plan",
  }));
  const [primary, ...alternatives] = recommendations;
  const primaryRenewal = primary.plan.renewalMonthlyVnd === null
    ? "Giá gia hạn chưa được xác minh."
    : `Giá gia hạn đã ghi nhận: ${money(primary.plan.renewalMonthlyVnd)}.`;
  const alternativeLines = alternatives.map(({ plan }, index) =>
    `- Lựa chọn thay thế ${index + 1}: ${plan.provider} ${plan.name}, giá kỳ đầu quy đổi ${money(plan.promoMonthlyVnd)} [P${index + 2}].`,
  );

  return {
    answer: [
      `Mình đã nhận website **${project.idea.brand}**. Bản này hướng tới ${project.idea.audience}, mục tiêu chính là ${project.idea.goal === "sell" ? "bán hàng" : project.idea.goal === "book" ? "nhận lịch hẹn" : project.idea.goal === "showcase" ? "giới thiệu sản phẩm" : "nhận liên hệ tư vấn"}, với khoảng ${project.idea.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng và ngân sách ${project.idea.monthlyBudget.toLocaleString("vi-VN")}đ/tháng.`,
      `**Gói phù hợp nhất:** ${primary.plan.provider} ${primary.plan.name}, giá kỳ đầu quy đổi ${money(primary.plan.promoMonthlyVnd)} [P1]. ${primaryRenewal}`,
      ...alternativeLines,
      `Bước tiếp theo: hãy cho mình biết bạn muốn giữ lượng khách dự kiến này hay chuẩn bị cho chiến dịch tăng trưởng; HOSTORA sẽ chốt cấu hình và xác minh giá ngay trước khi tạo hóa đơn.`,
    ].join("\n\n"),
    sources,
  };
}
