import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, expect, test } from "vitest";
import { POST } from "@/app/api/ai/chat/route";
import { getCustomerStore } from "@/lib/customer/store";
import { getPaymentStore } from "@/lib/payments/store";
import { buildFallbackBrief, type SiteIdea } from "@/lib/site-studio";
import { saveStudioProject } from "@/lib/site-studio-store";
import {
  asksAboutOwnProfile,
  asksForProfileBasedAdvice,
  customerAdviceContext,
} from "@/lib/customer-purchase-chat";

const testDirectory = mkdtempSync(path.join(tmpdir(), "hostora-chat-purchases-"));
process.env.HOSTORA_PAYMENTS_DB_PATH = path.join(testDirectory, "payments.sqlite");
process.env.HOSTORA_STUDIO_STORAGE_ROOT = path.join(testDirectory, "studio");
afterAll(() => rmSync(testDirectory, { recursive: true, force: true }));

const chat = (question: string, token?: string, consultation?: object) =>
  POST(new Request("http://127.0.0.1:3000/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      conversationId: crypto.randomUUID(),
      messages: [{ role: "user", content: question }],
      ...(consultation ? { consultation } : {}),
    }),
  }));

test("chat reads only the signed-in customer's paid and pending hosting orders", async () => {
  const suffix = crypto.randomUUID();
  const store = getCustomerStore();
  const owner = store.createCustomer({
    name: "Khách thử nghiệm",
    email: `order-owner-${suffix}@example.com`,
    passwordHash: "test-hash",
  });
  const other = store.createCustomer({
    name: "Khách khác",
    email: `order-other-${suffix}@example.com`,
    passwordHash: "test-hash",
  });
  const ownerToken = store.createSession(owner.id).token;
  const otherToken = store.createSession(other.id).token;
  const payments = getPaymentStore();
  const bought = payments.createInvoice({
    title: "Hosting Gói A thử nghiệm",
    amountVnd: 600_000,
    customerEmail: owner.email,
  });
  payments.markPaid(bought.id, "stripe", `pi_${suffix}`, 600_000, "vnd");
  payments.createInvoice({
    title: "Hosting Gói B đang chờ",
    amountVnd: 900_000,
    customerEmail: owner.email,
  });
  payments.createSaleRequest({
    productId: "hosting-shop-test",
    provider: "HOSTORA",
    productName: "Hosting Shop thử nghiệm",
    contact: owner.email,
    profile: {
      customerName: "Khách thử nghiệm",
      phone: "0900000000",
      companyName: "Mộc Shop",
      businessType: "Bán mỹ phẩm",
      currentWebsite: "https://moc-shop-private.example",
      mainOffer: "Mỹ phẩm thiên nhiên",
      serviceArea: "Việt Nam",
      seoGoals: "mỹ phẩm sạch",
      websiteStatus: "idea",
      websiteGoal: "Bán mỹ phẩm và nhận đơn hàng trực tuyến",
      targetCustomers: "Khách muốn mua mỹ phẩm thiên nhiên",
      estimatedTraffic: "1k_10k",
      budgetRange: "under_500k",
    },
    consultationPreference: "ai",
    consultationChannel: "email",
  });
  const idea: SiteIdea = {
    brand: "Mộc Shop",
    idea: "Website bán mỹ phẩm thiên nhiên cho người mới bắt đầu.",
    business: "retail",
    goal: "sell",
    audience: "người muốn mua mỹ phẩm thiên nhiên",
    style: "warm",
    monthlyVisits: 5000,
    monthlyBudget: 300000,
    needsDomain: true,
    color: "#123456",
  };
  const ownProjectId = crypto.randomUUID();
  await saveStudioProject({
    id: ownProjectId,
    ownerCustomerId: owner.id,
    idea,
    brief: buildFallbackBrief(idea),
    generationMode: "template-fallback",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await saveStudioProject({
    id: crypto.randomUUID(),
    ownerCustomerId: other.id,
    idea: { ...idea, brand: "Website riêng của người khác" },
    brief: buildFallbackBrief({ ...idea, brand: "Website riêng của người khác" }),
    generationMode: "template-fallback",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const response = await chat("Tôi đã mua hosting gì?", ownerToken);
  const answer = await response.text();
  expect(response.status).toBe(200);
  expect(answer).toContain("Hosting Gói A thử nghiệm: đã thanh toán");
  expect(answer).toContain("Hosting Gói B đang chờ: chờ thanh toán");
  expect(response.headers.get("x-hostora-support-status")).toBe("active");
  expect(answer).toContain("Hosting Shop thử nghiệm: đã gửi yêu cầu mua");

  const websiteAnswer = await (await chat("Tôi đã tạo web nào?", ownerToken)).text();
  expect(websiteAnswer).toContain("Mộc Shop");
  expect(websiteAnswer).toContain(`/website-studio/p/${ownProjectId}`);
  expect(websiteAnswer).not.toContain("Website riêng của người khác");

  const profileAnswer = await (await chat("Tôi đã điền thông tin gì trong hồ sơ?", ownerToken)).text();
  expect(profileAnswer).toContain("Mỹ phẩm thiên nhiên");
  expect(profileAnswer).not.toContain("0900000000");

  const activityResponse = await chat("Tôi đang kinh doanh gì?", ownerToken);
  const activityAnswer = await activityResponse.text();
  expect(activityResponse.headers.get("x-hostora-support-status")).toBe("active");
  expect(activityAnswer).toContain("Bán mỹ phẩm");
  expect(activityAnswer).toContain("Mỹ phẩm thiên nhiên");

  expect(asksAboutOwnProfile(
    "Dựa trên thông tin tôi đã điền, hãy tư vấn 3 việc ưu tiên tiếp theo.",
  )).toBe(false);
  expect(asksForProfileBasedAdvice(
    "Dựa trên thông tin tôi đã điền, hãy tư vấn 3 việc ưu tiên tiếp theo.",
  )).toBe(true);
  expect(asksForProfileBasedAdvice("Tư vấn cho tôi")).toBe(true);
  expect(asksForProfileBasedAdvice("Tu van giup minh voi")).toBe(true);
  expect(asksForProfileBasedAdvice("Tôi cần bán hàng tốt hơn. Tư vấn giúp tôi.")).toBe(true);
  expect(asksForProfileBasedAdvice("Tư vấn cho tôi về CDN")).toBe(false);

  const personalizedResponse = await chat(
    "Dựa trên thông tin tôi đã điền và chọn, hãy tư vấn 3 việc ưu tiên tiếp theo.",
    ownerToken,
  );
  const personalizedAnswer = await personalizedResponse.text();
  expect(personalizedResponse.headers.get("x-hostora-support-status")).toBe("active");
  expect(personalizedAnswer).toContain("1. Ưu tiên luồng tạo khách");
  expect(personalizedAnswer).toContain("2. Ưu tiên nội dung");
  expect(personalizedAnswer).toContain("3. Ưu tiên hạ tầng");
  expect(personalizedAnswer).toContain("Mỹ phẩm thiên nhiên");
  expect(personalizedAnswer).toContain("Khách muốn mua mỹ phẩm thiên nhiên");
  expect(personalizedAnswer).toContain("chưa phải gói đã mua");
  expect(personalizedAnswer).not.toContain("0900000000");

  const shortAdviceResponse = await chat("Tư vấn cho tôi", ownerToken);
  const shortAdviceAnswer = await shortAdviceResponse.text();
  expect(shortAdviceResponse.headers.get("x-hostora-support-status")).toBe("active");
  expect(shortAdviceAnswer).toContain("Mỹ phẩm thiên nhiên");
  expect(shortAdviceAnswer).toContain("Khách muốn mua mỹ phẩm thiên nhiên");
  expect(shortAdviceAnswer).toContain("1. Ưu tiên luồng tạo khách");
  expect(shortAdviceAnswer).toContain("5.000 lượt/tháng");
  expect(shortAdviceAnswer).toContain("300.000đ/tháng");
  expect(shortAdviceAnswer).not.toContain("cho mình biết");
  expect(shortAdviceAnswer).not.toContain("1k_10k");
  expect(shortAdviceAnswer).not.toContain("under_500k");
  expect(shortAdviceAnswer).not.toContain("0900000000");

  const twoSentenceAdvice = await (
    await chat("Tôi cần bán hàng tốt hơn. Tư vấn giúp tôi.", ownerToken)
  ).text();
  expect(twoSentenceAdvice).toContain("Mỹ phẩm thiên nhiên");
  expect(twoSentenceAdvice).toContain("Ưu tiên luồng tạo khách");
  expect(twoSentenceAdvice).not.toContain("cho mình biết");

  const consultationAnswer = await (await chat("Tôi đã điền nhu cầu gì?", ownerToken, {
    websiteType: "store",
    monthlyVisits: 7000,
    monthlyBudget: 400000,
    needsDomain: false,
    ecommerce: true,
  })).text();
  expect(consultationAnswer).toContain("7.000 lượt/tháng");
  expect(consultationAnswer).toContain("400.000đ/tháng");

  const staleConsultation = {
    websiteType: "store",
    monthlyVisits: 5000,
    monthlyBudget: 300000,
    needsDomain: true,
    ecommerce: true,
  };
  await chat(
    "Cập nhật ngân sách của tôi thành 500.000đ mỗi tháng.",
    ownerToken,
    staleConsultation,
  );
  const correctedAdvice = await (
    await chat("Tư vấn cho tôi", ownerToken, staleConsultation)
  ).text();
  expect(correctedAdvice).toContain("500.000đ/tháng");
  expect(correctedAdvice).not.toContain("dưới 500.000đ/tháng");
  expect(correctedAdvice).not.toContain("300.000đ/tháng");

  const modelContext = JSON.stringify(customerAdviceContext(
    store.listOrders(owner.email),
    store.listPurchaseRequests(owner.email),
    [],
  ));
  expect(modelContext).not.toContain("0900000000");
  expect(modelContext).not.toContain("Mộc Shop");
  expect(modelContext).not.toContain("moc-shop-private.example");
  expect(modelContext).toContain("Bán mỹ phẩm");
  expect(modelContext).toContain("Mỹ phẩm thiên nhiên");
  expect(modelContext).toContain("Việt Nam");
  expect(modelContext).toContain("Bán mỹ phẩm và nhận đơn hàng trực tuyến");
  expect(modelContext).toContain("Khách muốn mua mỹ phẩm thiên nhiên");
  expect(modelContext).toContain("mỹ phẩm sạch");

  const adviceAnswer = await (await chat("Tư vấn gói nào cho website của tôi?", ownerToken)).text();
  expect(adviceAnswer).toMatch(/Gói chính|gói đầu tiên/i);
  expect(adviceAnswer).not.toContain("cho mình biết: website");

  const otherAnswer = await (await chat("Gói hosting của tôi là gì?", otherToken)).text();
  expect(otherAnswer).not.toContain("Hosting Gói A thử nghiệm");
  expect(otherAnswer).not.toContain("Hosting Shop thử nghiệm");
  expect(otherAnswer).toContain("chưa thấy gói hosting");
  const otherWebsite = await (await chat("Tôi đã tạo web nào?", otherToken)).text();
  expect(otherWebsite).toContain("Website riêng của người khác");
  expect(otherWebsite).not.toContain(`/website-studio/p/${ownProjectId}`);

  const guestAnswer = await (await chat("Tôi đã mua hosting gì?")).text();
  expect(guestAnswer).toContain("hãy đăng nhập");
  expect(guestAnswer).not.toContain("Hosting Gói A thử nghiệm");
});
