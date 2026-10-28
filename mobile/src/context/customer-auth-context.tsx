import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, deleteJson, getJson, postJson } from "@/lib/api";
import { clearCustomerSessionToken, readCustomerSessionToken, saveCustomerSessionToken } from "@/lib/auth-session";

export type MobileCustomer = { id: string; email: string; name: string; createdAt: string; updatedAt: string };
export type MobileVoucher = { code: string; amountVnd: number; minOrderVnd: number; status: "active" | "redeemed" | "revoked"; expiresAt: string; issuedInvoiceId: string; redeemedInvoiceId: string | null };
export type MobileOrder = { id: string; title: string; amountVnd: number; status: "pending" | "cancel_requested" | "paid" | "refund_requested" | "refund_pending" | "refunded" | "cancelled"; updatedAt: string };
export type MobileSupportCase = { id: string; subject: string; category: "order" | "payment" | "refund" | "website" | "account" | "other"; message: string; status: "new" | "in_progress" | "resolved"; createdAt: string };

type AccountSnapshot = { customer: MobileCustomer | null; vouchers: MobileVoucher[]; orders: MobileOrder[]; supportCases: MobileSupportCase[] };
type CustomerAuthState = AccountSnapshot & {
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  createSupportCase: (input: { subject: string; category: MobileSupportCase["category"]; message: string }) => Promise<MobileSupportCase>;
};

const empty: AccountSnapshot = { customer: null, vouchers: [], orders: [], supportCases: [] };
const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(empty);

  const refresh = useCallback(async () => {
    const token = await readCustomerSessionToken();
    if (!token) { setSnapshot(empty); return; }
    try {
      const next = await getJson<AccountSnapshot>("/api/account/session");
      setSnapshot(next);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await clearCustomerSessionToken();
        setSnapshot(empty);
        return;
      }
      throw cause;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => refresh()).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, [refresh]);

  const authenticate = useCallback(async (path: "login" | "register", body: object) => {
    const result = await postJson<{ customer: MobileCustomer; sessionToken: string }>(`/api/account/${path}`, body);
    if (!result.sessionToken) throw new Error("HOSTORA chưa cấp được phiên đăng nhập.");
    await saveCustomerSessionToken(result.sessionToken);
    await refresh();
  }, [refresh]);

  const value = useMemo<CustomerAuthState>(() => ({
    ...snapshot,
    hydrated,
    login: (email, password) => authenticate("login", { email, password }),
    register: (name, email, password) => authenticate("register", { name, email, password }),
    refresh,
    async logout() {
      try { await deleteJson<{ ok: boolean }>("/api/account/session"); } catch { /* The local token must still be removed. */ }
      await clearCustomerSessionToken();
      setSnapshot(empty);
    },
    async createSupportCase(input) {
      const result = await postJson<{ supportCase: MobileSupportCase }>("/api/account/support", input);
      await refresh();
      return result.supportCase;
    },
  }), [authenticate, hydrated, refresh, snapshot]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const value = useContext(CustomerAuthContext);
  if (!value) throw new Error("useCustomerAuth phải nằm trong CustomerAuthProvider");
  return value;
}
