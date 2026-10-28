import { beforeAll, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/admin/payments/login/route";
import {
  GET as listAdminProducts,
  POST as createAdminProduct,
} from "@/app/api/admin/catalog/products/route";
import {
  DELETE as archiveAdminProduct,
  PATCH as updateAdminProduct,
} from "@/app/api/admin/catalog/products/[id]/route";
import { GET as listPublicProducts } from "@/app/api/products/route";

const origin = "http://127.0.0.1:3000";

function jsonRequest(path: string, body: unknown, cookie = "", method = "POST") {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      origin,
      host: "127.0.0.1:3000",
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeAll(() => {
  process.env.HOSTORA_CATALOG_DB_PATH = ":memory:";
  process.env.HOSTORA_ADMIN_PASSWORD = "test-admin-password-long-enough";
  process.env.HOSTORA_ADMIN_SESSION_SECRET = "test-admin-session-secret-long-enough";
});

describe("API quản lý dịch vụ", () => {
  it("chặn người chưa đăng nhập khỏi danh mục quản trị", async () => {
    const response = await listAdminProducts(
      new Request(`${origin}/api/admin/catalog/products`),
    );
    expect(response.status).toBe(401);
  });

  it("thêm, xuất bản, sửa giá và lưu trữ trên cùng API web/app", async () => {
    const session = await login(
      jsonRequest("/api/admin/payments/login", {
        password: "test-admin-password-long-enough",
      }),
    );
    const cookie = session.headers.get("set-cookie")?.split(";")[0] ?? "";
    const id = "hostora-route-care";

    const created = await createAdminProduct(
      jsonRequest(
        "/api/admin/catalog/products",
        {
          id,
          provider: "HOSTORA",
          name: "Chăm sóc website theo tháng",
          category: "monitoring",
          priceFromVnd: 390_000,
          billingUnit: "month",
          summary: "Theo dõi hoạt động, sao lưu và hỗ trợ xử lý lỗi định kỳ.",
          bestFor: ["doanh nghiệp nhỏ"],
          sourceUrl: "https://hostora.example/services/monthly-care",
          verifiedAt: "2026-10-28",
          status: "draft",
        },
        cookie,
      ),
    );
    expect(created.status).toBe(201);

    const beforePublish = await listPublicProducts(
      new Request(`${origin}/api/products`),
    );
    const beforeBody = (await beforePublish.json()) as {
      products: Array<{ id: string }>;
    };
    expect(beforeBody.products.some((product) => product.id === id)).toBe(false);

    const updated = await updateAdminProduct(
      jsonRequest(
        `/api/admin/catalog/products/${id}`,
        { status: "published", priceFromVnd: 490_000 },
        cookie,
        "PATCH",
      ),
      { params: Promise.resolve({ id }) },
    );
    expect(updated.status).toBe(200);

    const afterPublish = await listPublicProducts(
      new Request(`${origin}/api/products?q=ch%C4%83m+s%C3%B3c`),
    );
    const afterBody = (await afterPublish.json()) as {
      products: Array<{ id: string; priceFromVnd: number }>;
    };
    expect(afterBody.products).toContainEqual(
      expect.objectContaining({ id, priceFromVnd: 490_000 }),
    );

    const archived = await archiveAdminProduct(
      jsonRequest(
        `/api/admin/catalog/products/${id}`,
        {},
        cookie,
        "DELETE",
      ),
      { params: Promise.resolve({ id }) },
    );
    expect(archived.status).toBe(200);

    const afterArchive = await listPublicProducts(
      new Request(`${origin}/api/products`),
    );
    const archiveBody = (await afterArchive.json()) as {
      products: Array<{ id: string }>;
    };
    expect(archiveBody.products.some((product) => product.id === id)).toBe(false);
  });
});
