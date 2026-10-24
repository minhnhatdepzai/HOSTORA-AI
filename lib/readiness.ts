import { recommendPlans } from "@/lib/recommendation";
import type { Requirements } from "@/lib/types";

export type ProjectStage = "idea" | "content" | "building" | "live";
export type DomainStatus = "need" | "owned" | "connected";

export type ReadinessInput = {
  websiteType: Requirements["websiteType"];
  monthlyVisits: number;
  monthlyBudget: number;
  stage: ProjectStage;
  deadlineWeeks: number;
  domainStatus: DomainStatus;
  contentReady: boolean;
  seoKeywordReady: boolean;
  analyticsReady: boolean;
  backupOwner: boolean;
  paymentReady: boolean;
  teamCanOperate: boolean;
};

export type ReadinessDimension = {
  id: "strategy" | "contentSeo" | "operations" | "infrastructure";
  label: string;
  score: number;
  max: number;
  note: string;
};

const percent = (score: number, max: number) => Math.round((score / max) * 100);

export function assessReadiness(input: ReadinessInput) {
  const requirements: Requirements = {
    websiteType: input.websiteType,
    monthlyVisits: input.monthlyVisits,
    monthlyBudget: input.monthlyBudget,
    needsDomain: input.domainStatus === "need",
    ecommerce: input.websiteType === "store",
  };
  const recommendation = recommendPlans(requirements)[0];
  const renewal = recommendation.plan.renewalMonthlyVnd;

  const strategyScore =
    5 +
    (input.monthlyVisits > 0 ? 4 : 0) +
    (renewal === null ? 3 : renewal <= input.monthlyBudget ? 5 : 1) +
    (input.stage === "live" || input.deadlineWeeks >= 4
      ? 6
      : input.deadlineWeeks >= 2
        ? 4
        : 2);
  const contentSeoScore =
    (input.contentReady ? 10 : 0) +
    (input.seoKeywordReady ? 8 : 0) +
    (input.analyticsReady ? 7 : 0);
  const operationsScore =
    (input.backupOwner ? 8 : 0) +
    (input.teamCanOperate ? 8 : 0) +
    (input.websiteType !== "store" || input.paymentReady ? 9 : 0);
  const infrastructureScore = Math.min(
    30,
    Math.round(recommendation.total * 0.15) +
      Math.round(recommendation.breakdown.resilience * 0.08) +
      (input.domainStatus === "connected"
        ? 4
        : input.domainStatus === "owned"
          ? 3
          : 1) +
      (renewal === null ? 1 : 3),
  );

  const dimensions: ReadinessDimension[] = [
    {
      id: "strategy",
      label: "Chiến lược",
      score: strategyScore,
      max: 20,
      note:
        renewal === null
          ? "Chưa đủ giá gia hạn để chốt ngân sách dài hạn."
          : renewal <= input.monthlyBudget
            ? "Ngân sách tháng bao phủ giá gia hạn đã xác minh của gói đầu."
            : "Giá gia hạn của gói đầu vượt ngân sách tháng đã nhập.",
    },
    {
      id: "contentSeo",
      label: "Nội dung & SEO",
      score: contentSeoScore,
      max: 25,
      note: `${[input.contentReady, input.seoKeywordReady, input.analyticsReady].filter(Boolean).length}/3 nền tảng nội dung đã sẵn sàng.`,
    },
    {
      id: "operations",
      label: "Vận hành",
      score: operationsScore,
      max: 25,
      note:
        input.websiteType === "store"
          ? "Shop cần người chịu trách nhiệm backup, vận hành và thanh toán."
          : "Cần người chịu trách nhiệm backup và vận hành sau khi bàn giao.",
    },
    {
      id: "infrastructure",
      label: "Hạ tầng",
      score: infrastructureScore,
      max: 30,
      note: `${recommendation.plan.provider} ${recommendation.plan.name} đang khớp ${recommendation.total}/100 theo nhu cầu đã nhập.`,
    },
  ];
  const score = dimensions.reduce(
    (total, dimension) => total + dimension.score,
    0,
  );
  const blockers: string[] = [];
  if (!input.contentReady)
    blockers.push("Nội dung/sản phẩm chưa sẵn sàng để đưa lên website.");
  if (!input.seoKeywordReady)
    blockers.push("Chưa xác định nhóm từ khóa và ý định tìm kiếm chính.");
  if (!input.analyticsReady)
    blockers.push("Chưa có kế hoạch đo chuyển đổi và lỗi sau khi launch.");
  if (!input.backupOwner)
    blockers.push(
      "Chưa giao người chịu trách nhiệm backup và kiểm tra restore.",
    );
  if (!input.teamCanOperate)
    blockers.push("Chưa có người vận hành cập nhật, bảo mật và xử lý sự cố.");
  if (input.websiteType === "store" && !input.paymentReady)
    blockers.push(
      "Luồng thanh toán/đơn hàng chưa được chuẩn bị và thử nghiệm.",
    );
  if (input.domainStatus === "need")
    blockers.push("Tên miền chưa được sở hữu hoặc kết nối.");
  if (input.deadlineWeeks < 2 && input.stage !== "live")
    blockers.push(
      "Thời hạn dưới 2 tuần tạo rủi ro bỏ qua kiểm thử và bàn giao.",
    );
  if (renewal === null)
    blockers.push("Giá gia hạn của gói đầu chưa được xác minh.");
  else if (renewal > input.monthlyBudget)
    blockers.push("Giá gia hạn của gói đầu vượt ngân sách tháng.");

  // Điểm cao không được che lấp một điều kiện launch còn thiếu. Nhãn "ready"
  // là hard gate: vừa đủ điểm, vừa không còn blocker đã biết.
  const band =
    score >= 80 && blockers.length === 0
      ? {
          id: "ready" as const,
          label: "Sẵn sàng triển khai",
          copy: "Có thể lập kế hoạch launch và kiểm tra tải theo kịch bản thật.",
        }
      : score >= 60
        ? {
            id: "needs-work" as const,
            label: "Gần sẵn sàng",
            copy: "Cần xử lý các điểm nghẽn ưu tiên trước ngày mở website.",
          }
        : {
            id: "at-risk" as const,
            label: "Rủi ro khi launch",
            copy: "Nên hoàn thiện nền tảng nội dung và vận hành trước khi mua dài hạn.",
          };

  const actionPlan: string[] = [];
  if (!input.contentReady)
    actionPlan.push(
      "Hôm nay: chốt danh sách nội dung hoặc sản phẩm tối thiểu cần có khi mở website.",
    );
  if (!input.seoKeywordReady)
    actionPlan.push(
      "Hôm nay: chọn một nhóm từ khóa chính và ghi rõ nhu cầu tìm kiếm cần giải quyết.",
    );
  if (!input.analyticsReady)
    actionPlan.push(
      "Trong 7 ngày: lập bảng sự kiện cần đo, người kiểm tra và ngưỡng cảnh báo sau launch.",
    );
  if (!input.backupOwner)
    actionPlan.push(
      "Trong 7 ngày: giao một người chịu trách nhiệm backup và diễn tập restore.",
    );
  if (!input.teamCanOperate)
    actionPlan.push(
      "Trước launch: phân công người cập nhật nội dung, bảo mật và tiếp nhận sự cố.",
    );
  if (input.websiteType === "store" && !input.paymentReady)
    actionPlan.push(
      "Trước launch: thử trọn luồng đặt hàng, thanh toán thất bại và xác nhận đơn trên mobile.",
    );
  if (input.domainStatus === "need")
    actionPlan.push(
      "Hôm nay: chọn và đăng ký tên miền; chỉ chốt sau khi kiểm tra availability thực tế.",
    );
  if (input.deadlineWeeks < 2 && input.stage !== "live")
    actionPlan.push(
      "Hôm nay: thu hẹp phạm vi launch để vẫn còn thời gian kiểm thử và bàn giao.",
    );
  if (renewal === null)
    actionPlan.push(
      "Trước khi mua: xác minh giá gia hạn và điều kiện thanh toán tại nguồn chính thức.",
    );
  else if (renewal > input.monthlyBudget)
    actionPlan.push(
      "Trước khi mua: điều chỉnh gói hoặc ngân sách để chi phí gia hạn không vượt mức đã nhập.",
    );
  if (actionPlan.length < 3)
    actionPlan.push(
      "Trước launch: chạy smoke test trên mobile cho luồng chính và lưu bằng chứng lỗi đã xử lý.",
    );
  if (actionPlan.length < 3)
    actionPlan.push(
      "Sau launch: theo dõi lỗi, chuyển đổi và mức sử dụng thực tế trước khi nâng cấp hạ tầng.",
    );

  const strengths = [...dimensions]
    .sort((a, b) => b.score / b.max - a.score / a.max)
    .slice(0, 2)
    .map((item) => `${item.label} đạt ${item.score}/${item.max}. ${item.note}`);

  const judgeQuestions = [
    !input.analyticsReady
      ? "Bạn sẽ dùng sự kiện nào để phát hiện luồng chính bị lỗi sau khi launch?"
      : "Bạn đã kiểm chứng sự kiện đo chuyển đổi bằng một giao dịch thử như thế nào?",
    !input.backupOwner
      ? "Ai sẽ chịu trách nhiệm backup, restore và thời hạn xử lý khi có sự cố?"
      : "Bằng chứng nào cho thấy bản backup gần nhất thực sự restore được?",
    renewal === null
      ? "Dữ liệu giá nào còn chưa xác minh tại nguồn chính thức trước khi ra quyết định?"
      : "Khi traffic tăng, tín hiệu đo được nào sẽ kích hoạt quyết định nâng cấp gói?",
  ];

  return {
    score,
    scoreMax: 100 as const,
    band,
    dimensions: dimensions.map((dimension) => ({
      ...dimension,
      percent: percent(dimension.score, dimension.max),
    })),
    blockers,
    strengths,
    actionPlan: actionPlan.slice(0, 5),
    judgeQuestions,
    recommendation: {
      planId: recommendation.plan.id,
      provider: recommendation.plan.provider,
      name: recommendation.plan.name,
      fitScore: recommendation.total,
      promoMonthlyVnd: recommendation.plan.promoMonthlyVnd,
      renewalMonthlyVnd: renewal,
      billingMonths: recommendation.plan.billingMonths,
      sourceUrl: recommendation.plan.sourceUrl,
      verifiedAt: recommendation.plan.verifiedAt,
      cautions: recommendation.cautions.slice(0, 3),
    },
    calculatedBy: "deterministic-launch-readiness-v1" as const,
  };
}
