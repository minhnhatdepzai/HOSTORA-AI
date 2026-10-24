import knowledge from "@/data/knowledge.json";
import { recommendPlans } from "@/lib/recommendation";
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
  if (!/(chọn gói|tư vấn gói|phương án|gợi ý gói|so sánh gói)/i.test(text))
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
  const sources = recommendations.map(({ plan }, index) => ({
    citation: "P" + (index + 1),
    title: plan.provider + " " + plan.name,
    sourceUrl: plan.sourceUrl,
    verifiedAt: plan.verifiedAt,
    kind: "plan",
  }));
  const performance = knowledge.find(
    (item) => item.id === "performance-limits",
  );
  if (performance)
    sources.push({
      citation: "K1",
      title: performance.title,
      sourceUrl: performance.sourceUrl,
      verifiedAt: performance.verifiedAt,
      kind: "knowledge",
    });
  const lines = recommendations.map(({ plan, cautions }, index) => {
    const label = index === 0 ? "Gói chính" : "Thay thế " + index;
    const renewal =
      plan.renewalMonthlyVnd === null
        ? "gia hạn chưa xác minh"
        : "gia hạn " +
          plan.renewalMonthlyVnd.toLocaleString("vi-VN") +
          "đ/tháng";
    const domain = plan.domainIncluded
      ? "có tên miền theo điều kiện gói"
      : "chưa gồm tên miền";
    const caution = cautions.length ? "; lưu ý: " + cautions[0] : "";
    const overBudget =
      plan.promoMonthlyVnd > parsed.data.monthlyBudget
        ? "; giá quy đổi vượt ngân sách tháng đã nhập"
        : "";
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
      caution +
      ". [P" +
      (index + 1) +
      "]"
    );
  });
  return {
    answer:
      "Dựa trên nhu cầu bạn nêu và bảng gói đã xác minh, thứ tự gợi ý của app là:\n" +
      lines.join("\n") +
      "\nĐây là xếp hạng theo nhu cầu, không phải cam kết chịu tải. Lượt truy cập tháng chưa đủ để khẳng định website sẽ hoạt động tốt trong đợt bán cao điểm; hãy chạy thử quy trình mua hàng với nhiều người dùng trước khi mua. [K1] Giá, thuế, điều kiện tên miền và tình trạng đăng ký cần kiểm tra lại trên trang thanh toán.",
    sources,
  };
}

export function needsRecommendationRequirements(question: string) {
  return /(chọn gói|gói nào|tư vấn gói|gợi ý gói)/i.test(question);
}
