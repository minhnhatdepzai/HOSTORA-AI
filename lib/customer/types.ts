export type CustomerAccount = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerVoucher = {
  code: string;
  amountVnd: number;
  minOrderVnd: number;
  status: "active" | "redeemed" | "revoked";
  expiresAt: string;
  issuedInvoiceId: string;
  redeemedInvoiceId: string | null;
};

export type CustomerSupportCase = {
  id: string;
  subject: string;
  category: "order" | "payment" | "refund" | "website" | "account" | "other";
  message: string;
  status: "new" | "in_progress" | "resolved";
  createdAt: string;
};

export type AdminCustomerSupportCase = CustomerSupportCase & {
  customerName: string;
  customerEmail: string;
  updatedAt: string;
};

export type CustomerOrderSummary = {
  id: string;
  title: string;
  amountVnd: number;
  status:
    | "pending"
    | "cancel_requested"
    | "paid"
    | "refund_requested"
    | "refund_pending"
    | "refunded"
    | "cancelled";
  updatedAt: string;
};

export type CustomerSession = {
  customer: CustomerAccount;
  token: string;
  expiresAt: string;
};
