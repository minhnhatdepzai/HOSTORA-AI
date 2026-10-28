import { z } from "zod";

export const analysisSchema = z.object({
  websiteType: z.enum(["store", "company", "blog", "unknown"]),
  monthlyVisits: z.number().nonnegative().nullable(),
  monthlyBudget: z.number().nonnegative().nullable(),
  needsDomain: z.boolean().nullable(),
  ecommerce: z.boolean(),
  known: z.array(z.string().max(240)).max(8),
  missing: z.array(z.string().max(240)).max(8),
  followUpQuestion: z.string().max(500),
});

export function reconcileAnalysis(text: string, result: z.infer<typeof analysisSchema>) {
  const value = { ...result };
  const noSales = /(?:không|chưa)\s+(?:cần\s+)?(?:bán\s+hàng|bán\s+online|thanh toán|nhận đơn|giỏ hàng)/i.test(text);
  const sales = /bán\s+[^.!?\n]{0,60}\bonline\b|bán hàng|giỏ hàng|đặt hàng|woocommerce/i.test(text);
  const company = /giới thiệu|công ty|doanh nghiệp/i.test(text);
  const blog = /blog|bài viết|trang tin/i.test(text);
  if (noSales) {
    value.ecommerce = false;
    value.websiteType = company ? "company" : blog ? "blog" : "unknown";
  } else if (sales || value.ecommerce || value.websiteType === "store") {
    value.websiteType = "store";
    value.ecommerce = true;
  }
  if (/không cần (?:mua )?(?:tên miền|domain)|đã có (?:tên miền|domain)/i.test(text)) value.needsDomain = false;
  else if (/cần (?:mua )?(?:kèm )?(?:tên miền|domain)/i.test(text)) value.needsDomain = true;
  else value.needsDomain = null;

  // Explicit uncertainty has priority over model guesses or subsequent instructions.
  // Commas separate facts; conjunctions may list multiple unknown fields.
  const uncertain = text.match(/(?:chưa biết|chưa quyết định|chưa có số liệu|chưa xác định|không rõ)[^,.!?\n]*/gi) ?? [];
  for (const clause of uncertain) {
    if (/ngân sách|chi phí|số tiền/i.test(clause)) value.monthlyBudget = null;
    if (/lượt|lượng khách|truy cập/i.test(clause)) value.monthlyVisits = null;
    if (/tên miền|domain/i.test(clause)) value.needsDomain = null;
    if (/loại (?:trang|web)/i.test(clause)) { value.websiteType = "unknown"; value.ecommerce = false; }
  }

  if (value.monthlyVisits !== null && (!Number.isInteger(value.monthlyVisits) || value.monthlyVisits < 1 || value.monthlyVisits > 100000000)) value.monthlyVisits = null;
  if (value.monthlyBudget !== null && (!Number.isInteger(value.monthlyBudget) || value.monthlyBudget < 10000 || value.monthlyBudget > 100000000)) value.monthlyBudget = null;
  const fields = [
    [value.websiteType === "unknown", "Loại website", "Bạn muốn làm website bán hàng, giới thiệu hay blog?"],
    [value.monthlyVisits === null, "Lượt truy cập mỗi tháng", "Bạn dự kiến có khoảng bao nhiêu lượt truy cập mỗi tháng?"],
    [value.monthlyBudget === null, "Ngân sách mỗi tháng", "Bạn dự định dành bao nhiêu đồng mỗi tháng cho hosting?"],
    [value.needsDomain === null, "Nhu cầu tên miền", "Bạn đã có tên miền hay cần mua tên miền mới?"],
  ] as const;
  value.missing = fields.filter(([missing]) => missing).map(([, label]) => label);
  value.known = fields.filter(([missing]) => !missing).map(([, label]) => label);
  value.followUpQuestion = fields.find(([missing]) => missing)?.[2] ?? "";
  return value;
}
