export type WebsiteType = "store" | "company" | "blog";

export interface Requirements {
  websiteType: WebsiteType;
  monthlyVisits: number;
  monthlyBudget: number;
  upfrontBudget?: number;
  needsDomain: boolean;
  ecommerce: boolean;
  notes?: string;
}

export interface HostingPlan {
  id: string;
  provider: string;
  name: string;
  hostingType: "shared" | "cloud" | "vps";
  promoMonthlyVnd: number;
  renewalMonthlyVnd: number | null;
  billingMonths: number;
  storageGb: number;
  storageType: string;
  cpuCores?: number;
  ramGb?: number;
  productFamily?: string;
  controlPanel?: string | null;
  bandwidth: string | null;
  websites: string;
  ssl: boolean | null;
  backup: "weekly" | "daily" | "daily-on-demand" | null;
  cdn: boolean | null;
  domainIncluded: boolean;
  ecommerce: boolean;
  managed: boolean;
  sourceUrl: string;
  verifiedAt: string;
  limitations: string[];
}

export interface RecommendationScore {
  eligibility: "eligible" | "over-budget" | "unverified" | "unsupported";
  upfrontVnd: number;
  upfrontConfirmed: boolean;
  plan: HostingPlan;
  total: number;
  breakdown: Record<
    | "budget"
    | "resources"
    | "ecommerce"
    | "ownership"
    | "scalability"
    | "resilience"
    | "usability"
    | "domain",
    number
  >;
  reasons: string[];
  cautions: string[];
}
