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
  BookOpen,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  ["/", "Trang chủ", Home],
  ["/website-studio", "Tạo trang web", Sparkles],
  ["/services", "Dịch vụ", Server],
  ["/journal", "Sổ tay", BookOpen],
  ["/orders", "Đơn hàng", ReceiptText],
  ["/account", "Tài khoản", UserRound],
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
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => headerRef.current?.classList.toggle("is-scrolled", window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuRef.current?.focus(); }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);
  if (pathname.startsWith("/admin")) return <main>{children}</main>;
  const customerAuthFlow = pathname.startsWith("/account/");
  return (
    <>
      <a href="#main-content" className="site-skip-link">Đến nội dung chính</a>
      <header ref={headerRef} className="site-header">
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
            {links.filter(([href]) => href !== "/account" && href !== "/downloads/android").map(([href, label]) => (
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
            <Link href="/account" className="site-account-link" aria-label="Mở tài khoản khách hàng">
              <UserRound size={18} />
              <span>Tài khoản</span>
            </Link>
            <Link href="/downloads/android" className="site-header-cta">
              Tải ứng dụng
            </Link>
            <button
              ref={menuRef}
              className="site-menu-button"
              aria-controls={open ? "site-mobile-menu" : undefined}
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="site-mobile-menu" className="site-mobile-nav" aria-label="Điều hướng di động">
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
      <main id="main-content" tabIndex={-1} key={pathname} className="page-enter">
        {children}
      </main>
      {!customerAuthFlow && <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>HOSTORA</strong>
            <p>Hiểu dịch vụ. Biết chi phí. Chọn đúng.</p>
          </div>
          <nav aria-label="Liên kết cuối trang">
            <Link href="/website-studio">Tạo trang web với trợ lý</Link>
            <Link href="/services">Dịch vụ</Link>
            <Link href="/orders">Đơn hàng</Link>
            <Link href="/account">Tài khoản khách hàng</Link>
            <Link href="/knowledge">Kiến thức</Link>
            <Link href="/journal">Sổ tay làm website</Link>
            <Link href="/about">Câu chuyện HOSTORA</Link>
            <Link href="/website-analyzer">Kiểm tra trang web</Link>
            <Link href="/ai-assistant">Hỏi HOSTORA</Link>
          </nav>
          <small>
            Trợ lý chạy trên máy HOSTORA. Giá đối tác là tham khảo tại ngày kiểm
            tra.
          </small>
        </div>
      </footer>}
      {!customerAuthFlow && <nav
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
      </nav>}
    </>
  );
}
