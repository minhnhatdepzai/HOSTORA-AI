export type PaymentMethod = "stripe" | "vnpay";
export type PaymentProvider = PaymentMethod | "demo";

export type ConsultationPreference = "scheduled" | "ai";
export type ConsultationChannel = "email" | "phone" | "video";
export type PurchaseProfile = {
  customerName: string;
  phone: string;
  companyName: string;
  businessType: string;
  currentWebsite: string;
  mainOffer: string;
  serviceArea: string;
  seoGoals: string;
  websiteStatus: "idea" | "building" | "live" | "migrating";
  websiteGoal: string;
  targetCustomers: string;
  estimatedTraffic: "under_1k" | "1k_10k" | "10k_50k" | "over_50k";
  budgetRange: "under_500k" | "500k_1m" | "1m_3m" | "over_3m";
};

export type SaleRequestStatus = "new" | "invoiced" | "declined" | "cancelled";
export type SaleRequest = {
  id: string;
  productId: string;
  provider: string;
  productName: string;
  contact: string;
  note: string;
  profile: PurchaseProfile;
  consultationPreference: ConsultationPreference;
  consultationAt: string | null;
  consultationChannel: ConsultationChannel;
  voucherCode: string | null;
  cancelReason: string | null;
  status: SaleRequestStatus;
  invoiceId: string | null;
  createdAt: string;
};
export type CreatedSaleRequest = SaleRequest & { accessCode: string };
export type SaleRequestPage = {
  items: SaleRequest[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: {
    all: number;
    new: number;
    invoiced: number;
    declined: number;
    cancelled: number;
  };
};
export type InvoiceStatus =
  | "pending"
  | "cancel_requested"
  | "paid"
  | "refund_requested"
  | "refund_pending"
  | "refunded"
  | "cancelled";

export type InvoiceQueue = "all" | "awaiting_payment" | "paid" | "refunds" | "cancelled";
export type InvoiceSort = "createdAt" | "updatedAt" | "amountVnd";
export type InvoiceListQuery = {
  search?: string;
  queue?: InvoiceQueue;
  provider?: PaymentProvider | "unassigned";
  saleType?: Invoice["saleType"];
  createdFrom?: string;
  createdTo?: string;
  sortBy?: InvoiceSort;
  sortDirection?: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type InvoiceQueueCounts = {
  all: number;
  awaitingPayment: number;
  paid: number;
  refunds: number;
  cancelled: number;
};

export type InvoicePage = {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: InvoiceQueueCounts;
  financials: {
    recognizedPaidOrders: number;
    recognizedRevenueVnd: number;
  };
};

export type Invoice = {
  id: string;
  customerEmail: string | null;
  title: string;
  description: string;
  amountVnd: number;
  saleType: "hostora_service" | "partner_service";
  partnerProvider: string | null;
  status: InvoiceStatus;
  provider: PaymentProvider | null;
  providerReference: string | null;
  gatewayCreateDate: string | null;
  gatewayPaymentDate: string | null;
  gatewayTransactionNo: string | null;
  refundReference: string | null;
  refundReason: string | null;
  subtotalVnd: number;
  discountVnd: number;
  voucherCode: string | null;
  earnedVoucherCode: string | null;
  earnedVoucherAmountVnd: number | null;
  earnedVoucherExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedInvoice = Invoice & { accessCode: string };

export type InvoiceEvent = {
  id: string;
  invoiceId: string;
  type: string;
  detail: string;
  createdAt: string;
};
