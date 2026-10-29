"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { faqQuestions } from "@/lib/faq";

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
        {faqQuestions.map(([q, a], i) => (
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
