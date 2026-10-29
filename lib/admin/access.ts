import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  adminConfigFromEnv,
  safeAdminNextPath,
  verifyAdminSession,
} from "@/lib/payments/admin-auth";

export async function readAdminSessionCookie() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  return verifyAdminSession(token, adminConfigFromEnv());
}

export async function requireAdminPage(nextPath: string) {
  if (await readAdminSessionCookie()) return;
  const safeNext = safeAdminNextPath(nextPath);
  redirect(`/admin/login?next=${encodeURIComponent(safeNext)}`);
}
