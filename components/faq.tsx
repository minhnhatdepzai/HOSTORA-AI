"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const questions = [
  [
    "Hosting và tên miền khác nhau thế nào?",
    "Tên miền là địa chỉ khách gõ để tìm bạn; dịch vụ lưu trữ là nơi giữ nội dung trang web. Bạn thường cần cả hai để trang web hoạt động.",
  ],
  [
    "Cửa hàng mới có cần thuê máy riêng không?",
    "Thông thường chưa cần. Gói lưu trữ được nhà cung cấp quản lý sẽ dễ bắt đầu hơn; chỉ cân nhắc máy riêng khi có người phụ trách và nhu cầu đặc biệt.",
  ],
  [
    "Giá khuyến mại có phải chi phí lâu dài?",
    "Không nhất thiết. HOSTORA tách giá ưu đãi và giá gia hạn, đồng thời tính tổng chi phí theo kỳ để bạn cân nhắc.",
  ],
  [
    "Dịch vụ tăng tốc có giúp trang bán hàng nhanh hơn?",
    "Có thể, nhất là khi khách ở nhiều nơi. Hiệu quả thực tế còn phụ thuộc hình ảnh, cách trang web được xây dựng và vị trí khách hàng.",
  ],
  [
    "HOSTORA có gửi hồ sơ của tôi ra ngoài không?",
    "Không. Trợ lý chạy trên máy HOSTORA. Hồ sơ mua hàng chỉ được lưu trong kho đơn hàng để báo giá và gửi thư, không được dùng làm nội dung trò chuyện với trợ lý.",
  ],
  [
    "Trợ lý có đảm bảo gói lưu trữ phục vụ được đợt bán đông khách?",
    "Không thể đảm bảo chỉ bằng ước lượng. Bạn cần thử với trang web thật trước một chiến dịch quan trọng.",
  ],
];

export function FAQ() {
  const [active, setActive] = useState(0);
  return (
    <section
      className="mx-auto max-w-7xl px-5 py-16 lg:px-8"
      aria-labelledby="faq-title"
    >
      <p className="eyebrow">Câu hỏi thường gặp</p>
      <h2
        id="faq-title"
        className="mt-3 mb-8 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl"
      >
        Cần rõ thêm điều gì?
      </h2>
      <div className="divide-y divide-[#d7e2de] border-t border-b border-[#d7e2de]">
        {questions.map(([q, a], i) => (
          <div key={q}>
            <button
              className="flex w-full items-center justify-between gap-4 py-5 text-left font-extrabold"
              onClick={() => setActive(active === i ? -1 : i)}
              aria-expanded={active === i}
            >
              {q}
              <ChevronDown
                className={`shrink-0 transition ${active === i ? "rotate-180" : ""}`}
                size={18}
              />
            </button>
            {active === i && (
              <p className="max-w-3xl pb-5 leading-7 text-slate-600">{a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
