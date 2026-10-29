import { customerFromRequest } from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";
import { normalizeChatMemory } from "@/lib/chat-memory";

export async function GET(request: Request) {
  const customer = customerFromRequest(request);
  if (!customer)
    return Response.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const store = getCustomerStore();
  return Response.json(
    {
      memory: normalizeChatMemory(store.getAiMemory(customer.id)),
      studio: store.getStudioPreferences(customer.id),
      sourceCount: store.listAiSources(customer.id).length,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
