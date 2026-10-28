import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { getJournalArticle, journalArticles } from "@/data/journal";
import { pageMetadata } from "@/lib/page-metadata";
import { StructuredData } from "@/components/structured-data";
import { absoluteSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return journalArticles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getJournalArticle((await params).slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.summary,
    path: `/journal/${article.slug}`,
  });
}

export default async function JournalArticlePage({ params }: Props) {
  const article = getJournalArticle((await params).slug);
  if (!article) notFound();
  const next =
    journalArticles[
      journalArticles.findIndex((item) => item.slug === article.slug) + 1
    ];
  const url = absoluteSiteUrl(`/journal/${article.slug}`);
  return (
    <article className="journal-article">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.summary,
          inLanguage: "vi-VN",
          dateModified: article.updatedAt,
          datePublished: article.updatedAt,
          mainEntityOfPage: url,
          publisher: {
            "@type": "Organization",
            name: "HOSTORA",
            url: absoluteSiteUrl("/"),
          },
        }}
      />
      <header className="journal-article-head">
        <div className="journal-article-wrap">
          <Link href="/journal" className="journal-back">
            <ArrowLeft size={16} /> Sổ tay HOSTORA
          </Link>
          <p className="journal-eyebrow">{article.stage}</p>
          <h1>{article.title}</h1>
          <p className="journal-article-lede">{article.summary}</p>
          <p className="journal-reading">
            <Clock3 size={16} /> {article.minutes} phút đọc · Cập nhật{" "}
            {new Date(`${article.updatedAt}T00:00:00+07:00`).toLocaleDateString(
              "vi-VN",
            )}
          </p>
        </div>
      </header>
      <div className="journal-article-wrap journal-article-body">
        {article.sections.map((section, index) => (
          <section key={section.heading}>
            <span className="journal-section-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.checklist && (
              <div className="journal-checklist">
                <strong>Việc bạn có thể kiểm tra ngay</strong>
                <ul>
                  {section.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
      <footer className="journal-article-wrap journal-article-foot">
        <div>
          <span className="journal-eyebrow">LÀM TIẾP MỘT BƯỚC</span>
          <h2>Đọc xong, thử ngay.</h2>
          <Link className="button-primary" href={article.action.href}>
            {article.action.label} <ArrowRight size={17} />
          </Link>
        </div>
        {next && (
          <Link className="journal-next" href={`/journal/${next.slug}`}>
            <small>BÀI TIẾP THEO · {next.stage}</small>
            <strong>{next.title}</strong>
            <ArrowRight size={18} />
          </Link>
        )}
      </footer>
    </article>
  );
}
