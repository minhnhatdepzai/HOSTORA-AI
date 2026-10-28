import { expect, type BrowserContext } from "@playwright/test";
import { ADMIN_COOKIE, adminConfigFromEnv, issueAdminEmailSession } from "../../../lib/payments/admin-auth";

// Uses the same signed session as email verification; never disables production auth.
// This fixture tests post-login behavior. Email delivery is tested separately.
export async function authenticateAdmin(context: BrowserContext, baseURL: string) {
  try { process.loadEnvFile(".env.local"); } catch { /* CI supplies its own test secret. */ }
  const token = issueAdminEmailSession(adminConfigFromEnv());
  expect(token, "Configure HOSTORA_ADMIN_SESSION_SECRET for the isolated E2E server").toBeTruthy();
  await context.addCookies([{ name: ADMIN_COOKIE, value: token!, url: baseURL, httpOnly: true, sameSite: "Strict" }]);
}
