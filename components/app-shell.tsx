"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bot,
  Download,
  Home,
  Menu,
  ReceiptText,
  Server,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  ["/", "Trang chủ", Home],
  ["/website-studio", "Tạo trang web", Sparkles],
  ["/services", "Dịch vụ", Server],
  ["/orders", "Đơn hàng", ReceiptText],
  ["/ai-assistant", "Hỏi trợ lý", Bot],
  ["/downloads/android", "Tải app", Download],
] as const;

const mobileLinks = [
  ["/", "Trang chủ", Home],
  ["/services", "Dịch vụ", Server],
  ["/website-studio", "Tạo trang", Sparkles],
  ["/orders", "Đơn hàng", ReceiptText],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin")) return <main>{children}</main>;
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" onClick={() => setOpen(false)}>
            <Image
              src="/hostora-icon.png"
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-xl"
            />
            <span className="site-brand-wordmark">
              <strong>HOSTORA</strong>
              <small>CỐ VẤN TRANG WEB</small>
            </span>
          </Link>
          <nav className="site-desktop-nav" aria-label="Điều hướng chính">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "site-nav-link",
                  pathname === href && "is-active",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="site-header-actions">
            <Link href="/downloads/android" className="site-header-cta">
              Tải ứng dụng
            </Link>
            <button
              className="site-menu-button"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="site-mobile-nav" aria-label="Điều hướng di động">
            {links.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "site-mobile-link",
                  pathname === href && "is-active",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main key={pathname} className="page-enter">
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>HOSTORA</strong>
            <p>Hiểu dịch vụ. Biết chi phí. Chọn đúng.</p>
          </div>
          <nav aria-label="Liên kết cuối trang">
            <Link href="/website-studio">Tạo trang web với trợ lý</Link>
            <Link href="/services">Dịch vụ</Link>
            <Link href="/orders">Đơn hàng</Link>
            <Link href="/knowledge">Kiến thức</Link>
            <Link href="/website-analyzer">Kiểm tra trang web</Link>
            <Link href="/ai-assistant">Hỏi HOSTORA</Link>
          </nav>
          <small>
            Trợ lý chạy trên máy HOSTORA. Giá đối tác là tham khảo tại ngày kiểm
            tra.
          </small>
        </div>
      </footer>
      <nav
        className="site-mobile-dock"
        aria-label="Điều hướng nhanh trên điện thoại"
      >
        {mobileLinks.map(([href, label, Icon]) => {
          const active =
            href === "/"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn("site-mobile-dock-link", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
