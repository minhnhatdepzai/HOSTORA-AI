"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  Gauge,
  Globe2,
  Home,
  Menu,
  Server,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  ["/", "Trang chủ", Home],
  ["/consultation", "Tư vấn AI", BrainCircuit],
  ["/recommendations", "Gói đề xuất", Server],
  ["/readiness", "Launch Score", Gauge],
  ["/ai-assistant", "Trợ lý", Bot],
  ["/intelligence", "Mô phỏng", ChartNoAxesCombined],
  ["/domain-advisor", "Tên miền", Globe2],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin")) return <main>{children}</main>;
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-[#f5f7f6]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={() => setOpen(false)}
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#0b1728] text-sm font-black text-mint">
              H
            </span>
            <span className="text-lg font-black tracking-[-.04em]">
              HOSTORA <span className="text-blue">AI</span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Điều hướng chính"
          >
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink",
                  pathname === href && "bg-white text-ink shadow-sm",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:flex">
              <i className="size-2 animate-pulse rounded-full bg-emerald-500" />
              Local AI
            </span>
            <button
              className="grid size-10 place-items-center rounded-xl bg-white lg:hidden"
              aria-label="Mở menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-slate-200 bg-white p-4 lg:hidden">
            {links.map(([href, label, Icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold",
                  pathname === href ? "bg-blue text-white" : "text-slate-700",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>HOSTORA AI · Local-first · Không gửi dữ liệu tới AI trả phí</p>
          <div className="flex gap-5">
            <Link href="/knowledge">Kiến thức</Link>
            <Link href="/website-analyzer">Phân tích website</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
