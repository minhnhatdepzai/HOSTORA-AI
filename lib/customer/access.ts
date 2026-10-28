import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CUSTOMER_COOKIE, safeCustomerNextPath } from "@/lib/customer/auth";
import { getCustomerStore } from "@/lib/customer/store";

export async function readCustomerSession() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value ?? "";
  return getCustomerStore().findSession(token);
}

export async function requireCustomerPage(nextPath: string) {
  const customer = await readCustomerSession();
  if (!customer) {
    redirect(
      `/account/login?next=${encodeURIComponent(safeCustomerNextPath(nextPath))}`,
    );
  }
  return customer;
}
