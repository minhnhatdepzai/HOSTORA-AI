import { expect, test } from "vitest";
import {
  buildStudioProjectAdvice,
  studioProjectIdFromMessage,
} from "@/lib/chat-studio";
import type { StoredStudioProject } from "@/lib/site-studio-store";

const project: StoredStudioProject = {
  id: "2a4b6c8d-1111-4111-8111-123456789abc",
  idea: {
    brand: "Nắng Studio",
    idea: "Website giới thiệu dịch vụ chụp ảnh và nhận lịch tư vấn.",
    business: "service",
    goal: "book",
    audience: "Gia đình và doanh nghiệp nhỏ",
    style: "editorial",
    monthlyVisits: 3500,
    monthlyBudget: 450000,
    needsDomain: true,
    color: "#147D70",
  },
  brief: {
    headline: "Lưu lại khoảnh khắc đáng nhớ",
    subheadline: "Nắng Studio đồng hành cùng gia đình và doanh nghiệp trong từng khung hình.",
    ctaLabel: "Đặt lịch chụp",
    aboutTitle: "Về Nắng Studio",
    aboutCopy: "Dịch vụ chụp ảnh có quy trình rõ ràng và lịch hẹn thuận tiện cho từng khách hàng.",
    features: [
      { title: "Đặt lịch", copy: "Khách chọn thời gian phù hợp trước khi trao đổi chi tiết." },
      { title: "Thư viện", copy: "Các bộ ảnh tiêu biểu giúp khách hiểu phong cách thực tế." },
      { title: "Liên hệ", copy: "Thông tin tư vấn được trình bày rõ ràng trên từng thiết bị." },
    ],
    seoTitle: "Nắng Studio | Dịch vụ chụp ảnh",
    seoDescription: "Đặt lịch chụp ảnh gia đình và doanh nghiệp cùng Nắng Studio.",
  },
  generationMode: "template-fallback",
  createdAt: "2026-10-27T00:00:00.000Z",
  updatedAt: "2026-10-27T00:00:00.000Z",
};

test("chat recognizes a HOSTORA studio link", () => {
  expect(studioProjectIdFromMessage(`Tư vấn tiếp giúp tôi: http://localhost:3000/website-studio/p/${project.id}`)).toBe(project.id);
});

test("chat turns a generated website plan into grounded hosting advice", () => {
  const result = buildStudioProjectAdvice(project);
  expect(result.answer).toContain("Nắng Studio");
  expect(result.answer).toContain("Gói phù hợp nhất");
  expect(result.answer).toContain("3.500 lượt/tháng");
  expect(result.sources).toHaveLength(3);
  expect(result.answer).toContain("[P1]");
});
