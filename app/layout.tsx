import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "HOSTORA AI — Chọn hosting bằng AI local",
    template: "%s · HOSTORA AI",
  },
  description:
    "Trợ lý local AI phân tích nhu cầu, so sánh chi phí và chọn hosting minh bạch cho shop Việt.",
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
