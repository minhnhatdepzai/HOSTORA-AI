import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calculator,
  Check,
  ChevronRight,
  DatabaseZap,
  Download,
  Gauge,
  LockKeyhole,
  Radar,
  ServerCog,
  Sparkles,
} from "lucide-react";
import { HeroVisual } from "@/components/hero-visual";
import { FAQ } from "@/components/faq";

export default function HomePage() {
  return (
    <>
      <section className="mesh-dark grid-lines noise overflow-hidden text-white">
        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.12fr_.88fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-bold text-mint">
              <Sparkles size={14} />
              Qwen 3.5 · chạy hoàn toàn trên máy
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Hạ tầng đúng cho{" "}
              <span className="gradient-text">tham vọng thật.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Biến nhu cầu kinh doanh thành lựa chọn hosting minh bạch — có điểm
              số, tổng chi phí và nguồn dữ liệu được xác minh.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-3.5 font-black text-ink transition hover:-translate-y-0.5"
                href="/consultation"
              >
                Bắt đầu tư vấn <ArrowRight size={18} />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-5 py-3.5 font-bold text-white"
                href="/ai-assistant"
              >
                <Bot size={18} />
                Hỏi HOSTORA
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-5 py-3.5 font-bold text-mint"
                href="/downloads/android"
                download
              >
                <Download size={18} />
                Tải app Android 1.4.0
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              APK cài trực tiếp, không cần Expo Go. AI local cần máy HOSTORA
              đang chạy cùng mạng.
            </p>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-300">
              {[
                "Không API AI trả phí",
                "Không bịa giá",
                "Không gửi lead ra ngoài",
              ].map((x) => (
                <span className="flex items-center gap-2" key={x}>
                  <Check size={15} className="text-mint" />
                  {x}
                </span>
              ))}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="eyebrow">Một luồng, đủ bằng chứng</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.045em]">
              Không chỉ là một chatbot.
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              HOSTORA tách AI khỏi phần phải chính xác: code chấm điểm và tính
              tiền; model chỉ trích xuất, giải thích và đối thoại trên dữ liệu
              đã khóa.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                Radar,
                "Hiểu nhu cầu",
                "Nhập wizard hoặc mô tả tự nhiên bằng tiếng Việt.",
              ],
              [
                ServerCog,
                "Xếp hạng giải thích được",
                "7 nhóm tiêu chí, top 1 và 2 lựa chọn thay thế.",
              ],
              [
                Calculator,
                "Nhìn rõ chi phí thật",
                "Giá ưu đãi, gia hạn và tổng chi phí theo kỳ.",
              ],
              [
                DatabaseZap,
                "RAG có nguồn",
                "Trả lời từ kho kiến thức local, kèm URL và ngày xác minh.",
              ],
              [
                Gauge,
                "Launch Score AI",
                "Chấm hồ sơ website như CV, chỉ ra blocker và tạo câu hỏi phản biện.",
              ],
            ].map(([Icon, title, copy]) => (
              <article key={String(title)} className="panel p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#eaf0ff] text-blue">
                  <Icon size={21} />
                </span>
                <h3 className="mt-5 text-lg font-black">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {String(copy)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-[#e9efec]">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Decision intelligence</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-.045em]">
                Từ shop mới tới ngày flash sale.
              </h2>
            </div>
            <Link className="button-secondary" href="/intelligence">
              Mở bộ mô phỏng <ChevronRight size={17} />
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              [
                "01",
                "Chi phí sở hữu",
                "Tính 12/24/36/48 tháng bằng code, không suy diễn giá chưa xác minh.",
              ],
              [
                "02",
                "Rủi ro traffic",
                "Mô phỏng spike theo giờ mà không biến ước lượng thành cam kết.",
              ],
              [
                "03",
                "Lộ trình tăng trưởng",
                "Biết thời điểm cân nhắc CDN, cache, cloud hoặc VPS.",
              ],
            ].map(([n, t, c]) => (
              <article key={n} className="rounded-[1.7rem] bg-white p-7">
                <span className="font-mono text-xs font-bold text-blue">
                  {n}
                </span>
                <h3 className="mt-8 text-xl font-black">{t}</h3>
                <p className="mt-3 leading-7 text-slate-600">{c}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">An toàn theo thiết kế</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.045em]">
              Riêng tư không phải checkbox.
            </h2>
            <div className="mt-8 space-y-5">
              {[
                [
                  LockKeyhole,
                  "Loopback only",
                  "Ollama chỉ được gọi từ server local tại 127.0.0.1.",
                ],
                [
                  DatabaseZap,
                  "Dữ liệu có provenance",
                  "Mỗi đoạn kiến thức có nguồn, loại nguồn và ngày xác minh.",
                ],
                [
                  ServerCog,
                  "AI không nắm máy tính",
                  "Model không có shell, không thể tự chạy lệnh hay thay số liệu catalog.",
                ],
              ].map(([Icon, t, c]) => (
                <div key={String(t)} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-mint">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="font-extrabold">{String(t)}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {String(c)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-7">
            <p className="eyebrow">FAQ</p>
            <FAQ />
          </div>
        </div>
      </section>
    </>
  );
}
