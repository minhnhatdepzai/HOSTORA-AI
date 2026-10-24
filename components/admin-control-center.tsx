"use client";

import {
  Activity,
  ArrowDownToLine,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  FileDown,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCheck,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  leadsToCsv,
  leadStatuses,
  readStoredLeads,
  type AdminLead,
  type LeadStatus,
} from "@/lib/local-admin";
import type { Requirements } from "@/lib/types";
import { formatVnd } from "@/lib/utils";

type CatalogSummary = {
  plans: number;
  products: number;
  providers: number;
  verifiedAt: string;
  missingRenewal: number;
};

type HealthState = "checking" | "ready" | "offline";

const statusLabels: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  closed: "Đã hoàn tất",
};

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  qualified: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

const websiteLabels: Record<Requirements["websiteType"], string> = {
  store: "Website bán hàng",
  company: "Website giới thiệu",
  blog: "Blog / nội dung",
};

const segmentLabels = {
  "new-site": "Website mới",
  upgrade: "Đang nâng cấp",
  "price-sensitive": "Quan tâm chi phí",
  "technical-consulting": "Cần tư vấn sâu",
};

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readRequirements(): Requirements | null {
  try {
    const value = JSON.parse(
      localStorage.getItem("hostora:requirements") ?? "null",
    ) as Partial<Requirements> | null;
    if (
      !value ||
      !["store", "company", "blog"].includes(value.websiteType ?? "") ||
      typeof value.monthlyVisits !== "number" ||
      typeof value.monthlyBudget !== "number" ||
      typeof value.needsDomain !== "boolean" ||
      typeof value.ecommerce !== "boolean"
    )
      return null;
    return value as Requirements;
  } catch {
    return null;
  }
}

