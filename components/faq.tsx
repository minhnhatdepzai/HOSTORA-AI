"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const questions = [
  [
    "Hosting và tên miền khác nhau thế nào?",
    "Tên miền là địa chỉ; hosting là nơi lưu mã nguồn và dữ liệu website. Bạn thường cần cả hai để website hoạt động.",
  ],
  [
    "Shop mới có cần VPS không?",
    "Thông thường chưa cần. Shared hosting được quản lý dễ vận hành hơn; chỉ cân nhắc VPS khi cần quyền kiểm soát, tài nguyên hoặc cấu hình riêng.",
  ],
  [
    "Giá khuyến mại có phải chi phí lâu dài?",
    "Không nhất thiết. HOSTORA tách giá ưu đãi và giá gia hạn, đồng thời tính tổng chi phí theo kỳ để bạn thấy trade-off.",
  ],
  [
    "CDN có giúp website bán hàng nhanh hơn?",
    "CDN có thể giảm độ trễ cho nội dung tĩnh và giảm tải origin, nhưng hiệu quả còn phụ thuộc cache, ảnh, mã nguồn và vị trí khách hàng.",
  ],
  [
    "HOSTORA có gửi dữ liệu lên AI đám mây?",
    "Không. Các chức năng AI cốt lõi gọi Ollama trên 127.0.0.1 với Qwen; thông tin lead chỉ nằm trong localStorage của trình duyệt.",
  ],
  [
    "AI có đảm bảo gói hosting chịu được flash sale?",
    "Không. Mô phỏng chỉ là ước lượng theo giả định. Cần load test ứng dụng thật trước một chiến dịch quan trọng.",
  ],
];

export function FAQ() {
  const [active, setActive] = useState(0);
  return (
    <div className="divide-y divide-slate-200">
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
  );
}
