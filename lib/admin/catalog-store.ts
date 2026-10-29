import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  productCatalog,
  type ProductCategory,
  type ProductOffering,
} from "@/data/product-catalog";

const categories = ["hosting", "wordpress", "vps", "cloud", "domain", "email", "ssl", "automation", "workspace", "backup", "monitoring", "security"] as const;
const billingUnits = ["month", "year", "usage", "contact"] as const;
const statuses = ["draft", "published", "archived"] as const;

export const adminProductSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  provider: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(160),
  category: z.enum(categories),
  priceFromVnd: z.number().int().min(0).max(1_000_000_000).nullable(),
  billingUnit: z.enum(billingUnits),
  summary: z.string().trim().min(10).max(500),
  bestFor: z.array(z.string().trim().min(2).max(100)).min(1).max(12),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Nguồn phải dùng HTTPS."),
  verifiedAt: z.iso.date(),
  priceNote: z.string().trim().max(500).optional(),
  status: z.enum(statuses).default("published"),
});
export const productPatchSchema = adminProductSchema.omit({ id: true }).partial().refine((value) => Object.keys(value).length > 0);

export type AdminProduct = ProductOffering & {
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};

type ProductRow = {
  id: string; provider: string; name: string; category: ProductCategory;
  price_from_vnd: number | null; billing_unit: ProductOffering["billingUnit"];
  summary: string; best_for_json: string; source_url: string; verified_at: string;
  price_note: string | null; status: AdminProduct["status"];
  created_at: string; updated_at: string;
};

function toProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id, provider: row.provider, name: row.name, category: row.category,
    priceFromVnd: row.price_from_vnd, billingUnit: row.billing_unit,
    summary: row.summary, bestFor: JSON.parse(row.best_for_json) as string[],
    sourceUrl: row.source_url, verifiedAt: row.verified_at,
    ...(row.price_note ? { priceNote: row.price_note } : {}),
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function toPublicProduct(product: AdminProduct): ProductOffering {
  const { status, createdAt, updatedAt, ...publicProduct } = product;
  void status;
  void createdAt;
  void updatedAt;
  return publicProduct;
}

export class CatalogStore {
  private readonly db: DatabaseSync;

  constructor(filename = path.join(process.cwd(), "data", "runtime", "hostora.sqlite"), seed: ProductOffering[] = productCatalog) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS catalog_products (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_from_vnd INTEGER,
        billing_unit TEXT NOT NULL,
        summary TEXT NOT NULL,
        best_for_json TEXT NOT NULL,
        source_url TEXT NOT NULL,
        verified_at TEXT NOT NULL,
        price_note TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS catalog_products_status_updated ON catalog_products(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS catalog_products_category_name ON catalog_products(category, name);
    `);
    this.seedProducts(seed);
  }

  close() { this.db.close(); }

  seedProducts(products: ProductOffering[]) {
    const insert = this.db.prepare(`INSERT OR IGNORE INTO catalog_products
      (id, provider, name, category, price_from_vnd, billing_unit, summary, best_for_json, source_url, verified_at, price_note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`);
    const now = new Date().toISOString();
    for (const product of products) {
      const value = adminProductSchema.parse({ ...product, status: "published" });
      insert.run(value.id, value.provider, value.name, value.category, value.priceFromVnd, value.billingUnit, value.summary, JSON.stringify(value.bestFor), value.sourceUrl, value.verifiedAt, value.priceNote ?? null, now, now);
    }
  }

  listAdminProducts(): AdminProduct[] {
    return (this.db.prepare("SELECT * FROM catalog_products ORDER BY updated_at DESC, name").all() as ProductRow[]).map(toProduct);
  }

  listPublishedProducts(): ProductOffering[] {
    return (this.db.prepare("SELECT * FROM catalog_products WHERE status = 'published' ORDER BY name").all() as ProductRow[])
      .map(toProduct)
      .map(toPublicProduct);
  }

  getPublishedProduct(id: string): ProductOffering | null {
    const row = this.db.prepare("SELECT * FROM catalog_products WHERE id = ? AND status = 'published'").get(id) as ProductRow | undefined;
    return row ? toPublicProduct(toProduct(row)) : null;
  }

  createProduct(input: z.input<typeof adminProductSchema>): AdminProduct {
    const value = adminProductSchema.parse(input);
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO catalog_products
      (id, provider, name, category, price_from_vnd, billing_unit, summary, best_for_json, source_url, verified_at, price_note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(value.id, value.provider, value.name, value.category, value.priceFromVnd, value.billingUnit, value.summary, JSON.stringify(value.bestFor), value.sourceUrl, value.verifiedAt, value.priceNote ?? null, value.status, now, now);
    return this.getProduct(value.id)!;
  }

  getProduct(id: string): AdminProduct | null {
    const row = this.db.prepare("SELECT * FROM catalog_products WHERE id = ?").get(id) as ProductRow | undefined;
    return row ? toProduct(row) : null;
  }

  updateProduct(id: string, input: z.input<typeof productPatchSchema>): AdminProduct {
    const current = this.getProduct(id);
    if (!current) throw new Error("Không tìm thấy dịch vụ.");
    const patch = productPatchSchema.parse(input);
    const value = adminProductSchema.parse({ ...current, ...patch, id });
    this.db.prepare(`UPDATE catalog_products SET provider=?, name=?, category=?, price_from_vnd=?, billing_unit=?, summary=?, best_for_json=?, source_url=?, verified_at=?, price_note=?, status=?, updated_at=? WHERE id=?`)
      .run(value.provider, value.name, value.category, value.priceFromVnd, value.billingUnit, value.summary, JSON.stringify(value.bestFor), value.sourceUrl, value.verifiedAt, value.priceNote ?? null, value.status, new Date().toISOString(), id);
    return this.getProduct(id)!;
  }

  archiveProduct(id: string) { return this.updateProduct(id, { status: "archived" }); }
}

let defaultStore: CatalogStore | undefined;
export function getCatalogStore() {
  return (defaultStore ??= new CatalogStore(process.env.HOSTORA_CATALOG_DB_PATH));
}
