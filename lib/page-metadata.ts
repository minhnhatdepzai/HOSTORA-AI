import type { Metadata } from "next";

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  keywords?: string[];
};

export function pageMetadata({
  title,
  description,
  path,
  keywords = [],
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: "HOSTORA AI",
      title,
      description,
      url: path,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "HOSTORA AI — Chọn đúng dịch vụ cho website",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}
