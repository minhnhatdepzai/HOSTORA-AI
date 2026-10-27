import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { siteOrigin } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "HOSTORA AI — Chọn dịch vụ cho website",
    template: "%s · HOSTORA AI",
  },
  description:
    "Trợ lý AI cục bộ giúp doanh nghiệp Việt phân tích nhu cầu, so sánh chi phí và đặt mua hosting, tên miền, email minh bạch tại HOSTORA.",
  applicationName: "HOSTORA AI",
  keywords: ["hosting Việt Nam", "mua hosting", "tên miền", "email doanh nghiệp", "tư vấn website", "HOSTORA"],
  authors: [{ name: "HOSTORA" }],
  creator: "HOSTORA",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "HOSTORA AI",
    title: "HOSTORA AI — Chọn dịch vụ cho website",
    description: "Tư vấn nhu cầu, xem dịch vụ và đặt mua hosting ngay tại HOSTORA.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HOSTORA AI — Chọn đúng dịch vụ cho website" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HOSTORA AI — Chọn dịch vụ cho website",
    description: "Tư vấn nhu cầu, xem dịch vụ và đặt mua hosting ngay tại HOSTORA.",
    images: ["/twitter-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
