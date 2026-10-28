"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Requirements, WebsiteType } from "@/lib/types";

const defaults: Requirements = {
  websiteType: "store",
  monthlyVisits: 5000,
  monthlyBudget: 300000,
  needsDomain: true,
  ecommerce: true,
  notes: "",
};
const types: Array<[WebsiteType, string, string]> = [
  ["store", "Bán hàng", "Giỏ hàng, thanh toán và đơn hàng"],
  ["company", "Giới thiệu", "Thương hiệu, dịch vụ và liên hệ"],
  ["blog", "Blog / nội dung", "Bài viết và độc giả"],
];

export function ConsultationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(defaults);
  const [natural, setNatural] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("hostora:requirements");
      if (saved)
        try {
          setData({ ...defaults, ...JSON.parse(saved) });
        } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const save = (next: Requirements) => {
    setData(next);
    localStorage.setItem("hostora:requirements", JSON.stringify(next));
  };
  async function analyze() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: natural }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Không phân tích được");
      save({
        ...data,
        websiteType:
          out.websiteType === "unknown" ? data.websiteType : out.websiteType,
        monthlyVisits: out.monthlyVisits ?? data.monthlyVisits,
        monthlyBudget: out.monthlyBudget ?? data.monthlyBudget,
        needsDomain: out.needsDomain ?? data.needsDomain,
        ecommerce: out.ecommerce,
        notes: natural,
      });
      setMessage(
        out.followUpQuestion || "AI đã điền các dữ kiện nhận diện được.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Local AI chưa sẵn sàng");
    } finally {
      setLoading(false);
    }
  }
  function finish() {
    localStorage.setItem("hostora:requirements", JSON.stringify(data));
    router.push("/recommendations");
  }
  return (
    <div className="grid gap-7 lg:grid-cols-[.68fr_1.32fr]">
      <aside className="panel h-fit p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-ink text-mint">
            <Bot size={19} />
          </span>
          <div>
            <p className="text-xs font-black text-blue">NÓI NHU CẦU CỦA BẠN</p>
            <p className="font-extrabold">Mô tả bằng lời</p>
          </div>
        </div>
        <textarea
          aria-label="Mô tả nhu cầu website"
          className="input mt-5 min-h-36 resize-none"
          placeholder="Ví dụ: Tôi bán mỹ phẩm online, khoảng 5.000 lượt truy cập/tháng, ngân sách 300 nghìn và cần tên miền..."
          value={natural}
          onChange={(e) => setNatural(e.target.value)}
        />
        <button
          disabled={loading || natural.trim().length < 10}
          onClick={analyze}
          className="button-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Sparkles size={17} />
          )}
          Điền thông tin giúp tôi
        </button>
        {message && (
          <p className="mt-3 rounded-xl bg-blue/5 p-3 text-sm leading-6 text-slate-700">
            {message}
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Trợ lý chỉ điền thông tin bạn đã mô tả. Hãy kiểm tra và sửa trước khi xem gợi ý.
        </p>
      </aside>
      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span>BƯỚC {step + 1}/4</span>
            <span>
              {["Loại website", "Lưu lượng", "Ngân sách", "Tên miền"][step]}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue transition-all"
              style={{ width: `${(step + 1) * 25}%` }}
            />
          </div>
        </div>
        <div className="min-h-96 p-6 sm:p-9">
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-black">
                Bạn đang xây loại website nào?
              </h2>
              <p className="mt-2 text-slate-600">
                Mỗi loại website cần tài nguyên khác nhau.
              </p>
              <div className="mt-7 grid gap-3">
                {types.map(([value, label, copy]) => (
                  <button
                    key={value}
                    onClick={() =>
                      save({
                        ...data,
                        websiteType: value,
                        ecommerce: value === "store",
                      })
                    }
                    className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${data.websiteType === value ? "border-blue bg-blue/5 shadow-[0_0_0_3px_rgba(49,94,251,.08)]" : "border-slate-200 bg-white hover:border-slate-400"}`}
                  >
                    <div>
                      <p className="font-black">{label}</p>
                      <p className="mt-1 text-sm text-slate-500">{copy}</p>
                    </div>
                    {data.websiteType === value && (
                      <span className="grid size-7 place-items-center rounded-full bg-blue text-white">
                        <Check size={15} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black">
                Lượt truy cập ước tính mỗi tháng?
              </h2>
              <p className="mt-2 text-slate-600">
                Ước lượng này giúp chọn gói ban đầu; tốc độ thực tế cần được kiểm tra riêng.
              </p>
              <div className="mt-8 text-center">
                <strong className="text-5xl font-black tracking-tight">
                  {data.monthlyVisits.toLocaleString("vi-VN")}
                </strong>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  lượt / tháng
                </p>
              </div>
              <label className="mx-auto mt-7 block max-w-sm">
                <span className="label">Hoặc nhập lượng khách dự kiến</span>
                <input
                  aria-label="Lượt truy cập mỗi tháng"
                  className="input text-xl font-black"
                  type="number"
                  min="1"
                  max="100000000"
                  step="1"
                  value={data.monthlyVisits}
                  onChange={(e) =>
                    save({ ...data, monthlyVisits: Number(e.target.value) })
                  }
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="w-full text-xs text-slate-500">Mức tham khảo</span>
                {[1000, 5000, 10000, 50000, 100000].map((value) => (
                  <button
                    className="button-secondary text-sm"
                    type="button"
                    aria-pressed={data.monthlyVisits === value}
                    onClick={() => save({ ...data, monthlyVisits: value })}
                    key={value}
                  >
                    {value.toLocaleString("vi-VN")}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black">
                Ngân sách vận hành mỗi tháng?
              </h2>
              <p className="mt-2 text-slate-600">
                Chọn gói theo giá gia hạn để tránh vượt ngân sách sau ưu đãi. Tiền tên miền và thuế cần xác nhận riêng.
              </p>
              <label className="mt-9 block">
                <span className="label">Ngân sách (VND/tháng)</span>
                <input
                  className="input text-xl font-black"
                  type="number"
                  min="10000"
                  max="100000000"
                  step="10000"
                  value={data.monthlyBudget}
                  onChange={(e) =>
                    save({ ...data, monthlyBudget: Number(e.target.value) })
                  }
                />
              </label>
              <label className="mt-5 block">
                <span className="label">Số tiền có thể trả ban đầu (đồng, không bắt buộc)</span>
                <input className="input" type="number" min="0" max="1000000000" step="1" value={data.upfrontBudget ?? ""} placeholder="Để trống nếu chưa quyết định" onChange={(e) => save({ ...data, upfrontBudget: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </label>
              <p className="mt-2 text-xs text-slate-600">Giá ưu đãi thường yêu cầu trả trước 12–48 tháng. Nhập khoản này để loại gói vượt khả năng thanh toán ban đầu.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[100000, 300000, 600000, 1000000].map((v) => (
                  <button
                    className="button-secondary text-sm"
                    onClick={() => save({ ...data, monthlyBudget: v })}
                    key={v}
                  >
                    {v.toLocaleString("vi-VN")}đ
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black">
                Bạn có cần mua kèm tên miền?
              </h2>
              <p className="mt-2 text-slate-600">
                HOSTORA chỉ ghi đã bao gồm khi nhà cung cấp xác nhận.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    true,
                    "Có, cần tên miền",
                    "Ưu tiên gói tặng tên miền năm đầu",
                  ],
                  [
                    false,
                    "Không, tôi đã có",
                    "Tập trung vào hosting và vận hành",
                  ],
                ].map(([value, label, copy]) => (
                  <button
                    key={String(value)}
                    onClick={() =>
                      save({ ...data, needsDomain: Boolean(value) })
                    }
                    className={`rounded-2xl border p-6 text-left ${data.needsDomain === value ? "border-blue bg-blue/5" : "border-slate-200"}`}
                  >
                    <p className="font-black">{String(label)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {String(copy)}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-8 rounded-2xl bg-ink p-5 text-white">
                <p className="text-xs font-black text-mint">TÓM TẮT</p>
                <p className="mt-2 font-bold">
                  {types.find((t) => t[0] === data.websiteType)?.[1]} ·{" "}
                  {data.monthlyVisits.toLocaleString("vi-VN")} lượt/tháng ·{" "}
                  {data.monthlyBudget.toLocaleString("vi-VN")}đ/tháng
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between border-t border-slate-200 px-6 py-5">
          <button
            className="button-secondary disabled:opacity-30"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={17} />
            Quay lại
          </button>
          {step < 3 ? (
            <button
              className="button-primary"
              disabled={
                (step === 1 && (!Number.isInteger(data.monthlyVisits) || data.monthlyVisits < 1 || data.monthlyVisits > 100000000)) ||
                (step === 2 && (!Number.isInteger(data.monthlyBudget) || data.monthlyBudget < 10000 || data.monthlyBudget > 100000000 || (data.upfrontBudget !== undefined && (!Number.isInteger(data.upfrontBudget) || data.upfrontBudget < 0 || data.upfrontBudget > 1000000000))))
              }
              onClick={() => setStep(step + 1)}
            >
              Tiếp tục
              <ArrowRight size={17} />
            </button>
          ) : (
            <button className="button-primary" onClick={finish}>
              Xem đề xuất
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
