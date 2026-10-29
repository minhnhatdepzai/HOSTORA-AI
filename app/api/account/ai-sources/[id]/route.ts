import {
  customerFromRequest,
  requestUsesBearer,
} from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { sameOrigin } from "@/lib/payments/admin-auth";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (!requestUsesBearer(request) && !sameOrigin(request))
    return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ error: "Mã nguồn không hợp lệ." }, { status: 400 });
  const deleted = getCustomerStore().deleteAiSource(customer.id, id);
  return deleted
    ? Response.json({ deleted: true }, { headers: { "cache-control": "no-store" } })
    : Response.json({ error: "Không tìm thấy nguồn." }, { status: 404 });
}
