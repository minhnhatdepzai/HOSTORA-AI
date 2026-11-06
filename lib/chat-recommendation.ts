import knowledge from "@/data/knowledge.json";
import { recommendPlans } from "@/lib/recommendation";
import type { ChatFacts } from "@/lib/chat-memory";
import { z } from "zod";

const schema = z.object({
  websiteType: z.enum(["store", "company", "blog"]),
  monthlyVisits: z.number().int().min(1).max(100000000),
  monthlyBudget: z.number().int().min(10000).max(100000000),
  needsDomain: z.boolean(),
  ecommerce: z.boolean(),
});

function amount(raw: string, unit = "") {
  const normalizedUnit = unit.toLocaleLowerCase("vi");
  const value = Number(
    normalizedUnit === "triệu" && /^\d+[.,]\d{1,2}$/.test(raw)
      ? raw.replace(",", ".")
      : raw.replace(/[.,]/g, ""),
  );
  if (!Number.isFinite(value)) return null;
  return Math.round(
    value *
      (normalizedUnit === "k"
        ? 1000
        : normalizedUnit === "triệu"
          ? 1000000
          : 1),
  );
}

export function explicitChatRecommendation(question: string) {
  const text = question.toLocaleLowerCase("vi");
  if (!/(chọn (?:giúp )?(?:đúng )?(?:một |1 )?gói|tư vấn gói|phương án|gợi ý gói|so sánh gói|mua hosting (?:nào|gì)|hosting nào)/i.test(text))
    return null;
  const websiteType = /shop|cửa hàng|woocommerce|bán hàng/i.test(text)
    ? "store"
    : /blog|bài viết/i.test(text)
      ? "blog"
      : /doanh nghiệp|giới thiệu|công ty/i.test(text)
        ? "company"
        : null;
  const visits = text.match(
    /(\d[\d.,]*)\s*(?:lượt|khách|visits?)(?:\s*\/\s*tháng|\s*mỗi tháng)?/i,
  );
  const budget = text.match(/ngân sách.{0,24}?(\d[\d.,]*)\s*(triệu|k|đ|vnd)/i);
  if (!websiteType || !visits || !budget) return null;
  const needsDomain = /cần (?:mua )?(?:tên miền|domain)/i.test(text)
    ? true
    : /đã có (?:tên miền|domain)|không cần (?:tên miền|domain)/i.test(text)
      ? false
      : null;
  if (needsDomain === null) return null;
  const parsed = schema.safeParse({
    websiteType,
    monthlyVisits: amount(visits[1]),
    monthlyBudget: amount(budget[1], budget[2]),
    needsDomain,
    ecommerce: websiteType === "store",
  });
  if (!parsed.success) return null;
  const recommendations = recommendPlans(parsed.data);
  const singlePlan = /(?:đúng|chỉ|duy nhất)\s*(?:một|1)\s*gói|(?:một|1)\s*gói\s*(?:thôi|duy nhất)/i.test(text);
  const shownRecommendations = singlePlan ? recommendations.slice(0, 1) : recommendations;
  const peakMatch = text.match(/(\d[\d.,]*)\s*(?:người|khách)\s*(?:cùng lúc|đồng thời)/i);
  const peakVisitors = peakMatch ? amount(peakMatch[1]) : null;
  const sources = shownRecommendations.map(({ plan }, index) => ({
    citation: "P" + (index + 1),
    title: plan.provider + " " + plan.name,
    sourceUrl: plan.sourceUrl,
    verifiedAt: plan.verifiedAt,
    kind: "plan",
  }));
  const performance = knowledge.find(
    (item) => item.id === "performance-limits",
  );
  const needsPerformanceNote = !singlePlan || websiteType === "store" && /flash sale|cùng lúc|đồng thời|cao điểm/i.test(text);
  if (performance && needsPerformanceNote)
    sources.push({
      citation: "K1",
      title: performance.title,
      sourceUrl: performance.sourceUrl,
      verifiedAt: performance.verifiedAt,
      kind: "knowledge",
    });
  if (singlePlan && shownRecommendations[0]) {
    const { plan, eligibility } = shownRecommendations[0];
    const firstTerm = plan.promoMonthlyVnd * plan.billingMonths;
    const renewal = plan.renewalMonthlyVnd === null
      ? "giá gia hạn chưa xác minh"
      : `gia hạn ${plan.renewalMonthlyVnd.toLocaleString("vi-VN")}đ/tháng`;
    const fit = eligibility === "eligible"
      ? websiteType === "blog" ? "Đây là lựa chọn chi phí thấp cho blog mới." : "Đây là lựa chọn gần nhu cầu bạn đã nêu."
      : "Gói này chỉ để tham khảo vì chưa xác nhận đáp ứng toàn bộ nhu cầu hoặc ngân sách.";
    return {
      answer: `Gói chính: ${plan.provider} ${plan.name}. Kỳ đầu quy đổi ${plan.promoMonthlyVnd.toLocaleString("vi-VN")}đ/tháng nhưng cần trả ${firstTerm.toLocaleString("vi-VN")}đ cho ${plan.billingMonths} tháng; ${renewal}. [P1]\n\n${fit} ${needsDomain ? "Bạn còn cần kiểm tra chi phí tên miền riêng" : "Theo thông tin bạn đưa, không cần mua thêm tên miền"}, đồng thời kiểm tra thuế và điều kiện tại trang thanh toán. Mức trả trước ${firstTerm.toLocaleString("vi-VN")}đ có phù hợp không?` +
        (needsPerformanceNote ? " Nếu có giờ bán cao điểm, hãy thử luồng đặt hàng và thanh toán với tải thật trước khi mua. [K1]" : ""),
      sources,
    };
  }
  const lines = shownRecommendations.map(
    ({ plan, reasons, cautions, eligibility }, index) => {
      const label =
        eligibility !== "eligible"
          ? "Chỉ tham khảo " + (index + 1)
          : index === 0
            ? "Gói chính"
            : "Thay thế " + index;
      const renewal =
        plan.renewalMonthlyVnd === null
          ? "gia hạn chưa xác minh"
          : "gia hạn " +
            plan.renewalMonthlyVnd.toLocaleString("vi-VN") +
            "đ/tháng";
      const domain = plan.domainIncluded
        ? "có tên miền theo điều kiện gói"
        : "chưa gồm tên miền";
      const caution = cautions.find(
        (item) => !/trả trước toàn bộ kỳ ưu đãi|giá ưu đãi yêu cầu trả trước|thử website thật/i.test(item),
      );
      const overBudget =
        plan.promoMonthlyVnd > parsed.data.monthlyBudget
          ? "; giá quy đổi vượt ngân sách tháng đã nhập"
          : "";
      const fit = reasons.find((reason) =>
        /Cửa hàng:|Trang doanh nghiệp:|Blog:|hỗ trợ thương mại điện tử|hỗ trợ vận hành/.test(reason),
      );
      const why = index === 0 && fit ? ` ${fit.replace(/[.!?]+$/, "")}.` : "";
      return (
        label +
        ": " +
        plan.provider +
        " " +
        plan.name +
        " — giá kỳ đầu quy đổi " +
        plan.promoMonthlyVnd.toLocaleString("vi-VN") +
        "đ/tháng cho kỳ " +
        plan.billingMonths +
        " tháng (tiền hosting kỳ đầu " +
        (plan.promoMonthlyVnd * plan.billingMonths).toLocaleString("vi-VN") +
        "đ, chưa gồm thuế và dịch vụ mua thêm); " +
        renewal +
        "; " +
        domain +
        overBudget +
        (caution ? `; lưu ý: ${caution.replace(/[.!?]+$/, "")}` : "") +
        "." + why + " [P" +
        (index + 1) +
        "]"
      );
    },
  );
  return {
    answer:
      (recommendations.some((item) => item.eligibility === "eligible")
        ? singlePlan ? "Với thông tin bạn đưa, mình chọn gói này:\n" : "Với nhu cầu và ngân sách bạn nêu, mình nghiêng về gói đầu tiên. Hai gói sau giúp bạn so sánh thêm:\n"
        : singlePlan ? "Chưa có gói đáp ứng chắc chắn nhu cầu và ngân sách. Đây là lựa chọn gần nhất để bạn kiểm tra, chưa nên chốt mua:\n" : "Chưa có gói đáp ứng ngân sách và nhu cầu đã nhập. Mình vẫn để các phương án gần nhất cho bạn so sánh, nhưng chưa nên chốt mua:\n") +
      lines.join("\n") +
      (needsPerformanceNote ? `\nSố lượt truy cập mỗi tháng chưa cho biết website có chịu được giờ cao điểm hay không. ${peakVisitors ? `Với ${peakVisitors.toLocaleString("vi-VN")} khách cùng lúc bạn dự kiến, ` : "Nếu bạn có đợt bán lớn, "}hãy thử luồng đặt hàng và thanh toán ở mức tải đó trước khi chốt gói. [K1]` : "") +
      `\nGiá, thuế và điều kiện tên miền cần kiểm tra lại trên trang thanh toán.` +
      (!singlePlan && recommendations[0] ? ` Bạn có thể trả trước ${(recommendations[0].plan.promoMonthlyVnd * recommendations[0].plan.billingMonths).toLocaleString("vi-VN")}đ cho kỳ đầu không?` : ""),
    sources,
  };
}