export function AdminControlCenter({ catalog }: { catalog: CatalogSummary }) {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [health, setHealth] = useState<HealthState>("checking");
  const [lastChecked, setLastChecked] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [classifying, setClassifying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadLocalData = useCallback(() => {
    setLeads(readStoredLeads(localStorage.getItem("hostora:leads")));
    setRequirements(readRequirements());
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealth("checking");
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const result = (await response.json()) as { ok?: boolean };
      setHealth(response.ok && result.ok ? "ready" : "offline");
    } catch {
      setHealth("offline");
    } finally {
      setLastChecked(new Date().toLocaleTimeString("vi-VN"));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLocalData();
      void refreshHealth();
    }, 0);
    const onStorage = () => loadLocalData();
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadLocalData, refreshHealth]);

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        leadStatuses.map((status) => [
          status,
          leads.filter((lead) => lead.status === status).length,
        ]),
      ) as Record<LeadStatus, number>,
    [leads],
  );

  const popularPlans = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads)
      counts.set(lead.plan, (counts.get(lead.plan) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return leads.filter(
      (lead) =>
        (statusFilter === "all" || lead.status === statusFilter) &&
        (!normalized ||
          lead.name.toLocaleLowerCase("vi").includes(normalized) ||
          lead.phone.includes(normalized) ||
          lead.plan.toLocaleLowerCase("vi").includes(normalized)),
    );
  }, [leads, query, statusFilter]);

  function saveLeads(next: AdminLead[]) {
    setLeads(next);
    localStorage.setItem("hostora:leads", JSON.stringify(next));
  }

  function updateStatus(id: string, status: LeadStatus) {
    saveLeads(
      leads.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
    setMessage("Đã cập nhật trạng thái khách hàng.");
  }

  function removeLead(id: string, name: string) {
    if (!window.confirm(`Xóa đăng ký của ${name} khỏi trình duyệt này?`))
      return;
    saveLeads(leads.filter((lead) => lead.id !== id));
    setMessage("Đã xóa đăng ký trên thiết bị này.");
  }

  function clearLeads() {
    if (!leads.length) return;
    if (
      !window.confirm(
        `Xóa toàn bộ ${leads.length} đăng ký trên trình duyệt này?`,
      )
    )
      return;
    saveLeads([]);
    setMessage("Đã xóa toàn bộ đăng ký trên thiết bị này.");
  }

  async function classifyLead(lead: AdminLead) {
    setClassifying(lead.id);
    setMessage("");
    try {
      const response = await fetch("/api/ai/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: lead.plan,
          websiteType: requirements?.websiteType ?? "store",
          monthlyBudget: requirements?.monthlyBudget ?? 0,
          monthlyVisits: requirements?.monthlyVisits ?? 0,
          notes: requirements?.notes ?? "",
        }),
      });
      if (!response.ok) throw new Error("Trợ lý chưa sẵn sàng");
      const intelligence = (await response.json()) as AdminLead["intelligence"];
      saveLeads(
        leads.map((item) =>
          item.id === lead.id ? { ...item, intelligence } : item,
        ),
      );
      setMessage("Đã phân nhóm nhu cầu mà không gửi tên hoặc số điện thoại.");
    } catch {
      setMessage(
        "Chưa thể phân nhóm lúc này. Thông tin khách vẫn được giữ nguyên.",
      );
    } finally {
      setClassifying(null);
    }
  }

  function exportCsv() {
    downloadFile(
      `hostora-khach-hang-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${leadsToCsv(leads)}`,
      "text/csv;charset=utf-8",
    );
  }

  function exportBackup() {
    downloadFile(
      `hostora-sao-luu-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), leads, requirements },
        null,
        2,
      ),
      "application/json",
    );
  }

  const navItems = [
    ["#tong-quan", "Tổng quan", LayoutDashboard],
    ["#khach-hang", "Khách đăng ký", Users],
    ["#dich-vu", "Dịch vụ", Activity],
    ["#du-lieu", "Dữ liệu", Database],
  ] as const;

  return (
    <div className="min-h-screen bg-[#eef3f1] text-[#101b2c]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-[#081421] px-5 py-6 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-mint text-lg font-black text-ink">
            H
          </span>
          <span>
            <strong className="block text-lg tracking-[-.04em]">HOSTORA</strong>
            <small className="text-[10px] font-black tracking-[.2em] text-mint">
              TRUNG TÂM QUẢN TRỊ
            </small>
          </span>
        </Link>
        <nav className="mt-10 space-y-2" aria-label="Điều hướng quản trị">
          {navItems.map(([href, label, Icon], index) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${index === 0 ? "bg-white text-ink" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-mint">
            <LockKeyhole size={16} /> Dữ liệu cục bộ
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Chỉ quản lý dữ liệu trong trình duyệt này. Không tự đồng bộ từ điện
            thoại.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#eef3f1]/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                className="grid size-10 place-items-center rounded-xl bg-white shadow-sm lg:hidden"
                onClick={() => setMobileMenu(true)}
                aria-label="Mở menu quản trị"
              >
                <LayoutDashboard size={19} />
              </button>
              <div>
                <p className="text-sm font-black">Bảng điều hành</p>
                <p className="text-xs text-slate-500">
                  Theo dõi và xử lý công việc trong ngày
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-black sm:flex ${health === "ready" ? "bg-emerald-100 text-emerald-800" : health === "checking" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}
              >
                <i
                  className={`size-2 rounded-full ${health === "ready" ? "bg-emerald-500" : health === "checking" ? "bg-amber-500" : "bg-red-500"}`}
                />
                {health === "ready"
                  ? "Dịch vụ sẵn sàng"
                  : health === "checking"
                    ? "Đang kiểm tra"
                    : "Cần kiểm tra"}
              </span>
              <Link href="/" className="button-secondary !px-4 !py-2 text-xs">
                Về trang khách hàng
              </Link>
            </div>
          </div>
        </header>

        {mobileMenu ? (
          <div
            className="fixed inset-0 z-50 bg-ink/50 lg:hidden"
            onClick={() => setMobileMenu(false)}
          >
            <div
              className="h-full w-[82%] max-w-xs bg-ink p-5 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <strong>HOSTORA QUẢN TRỊ</strong>
                <button
                  onClick={() => setMobileMenu(false)}
                  aria-label="Đóng menu"
                >
                  <X />
                </button>
              </div>
              <nav className="mt-8 space-y-2">
                {navItems.map(([href, label, Icon]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenu(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
                  >
                    <Icon size={18} /> {label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        <main className="mx-auto max-w-[1500px] space-y-8 px-5 py-8 lg:px-8 lg:py-10">
          {message ? (
            <div
              role="status"
              className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} /> {message}
              </span>
              <button
                aria-label="Đóng thông báo"
                onClick={() => setMessage("")}
              >
                <X size={17} />
              </button>
            </div>
          ) : null}

          <section id="tong-quan" className="scroll-mt-28">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Tổng quan hôm nay</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-5xl">
                  Mọi việc quan trọng ở một nơi.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Theo dõi khách đăng ký, tình trạng tư vấn và độ mới của dữ
                  liệu mà không đưa thông tin cá nhân lên dịch vụ bên ngoài.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="button-secondary !rounded-xl"
                  onClick={() => void refreshHealth()}
                >
                  <RefreshCw size={16} /> Kiểm tra lại
                </button>
                <button
                  className="button-primary !rounded-xl"
                  onClick={exportBackup}
                >
                  <ArrowDownToLine size={16} /> Sao lưu dữ liệu
                </button>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Users}
                label="Tổng đăng ký"
                value={String(leads.length)}
                note={`${statusCounts.new} khách chưa xử lý`}
                tone="blue"
              />
              <MetricCard
                icon={UserRoundCheck}
                label="Khách tiềm năng"
                value={String(statusCounts.qualified)}
                note={
                  leads.length
                    ? `${Math.round((statusCounts.qualified / leads.length) * 100)}% tổng đăng ký`
                    : "Chưa có dữ liệu"
                }
                tone="mint"
              />
              <MetricCard
                icon={PackageCheck}
                label="Gói đang theo dõi"
                value={String(catalog.plans)}
                note={`${catalog.providers} nhà cung cấp`}
                tone="violet"
              />
              <MetricCard
                icon={health === "offline" ? WifiOff : Activity}
                label="Tình trạng dịch vụ"
                value={
                  health === "ready"
                    ? "Sẵn sàng"
                    : health === "checking"
                      ? "Đang kiểm tra"
                      : "Tạm dừng"
                }
                note={
                  lastChecked
                    ? `Kiểm tra lúc ${lastChecked}`
                    : "Đang lấy trạng thái"
                }
                tone={health === "offline" ? "red" : "dark"}
              />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                    Tiến độ xử lý
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Trạng thái khách đăng ký
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {leads.length} mục
                </span>
              </div>
              <div className="mt-7 space-y-5">
                {leadStatuses.map((status) => {
                  const count = statusCounts[status];
                  const width = leads.length
                    ? Math.max(4, (count / leads.length) * 100)
                    : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-600">
                          {statusLabels[status]}
                        </span>
                        <strong>{count}</strong>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${status === "new" ? "bg-blue" : status === "contacted" ? "bg-amber-400" : status === "qualified" ? "bg-emerald-500" : "bg-slate-400"}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-ink p-6 text-white shadow-[0_24px_60px_rgba(8,20,33,.18)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-[.14em] text-mint uppercase">
                    Ưu tiên hôm nay
                  </p>
                  <h2 className="mt-1 text-xl font-black">Việc cần làm tiếp</h2>
                </div>
                <Gauge className="text-mint" />
              </div>
              <div className="mt-6 space-y-3">
                <TaskRow
                  done={statusCounts.new === 0}
                  text={
                    statusCounts.new
                      ? `Liên hệ ${statusCounts.new} khách mới`
                      : "Không còn khách mới chờ xử lý"
                  }
                />
                <TaskRow
                  done={health === "ready"}
                  text={
                    health === "ready"
                      ? "Dịch vụ tư vấn đang sẵn sàng"
                      : "Kiểm tra lại máy HOSTORA"
                  }
                />
                <TaskRow
                  done={catalog.missingRenewal === 0}
                  text={
                    catalog.missingRenewal
                      ? `${catalog.missingRenewal} gói chưa có giá gia hạn`
                      : "Giá gia hạn đã đầy đủ"
                  }
                />
                <TaskRow
                  done={Boolean(requirements)}
                  text={
                    requirements
                      ? "Đã có hồ sơ nhu cầu gần nhất"
                      : "Chưa có hồ sơ nhu cầu trong trình duyệt"
                  }
                />
              </div>
            </div>
          </section>

          <section
            id="khach-hang"
            className="scroll-mt-28 rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                    Quản lý khách hàng
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Danh sách đăng ký tư vấn
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportCsv}
                    disabled={!leads.length}
                    className="button-secondary !rounded-xl disabled:opacity-40"
                  >
                    <FileDown size={16} /> Tải CSV
                  </button>
                  <button
                    onClick={clearLeads}
                    disabled={!leads.length}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-40"
                  >
                    <Trash2 size={16} /> Xóa tất cả
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="relative">
                  <Search
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <span className="sr-only">Tìm khách hàng</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input !rounded-xl !pl-11"
                    placeholder="Tìm theo tên, số điện thoại hoặc gói..."
                  />
                </label>
                <select
                  aria-label="Lọc theo trạng thái"
                  className="input !rounded-xl sm:w-48"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as LeadStatus | "all")
                  }
                >
                  <option value="all">Tất cả trạng thái</option>
                  {leadStatuses.map((status) => (
                    <option value={status} key={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibleLeads.length ? (
              <div className="divide-y divide-slate-100">
                {visibleLeads.map((lead) => (
                  <article
                    key={lead.id}
                    className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.1fr_1fr_.8fr_auto] xl:items-center"
                  >
                    <div>
                      <p className="font-black">{lead.name}</p>
                      <a
                        className="mt-1 flex items-center gap-2 text-sm text-slate-500 hover:text-blue"
                        href={`tel:${lead.phone}`}
                      >
                        <Phone size={14} /> {lead.phone}
                      </a>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(lead.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">
                        Gói quan tâm
                      </p>
                      <p className="mt-1 text-sm font-black text-blue">
                        {lead.plan}
                      </p>
                      {lead.intelligence ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {segmentLabels[lead.intelligence.segment]}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label
                        className="text-xs font-bold text-slate-400"
                        htmlFor={`status-${lead.id}`}
                      >
                        TRẠNG THÁI
                      </label>
                      <select
                        id={`status-${lead.id}`}
                        className={`mt-1 block w-full rounded-xl border-0 px-3 py-2 text-xs font-black ${statusStyles[lead.status]}`}
                        value={lead.status}
                        onChange={(event) =>
                          updateStatus(
                            lead.id,
                            event.target.value as LeadStatus,
                          )
                        }
                      >
                        {leadStatuses.map((status) => (
                          <option value={status} key={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 xl:justify-end">
                      <button
                        title="Không gửi tên hoặc số điện thoại"
                        disabled={classifying === lead.id}
                        onClick={() => void classifyLead(lead)}
                        className="grid size-10 place-items-center rounded-xl bg-violet/10 text-violet disabled:opacity-40"
                        aria-label={`Phân nhóm nhu cầu của ${lead.name}`}
                      >
                        {classifying === lead.id ? (
                          <RefreshCw className="animate-spin" size={17} />
                        ) : (
                          <Sparkles size={17} />
                        )}
                      </button>
                      <button
                        onClick={() => removeLead(lead.id, lead.name)}
                        className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600"
                        aria-label={`Xóa ${lead.name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    {lead.intelligence?.suggestedNextMessage ? (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 xl:col-span-4">
                        <strong className="text-slate-800">
                          Gợi ý liên hệ:
                        </strong>{" "}
                        {lead.intelligence.suggestedNextMessage}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center px-5 text-center">
                <div>
                  <Users className="mx-auto text-slate-300" size={34} />
                  <p className="mt-3 font-black">
                    {leads.length
                      ? "Không tìm thấy khách phù hợp"
                      : "Chưa có đăng ký tư vấn"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Đăng ký mới trên trình duyệt này sẽ xuất hiện tại đây.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section
            id="dich-vu"
            className="grid scroll-mt-28 gap-5 xl:grid-cols-3"
          >
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                    Tình trạng vận hành
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Các chức năng chính
                  </h2>
                </div>
                <button
                  aria-label="Làm mới tình trạng"
                  onClick={() => void refreshHealth()}
                  className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
                >
                  <RefreshCw
                    className={health === "checking" ? "animate-spin" : ""}
                    size={17}
                  />
                </button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ServiceRow
                  icon={MessageSquareText}
                  title="Tư vấn và hỏi đáp"
                  ready={health === "ready"}
                />
                <ServiceRow
                  icon={Bot}
                  title="Hiểu mô tả nhu cầu"
                  ready={health === "ready"}
                />
                <ServiceRow
                  icon={Database}
                  title="Tra cứu tài liệu"
                  ready={health === "ready"}
                />
                <ServiceRow
                  icon={PackageCheck}
                  title="Bảng giá và gợi ý gói"
                  ready
                />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                Nhu cầu gần nhất
              </p>
              <h2 className="mt-1 text-xl font-black">Hồ sơ khách hàng</h2>
              {requirements ? (
                <div className="mt-5 space-y-4 text-sm">
                  <Detail
                    label="Loại website"
                    value={websiteLabels[requirements.websiteType]}
                  />
                  <Detail
                    label="Khách dự kiến"
                    value={`${requirements.monthlyVisits.toLocaleString("vi-VN")}/tháng`}
                  />
                  <Detail
                    label="Ngân sách"
                    value={`${formatVnd(requirements.monthlyBudget)}/tháng`}
                  />
                  <Detail
                    label="Tên miền"
                    value={requirements.needsDomain ? "Cần mua kèm" : "Đã có"}
                  />
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  Chưa có hồ sơ nhu cầu trên trình duyệt này.
                </p>
              )}
            </div>
          </section>

          <section
            id="du-lieu"
            className="grid scroll-mt-28 gap-5 xl:grid-cols-[1fr_.8fr]"
          >
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                    Độ phủ dữ liệu
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Nguồn đang sử dụng
                  </h2>
                </div>
                <ShieldCheck className="text-emerald-600" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <DataCard value={catalog.plans} label="Gói hosting" />
                <DataCard value={catalog.products} label="Sản phẩm liên quan" />
                <DataCard value={catalog.providers} label="Nhà cung cấp" />
                <DataCard
                  value={catalog.missingRenewal}
                  label="Gói chưa rõ giá gia hạn"
                />
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                Dữ liệu gần nhất được đối chiếu ngày{" "}
                {new Date(`${catalog.verifiedAt}T00:00:00`).toLocaleDateString(
                  "vi-VN",
                )}
                . Giá vẫn cần kiểm tra lại trước khi thanh toán.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
                Mối quan tâm
              </p>
              <h2 className="mt-1 text-xl font-black">Gói được chọn nhiều</h2>
              {popularPlans.length ? (
                <div className="mt-5 space-y-3">
                  {popularPlans.map(([plan, count], index) => (
                    <div
                      key={plan}
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                    >
                      <span className="grid size-8 place-items-center rounded-xl bg-white text-xs font-black text-blue">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {plan}
                      </span>
                      <strong className="text-sm">{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">
                  Chưa đủ dữ liệu để xếp hạng.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex gap-4">
              <CircleAlert className="mt-1 shrink-0 text-amber-700" />
              <div>
                <h2 className="font-black text-amber-950">
                  Phạm vi quản trị hiện tại
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Trang này không phải hệ thống nhiều tài khoản. Nó chỉ đọc và
                  cập nhật dữ liệu trong trình duyệt hiện tại; dữ liệu đăng ký
                  trong APK vẫn nằm trên điện thoại. Trước khi dùng công khai
                  cho nhiều nhân viên, cần bổ sung đăng nhập và kho dữ liệu
                  chung có phân quyền.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  note: string;
  tone: "blue" | "mint" | "violet" | "dark" | "red";
}) {
  const tones = {
    blue: "bg-blue/10 text-blue",
    mint: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet/10 text-violet",
    dark: "bg-ink text-mint",
    red: "bg-red-100 text-red-700",
  };
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`grid size-11 place-items-center rounded-2xl ${tones[tone]}`}
      >
        <Icon size={20} />
      </div>
      <p className="mt-5 text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-.03em]">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </article>
  );
}

function TaskRow({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-xl ${done ? "bg-mint text-ink" : "bg-amber-300 text-ink"}`}
      >
        {done ? <CheckCircle2 size={17} /> : <ChevronRight size={17} />}
      </span>
      <span className="text-sm font-semibold text-slate-200">{text}</span>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  title,
  ready,
}: {
  icon: typeof Bot;
  title: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span
        className={`grid size-10 place-items-center rounded-xl ${ready ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">{title}</p>
        <p
          className={`mt-1 text-xs font-bold ${ready ? "text-emerald-700" : "text-red-600"}`}
        >
          {ready ? "Sẵn sàng" : "Cần kiểm tra"}
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function DataCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
