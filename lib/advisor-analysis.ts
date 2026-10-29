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

const negatedDomain = /(?:không|chưa)\s+(?:cần|muốn)\s+(?:(?:mua|đăng ký)\s+)?(?:(?:kèm|thêm|mới)\s+)?(?:tên miền|domain)|đã có\s+(?:tên miền|domain)/gi;
const requestedDomain = /cần\s+(?:(?:mua|đăng ký)\s+)?(?:(?:kèm|thêm|mới)\s+)?(?:tên miền|domain)/i;

function commerceIntent(text: string) {
  const normalized = text.toLocaleLowerCase("vi");
  const deniedCommerce = /(?:không|chưa)\s+(?:(?:cần|muốn|định)\s+)?(?:bán\s+(?:hàng|sản phẩm|online)|kinh doanh|nhận đơn|mua bán)(?:\s+(?:trên|qua)\s+(?:web|website|trang))?/gi;
  const noSales = normalized.match(deniedCommerce) !== null;
  // Feature names inside a refusal are not evidence that the customer wants that feature.
  const affirmativeText = normalized
    .replace(deniedCommerce, " ")
    .replace(/(?:không|chưa)\s+(?:(?:cần|muốn|dùng|sử dụng)\s+)?(?:giỏ hàng|đặt hàng|nhận đơn|thanh toán(?:\s+online)?)/gi, " ");
  const contentTopic = /(?:blog|bài viết|trang tin)[^.!?;\n]{0,80}(?:viết về|chia sẻ|kinh nghiệm|hướng dẫn|chỉ đăng)|(?:viết về|chia sẻ|kinh nghiệm|hướng dẫn|chỉ đăng)[^.!?;\n]{0,80}(?:blog|bài viết|trang tin)/i.test(normalized);
  const transactionFeature = /(?:bán hàng|bán sản phẩm|kinh doanh|nhận đơn|đặt hàng|thanh toán)\s+(?:trên|qua)\s+(?:web|website|trang)|giỏ hàng|woocommerce|shop online|cửa hàng trực tuyến/i.test(affirmativeText);
  const onlineSale = /bán\s+[^.!?;\n]{0,40}\bonline\b/i.test(affirmativeText);
  const directSales = transactionFeature || (onlineSale && !(contentTopic && noSales));
  const genericSales = /bán hàng|giỏ hàng|đặt hàng|shop|cửa hàng/i.test(affirmativeText);
  return { noSales, directSales, contentTopic, genericSales };
}

export function reconcileAnalysis(text: string, result: z.infer<typeof analysisSchema>) {
  const value = { ...result };
  const { noSales, directSales, contentTopic, genericSales } = commerceIntent(text);
  const company = /giới thiệu|công ty|doanh nghiệp/i.test(text);
  const blog = /blog|bài viết|trang tin/i.test(text);
  if (noSales && !directSales) {
    value.ecommerce = false;
    value.websiteType = company ? "company" : blog ? "blog" : "unknown";
  } else if (directSales || (!contentTopic && genericSales)) {
    value.websiteType = "store";
    value.ecommerce = true;
  } else if (blog && contentTopic) {
    value.websiteType = "blog";
    value.ecommerce = false;
  } else if (value.ecommerce || value.websiteType === "store") {
    value.websiteType = "store";
    value.ecommerce = true;
  }
  const noDomain = text.match(negatedDomain) !== null;
  const yesDomain = requestedDomain.test(text.replace(negatedDomain, " "));
  if (noDomain && yesDomain) value.needsDomain = null;
  else if (noDomain) value.needsDomain = false;
  else if (yesDomain) value.needsDomain = true;
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
