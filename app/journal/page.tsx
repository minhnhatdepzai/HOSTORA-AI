import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock3 } from "lucide-react";
import { journalArticles } from "@/data/journal";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Sổ tay làm website và chọn hosting",
  description:
    "Hướng dẫn từng bước bằng tiếng Việt: lên ý tưởng, chọn hosting, đưa website lên mạng và thêm AI hữu ích.",
  path: "/journal",
  keywords: [
    "hướng dẫn làm website",
    "cách chọn hosting",
    "đưa website lên mạng",
    "AI cho website",
  ],
});

export default function JournalPage() {
  return (
    <div className="journal-page">
      <section className="journal-hero">
        <div className="journal-wrap journal-hero-inner">
          <div>
            <p className="journal-eyebrow">
              SỔ TAY HOSTORA / TỪ Ý TƯỞNG ĐẾN NGÀY RA MẮT
            </p>
            <h1>Một trang web tốt bắt đầu bằng một câu hỏi đúng.</h1>
            <p>
              Đọc theo hành trình của bạn. Mỗi bài có việc cụ thể để làm tiếp,
              không cần biết thuật ngữ kỹ thuật.
            </p>
            <Link className="journal-hero-link" href="/website-studio">
              Bắt đầu từ ý tưởng <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="journal-hero-mark" aria-hidden="true">
            <span>H</span>
            <i>01 / 04</i>
            <strong>Hiểu · Làm · Ra mắt · Phát triển</strong>
          </div>
        </div>
      </section>
      <section
        className="journal-list journal-wrap"
        aria-label="Các bài hướng dẫn"
      >
        <div className="journal-list-heading">
          <div>
            <p className="journal-eyebrow">LỘ TRÌNH CHO BẠN</p>
            <h2>Chọn đúng chặng đang làm.</h2>
          </div>
          <p>
            Bạn có thể vào bất kỳ bài nào. Sau khi mua, quay lại đây để kiểm tra
            bước kế tiếp.
          </p>
        </div>
        {journalArticles.map((article, index) => (
          <Link
            className="journal-row"
            href={`/journal/${article.slug}`}
            key={article.slug}
          >
            <span className="journal-row-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="journal-stage">{article.stage}</span>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
            </div>
            <span className="journal-row-meta">
              <Clock3 size={15} /> {article.minutes} phút đọc
            </span>
            <ArrowUpRight className="journal-row-arrow" size={22} />
          </Link>
        ))}
      </section>
      <aside className="journal-bottom journal-wrap">
        <BookOpen size={26} />
        <div>
          <h2>Cần hỏi theo trường hợp của bạn?</h2>
          <p>
            Đưa nhu cầu cho trợ lý, rồi đối chiếu giá và điều kiện trong danh
            mục trước khi đặt mua.
          </p>
        </div>
        <Link className="button-primary" href="/ai-assistant">
          Hỏi trợ lý <ArrowUpRight size={17} />
        </Link>
      </aside>
    </div>
  );
}
