"use client";

import {
  Archive,
  Check,
  CirclePlus,
  PencilLine,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/admin/catalog-store";
import {
  buildCatalogPayload,
  catalogBillingUnits,
  catalogCategories,
  catalogDraftErrors,
  type CatalogDraft,
} from "@/lib/admin/catalog-form";
import { formatVnd } from "@/lib/utils";

const categoryLabels: Record<(typeof catalogCategories)[number], string> = {
  hosting: "Lưu trữ web",
  wordpress: "WordPress",
  vps: "Máy chủ ảo",
  cloud: "Đám mây",
  domain: "Tên miền",
  email: "Email",
  ssl: "Chứng chỉ bảo mật",
  automation: "Tự động hóa",
  workspace: "Không gian làm việc",
  backup: "Sao lưu",
  monitoring: "Theo dõi",
  security: "Bảo mật",
};

const billingLabels: Record<(typeof catalogBillingUnits)[number], string> = {
  month: "mỗi tháng",
  year: "mỗi năm",
  usage: "theo mức dùng",
  contact: "xác nhận sau",
};

const statusLabels = {
  draft: "Bản nháp",
  published: "Đang hiển thị",
  archived: "Đã lưu trữ",
} as const;

function blankDraft(): CatalogDraft {
  return {
    id: "",
    provider: "HOSTORA",
    name: "",
    category: "hosting",
    priceFromVnd: "",
    billingUnit: "month",
    summary: "",
    bestFor: "",
    sourceUrl: "https://",
    verifiedAt: new Date().toISOString().slice(0, 10),
    priceNote: "",
    status: "draft",
  };
}

function productDraft(product: AdminProduct): CatalogDraft {
  return {
    id: product.id,
    provider: product.provider,
    name: product.name,
    category: product.category,
    priceFromVnd:
      product.priceFromVnd === null ? "" : String(product.priceFromVnd),
    billingUnit: product.billingUnit,
    summary: product.summary,
    bestFor: product.bestFor.join(", "),
    sourceUrl: product.sourceUrl,
    verifiedAt: product.verifiedAt,
    priceNote: product.priceNote ?? "",
    status: product.status,
  };
}

export function AdminServiceManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AdminProduct["status"]>("all");
  const [draft, setDraft] = useState<CatalogDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/catalog/products", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        products?: AdminProduct[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Không thể tải dịch vụ.");
      setProducts(body.products ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tải dịch vụ.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return products.filter(
      (product) =>
        (status === "all" || product.status === status) &&
        (!normalized ||
          `${product.name} ${product.provider} ${product.category} ${product.summary}`
            .toLocaleLowerCase("vi")
            .includes(normalized)),
    );
  }, [products, query, status]);

  const errors = draft && showErrors ? catalogDraftErrors(draft) : {};

  function updateDraft<Key extends keyof CatalogDraft>(
    key: Key,
    value: CatalogDraft[Key],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function openCreate() {
    setEditingId(null);
    setDraft(blankDraft());
    setShowErrors(false);
    setError("");
  }

  function openEdit(product: AdminProduct) {
    setEditingId(product.id);
    setDraft(productDraft(product));
    setShowErrors(false);
    setError("");
  }

  async function saveProduct() {
    if (!draft) return;
    setShowErrors(true);
    const fieldErrors = catalogDraftErrors(draft);
    if (Object.keys(fieldErrors).length) {
      setError("Kiểm tra lại những trường được đánh dấu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildCatalogPayload(draft);
      const response = await fetch(
        editingId
          ? `/api/admin/catalog/products/${encodeURIComponent(editingId)}`
          : "/api/admin/catalog/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as AdminProduct & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Không thể lưu dịch vụ.");
      setProducts((current) => {
        const withoutSaved = current.filter((item) => item.id !== body.id);
        return [body, ...withoutSaved];
      });
      setDraft(null);
      setNotice(
        editingId ? "Đã lưu thay đổi dịch vụ." : "Đã thêm dịch vụ mới.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể lưu dịch vụ.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setProductStatus(
    product: AdminProduct,
    nextStatus: "published" | "archived",
  ) {
    if (
      nextStatus === "archived" &&
      !window.confirm(
        `Lưu trữ “${product.name}”? Dịch vụ sẽ không còn xuất hiện với khách hàng.`,
      )
    ) {
      return;
    }
    setError("");
    try {
      const response = await fetch(
        `/api/admin/catalog/products/${encodeURIComponent(product.id)}`,
        nextStatus === "archived"
          ? { method: "DELETE" }
          : {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: "published" }),
            },
      );
      const body = (await response.json()) as AdminProduct & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Không thể đổi trạng thái.");
      setProducts((current) =>
        current.map((item) => (item.id === body.id ? body : item)),
      );
      setNotice(
        nextStatus === "published"
          ? "Dịch vụ đã xuất hiện trên website và ứng dụng."
          : "Đã lưu trữ dịch vụ; dữ liệu vẫn có thể khôi phục.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể đổi trạng thái.",
      );
    }
  }

  return (
    <section
      id="dich-vu"
      data-testid="service-manager"
      className="scroll-mt-28 overflow-hidden border border-[#d7e2de] bg-white"
    >
      <header className="flex flex-col gap-5 border-b border-[#d7e2de] p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black tracking-[.14em] text-blue uppercase">
            Danh mục dùng chung
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.03em]">
            Dịch vụ trên website và ứng dụng
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Chỉ mục “Đang hiển thị” mới đến khách hàng. Giá, tên và mô tả được
            đọc từ cùng một kho dữ liệu.
          </p>
        </div>
        <button className="button-primary self-start" onClick={openCreate}>
          <CirclePlus size={17} /> Thêm dịch vụ
        </button>
      </header>

      <div className="grid gap-3 border-b border-[#e7ece9] bg-[#fafbf9] p-4 sm:grid-cols-[1fr_200px_auto] sm:p-5">
        <label className="relative">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <span className="sr-only">Tìm dịch vụ</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input !rounded-lg !pl-10"
            placeholder="Tìm tên, đơn vị hoặc mô tả..."
          />
        </label>
        <select
          className="input !rounded-lg"
          aria-label="Lọc trạng thái dịch vụ"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as typeof status)
          }
        >
          <option value="all">Mọi trạng thái</option>
          <option value="published">Đang hiển thị</option>
          <option value="draft">Bản nháp</option>
          <option value="archived">Đã lưu trữ</option>
        </select>
        <button
          className="button-secondary !rounded-lg"
          onClick={() => void loadProducts()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          Làm mới
        </button>
      </div>

      {notice ? (
        <div
          className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900"
          role="status"
        >
          <span className="flex items-center gap-2">
            <Check size={16} /> {notice}
          </span>
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      ) : null}
      {error && !draft ? (
        <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid min-h-52 place-items-center text-sm font-semibold text-slate-500">
          <span className="flex items-center gap-2">
            <RefreshCw className="animate-spin" size={17} /> Đang tải dịch vụ
          </span>
        </div>
      ) : visibleProducts.length ? (
        <div className="divide-y divide-[#e7ece9]">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="grid gap-4 p-5 transition-colors hover:bg-[#fafbf9] lg:grid-cols-[1.15fr_.65fr_.75fr_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{product.name}</h3>
                  <StatusBadge status={product.status} />
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {product.provider} · {categoryLabels[product.category]}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {product.summary}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Giá từ
                </p>
                <p className="mt-1 font-black">
                  {product.priceFromVnd === null
                    ? "Cần xác nhận"
                    : formatVnd(product.priceFromVnd)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {billingLabels[product.billingUnit]}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Kiểm tra giá
                </p>
                <p className="mt-1 text-sm font-bold">
                  {new Date(`${product.verifiedAt}T00:00:00`).toLocaleDateString(
                    "vi-VN",
                  )}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  Mã: {product.id}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  className="button-secondary !rounded-lg !px-3 !py-2"
                  onClick={() => openEdit(product)}
                >
                  <PencilLine size={15} /> Sửa
                </button>
                {product.status !== "published" ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                    onClick={() => void setProductStatus(product, "published")}
                  >
                    <Send size={15} /> Xuất bản
                  </button>
                ) : null}
                {product.status !== "archived" ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void setProductStatus(product, "archived")}
                  >
                    <Archive size={15} /> Lưu trữ
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center px-6 text-center">
          <div>
            <Search className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 font-black">Không có dịch vụ phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">
              Thử đổi từ khóa hoặc trạng thái đang lọc.
            </p>
          </div>
        </div>
      )}

      {draft ? (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-ink/55"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDraft(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
            className="h-full w-full max-w-2xl overflow-y-auto bg-[#f8faf8] shadow-[-20px_0_70px_rgba(8,20,33,.25)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d7e2de] bg-[#f8faf8]/95 px-5 py-4 backdrop-blur-lg sm:px-7">
              <div>
                <p className="text-xs font-black tracking-[.13em] text-blue uppercase">
                  {editingId ? "Chỉnh sửa" : "Dịch vụ mới"}
                </p>
                <h2 id="service-form-title" className="text-xl font-black">
                  {editingId ? draft.name : "Thêm vào danh mục"}
                </h2>
              </div>
              <button
                className="grid size-11 place-items-center rounded-lg border border-slate-200 bg-white"
                onClick={() => setDraft(null)}
                aria-label="Đóng biểu mẫu"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {error ? (
                <p className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mã dịch vụ" error={errors.id}>
                  <input
                    className="input !rounded-lg"
                    value={draft.id}
                    disabled={Boolean(editingId)}
                    onChange={(event) => updateDraft("id", event.target.value)}
                    placeholder="hostora-care-pro"
                  />
                </Field>
                <Field label="Đơn vị cung cấp" error={errors.provider}>
                  <input
                    className="input !rounded-lg"
                    value={draft.provider}
                    onChange={(event) =>
                      updateDraft("provider", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Tên dịch vụ" error={errors.name}>
                <input
                  className="input !rounded-lg"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Tên khách hàng sẽ nhìn thấy"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nhóm dịch vụ" error={errors.category}>
                  <select
                    className="input !rounded-lg"
                    value={draft.category}
                    onChange={(event) =>
                      updateDraft(
                        "category",
                        event.target.value as CatalogDraft["category"],
                      )
                    }
                  >
                    {catalogCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Trạng thái" error={errors.status}>
                  <select
                    className="input !rounded-lg"
                    value={draft.status}
                    onChange={(event) =>
                      updateDraft(
                        "status",
                        event.target.value as CatalogDraft["status"],
                      )
                    }
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đang hiển thị</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Giá từ (đồng)" error={errors.priceFromVnd}>
                  <input
                    className="input !rounded-lg"
                    inputMode="numeric"
                    value={draft.priceFromVnd}
                    onChange={(event) =>
                      updateDraft("priceFromVnd", event.target.value)
                    }
                    placeholder="Để trống nếu cần xác nhận"
                  />
                </Field>
                <Field label="Cách tính giá" error={errors.billingUnit}>
                  <select
                    className="input !rounded-lg"
                    value={draft.billingUnit}
                    onChange={(event) =>
                      updateDraft(
                        "billingUnit",
                        event.target.value as CatalogDraft["billingUnit"],
                      )
                    }
                  >
                    {catalogBillingUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {billingLabels[unit]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Mô tả cho khách hàng" error={errors.summary}>
                <textarea
                  className="input min-h-28 !rounded-lg"
                  value={draft.summary}
                  onChange={(event) => updateDraft("summary", event.target.value)}
                />
              </Field>
              <Field
                label="Phù hợp với (ngăn cách bằng dấu phẩy)"
                error={errors.bestFor}
              >
                <input
                  className="input !rounded-lg"
                  value={draft.bestFor}
                  onChange={(event) => updateDraft("bestFor", event.target.value)}
                  placeholder="doanh nghiệp nhỏ, cửa hàng trực tuyến"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <Field label="Nguồn xác minh giá" error={errors.sourceUrl}>
                  <input
                    className="input !rounded-lg"
                    type="url"
                    value={draft.sourceUrl}
                    onChange={(event) =>
                      updateDraft("sourceUrl", event.target.value)
                    }
                  />
                </Field>
                <Field label="Ngày xác minh" error={errors.verifiedAt}>
                  <input
                    className="input !rounded-lg"
                    type="date"
                    value={draft.verifiedAt}
                    onChange={(event) =>
                      updateDraft("verifiedAt", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Ghi chú về giá" error={errors.priceNote}>
                <textarea
                  className="input min-h-20 !rounded-lg"
                  value={draft.priceNote}
                  onChange={(event) =>
                    updateDraft("priceNote", event.target.value)
                  }
                  placeholder="Điều kiện kỳ hạn, thuế hoặc phạm vi dịch vụ"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#d7e2de] bg-white p-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                className="button-secondary justify-center !rounded-lg"
                onClick={() => setDraft(null)}
              >
                Hủy
              </button>
              <button
                className="button-primary justify-center !rounded-lg"
                onClick={() => void saveProduct()}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                {editingId ? "Lưu thay đổi" : "Thêm dịch vụ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: AdminProduct["status"] }) {
  const styles = {
    draft: "border-amber-200 bg-amber-50 text-amber-800",
    published: "border-emerald-200 bg-emerald-50 text-emerald-800",
    archived: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black tracking-[.04em] text-slate-600 uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
