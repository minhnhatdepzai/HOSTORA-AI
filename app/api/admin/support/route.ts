import { z } from "zod";
import { adminSessionFromRequest, sameOrigin } from "@/lib/payments/admin-auth";
import { getCustomerStore } from "@/lib/customer/store";
import { parseRequestJson } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!adminSessionFromRequest(request))
    return Response.json({ error: "Bạn cần đăng nhập quản trị." }, { status: 401 });
  return Response.json(
    { cases: getCustomerStore().listAllSupportCases() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!adminSessionFromRequest(request))
    return Response.json({ error: "Bạn cần đăng nhập quản trị." }, { status: 401 });
  if (!sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const parsed = await parseRequestJson(
    request,
    z.object({ id: z.string().min(4).max(40), status: z.enum(["new", "in_progress", "resolved"]) }).strict(),
  );
  if (parsed.response) return parsed.response;
  const supportCase = getCustomerStore().updateSupportCaseStatus(parsed.data.id, parsed.data.status);
  if (!supportCase)
    return Response.json({ error: "Không tìm thấy yêu cầu hỗ trợ." }, { status: 404 });
  return Response.json({ supportCase }, { headers: { "cache-control": "no-store" } });
}
