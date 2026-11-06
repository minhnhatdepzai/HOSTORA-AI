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

export type CustomerPurchaseRequestSummary = {
  productName: string;
  provider: string;
  status: "new" | "invoiced" | "declined" | "cancelled";
  invoiceId: string | null;
  createdAt: string;
  profile: {
    companyName: string;
    businessType: string;
    currentWebsite: string;
    mainOffer: string;
    serviceArea: string;
    seoGoals: string;
    websiteStatus: string;
    websiteGoal: string;
    targetCustomers: string;
    estimatedTraffic: string;
    budgetRange: string;
  };
};

export type CustomerSession = {
  customer: CustomerAccount;
  token: string;
  expiresAt: string;
};

export type CustomerChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources: unknown[];
  createdAt: string;
};

export type AiEscalationReason =
  | "out_of_scope"
  | "insufficient_data"
  | "assistant_unavailable"
  | "human_requested";

export type AiConversationMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "admin";
  content: string;
  sources: unknown[];
  createdAt: string;
};

export type AiConversation = {
  id: string;
  customerId: string | null;
  status: "active" | "escalated" | "answered" | "resolved";
  escalationReason: AiEscalationReason | null;
  createdAt: string;
  updatedAt: string;
  messages: AiConversationMessage[];
};

export type AdminAiConversation = AiConversation & {
  customerName: string;
  customerEmail: string | null;
  isDemonstration: boolean;
};

export type CustomerAiSource = {
  id: string;
  title: string;
  kind: "pdf" | "docx" | "text" | "web" | "image";
  sourceUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerStudioPreferences = {
  style: "editorial" | "bold" | "warm" | "minimal" | null;
  color: string | null;
  writingTone: "friendly" | "premium" | "direct";
  revisionHints: string[];
  needsWorkReasons: Array<
    "visual" | "copy" | "navigation" | "business_fit" | "other"
  >;
  updatedAt: string | null;
};
