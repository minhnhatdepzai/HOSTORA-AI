import {
  clearedCustomerSessionCookie,
  customerFromRequest,
  sessionTokenFromRequest,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";
import { listStudioProjectsForCustomer } from "@/lib/site-studio-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json(
      { authenticated: false },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  const store = getCustomerStore();
  const projects = await listStudioProjectsForCustomer(customer.id);
  return Response.json(
    {
      authenticated: true,
      customer,
      vouchers: store.listVouchers(customer.email),
      orders: store.listOrders(customer.email),
      purchaseRequests: store.listPurchaseRequests(customer.email),
      studioProjects: projects.map((project) => ({
        id: project.id,
        brand: project.idea.brand,
        headline: project.brief.headline,
        goal: project.idea.goal,
        generationMode: project.generationMode,
        updatedAt: project.updatedAt,
        url: `/website-studio/p/${project.id}`,
      })),
      chat: store.chatSummary(customer.id),
      supportCases: store.listSupportCases(customer.id),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const bearer = request.headers.get("authorization")?.startsWith("Bearer ");
  if (!bearer && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  getCustomerStore().deleteSession(sessionTokenFromRequest(request));
  const response = Response.json(
    { ok: true },
    { headers: { "cache-control": "no-store" } },
  );
  response.headers.set(
    "set-cookie",
    clearedCustomerSessionCookie(new URL(request.url).protocol === "https:"),
  );
  return response;
}