export function needsRecommendationRequirements(question: string) {
  return /(chọn gói|gói nào|tư vấn gói|gợi ý gói|mua hosting (?:nào|gì)|hosting nào)/i.test(question);
}

export function recommendationClarificationAnswer(
  question: string,
  facts: ChatFacts,
) {
  const known = [
    facts.websiteType === null
      ? null
      : `website ${facts.websiteType === "store" ? "bán hàng" : facts.websiteType === "blog" ? "blog" : "giới thiệu"}`,
    facts.monthlyVisits === null
      ? null
      : `${facts.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng`,
    facts.monthlyBudget === null
      ? null
      : `${facts.monthlyBudget.toLocaleString("vi-VN")}đ/tháng`,
    facts.needsDomain === null
      ? null
      : facts.needsDomain
        ? "cần mua tên miền"
        : "đã có hoặc không cần mua tên miền",
  ].filter((item): item is string => item !== null);
  const missing = [
    facts.websiteType === null
      ? "loại website (bán hàng, giới thiệu hay blog)"
      : null,
    facts.monthlyVisits === null ? "lượt truy cập dự kiến mỗi tháng" : null,
    facts.monthlyBudget === null ? "ngân sách hosting mỗi tháng" : null,
    facts.needsDomain === null ? "có cần mua tên miền" : null,
  ].filter((item): item is string => item !== null);
  const folded = question
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const emailCount = folded.match(/(\d{1,4})\s*(?:email|e-mail|hop thu)/i)?.[1];
  const extras = [
    /backup|sao luu/i.test(folded)
      ? /hang ngay|moi ngay|daily/i.test(folded)
        ? "backup hằng ngày"
        : "chính sách backup"
      : null,
    emailCount ? `${emailCount} hộp thư` : null,
  ].filter((item): item is string => item !== null);

  return [
    known.length ? `Mình đã ghi nhận ${known.join(", ")}.` : null,
    `Để xếp hạng một gói chính và hai phương án thay thế mà không đoán, mình còn cần ${missing.join(" và ")}.`,
    extras.length
      ? `Yêu cầu ${extras.join(" và ")} cũng sẽ được đối chiếu theo dữ liệu công bố của từng gói; mục nào chưa có nguồn xác minh sẽ được ghi rõ thay vì tự suy đoán.`
      : null,
    "Bạn chỉ cần bổ sung phần còn thiếu; không cần nhập lại lượt truy cập hoặc ngân sách đã nêu.",
  ]
    .filter((item): item is string => item !== null)
    .join(" ");
}
