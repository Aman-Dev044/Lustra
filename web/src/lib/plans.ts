import type { PlanId } from "./types";

export type Feature =
  | "online_booking"
  | "lead_forms"
  | "followups"
  | "documents"
  | "marketplace"
  | "quickbooks"
  | "profit_analytics"
  | "quote_copilot"
  | "customer_portal"
  | "memberships"
  | "video_inspections"
  | "automations"
  | "payment_reminders"
  | "commissions"
  | "line_item_scheduling"
  | "capacity_planner"
  | "multi_location"
  | "campaigns"
  | "reviews"
  | "ai_insights"
  | "api_access";

const PRO: Feature[] = [
  "online_booking",
  "lead_forms",
  "followups",
  "documents",
  "marketplace",
  "quickbooks",
  "profit_analytics",
  "quote_copilot",
  "customer_portal",
  "campaigns",
  "reviews",
  "ai_insights",
];
const ENTERPRISE: Feature[] = [
  ...PRO,
  "memberships",
  "video_inspections",
  "automations",
  "payment_reminders",
  "commissions",
  "line_item_scheduling",
  "capacity_planner",
  "multi_location",
  "api_access",
];

export const planFeatures: Record<PlanId, Feature[]> = {
  express: [],
  pro: PRO,
  enterprise: ENTERPRISE,
};

export const hasFeature = (plan: PlanId | undefined, feature: Feature) =>
  !!plan && planFeatures[plan].includes(feature);

export const requiredPlanFor = (feature: Feature): PlanId => (PRO.includes(feature) ? "pro" : "enterprise");

export const featureLabels: Record<Feature, string> = {
  online_booking: "Online booking",
  lead_forms: "Custom lead forms",
  followups: "Long-term follow-ups",
  documents: "Document storage",
  marketplace: "Marketplace",
  quickbooks: "QuickBooks sync",
  profit_analytics: "Profit analytics",
  quote_copilot: "AI Quote Copilot",
  customer_portal: "Live customer portal",
  memberships: "Memberships & recurring billing",
  video_inspections: "Video inspections",
  automations: "Workflow automations",
  payment_reminders: "Automated payment reminders",
  commissions: "Commission tracking",
  line_item_scheduling: "Line-item scheduling",
  capacity_planner: "Bay capacity planner",
  multi_location: "Multi-location",
  campaigns: "Smart campaigns",
  reviews: "Reputation hub",
  ai_insights: "AI Insights",
  api_access: "API keys, webhooks & Zapier",
};

export interface PricingPlan {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  tagline: string;
  highlight?: boolean;
  inherits?: string;
  features: string[];
}

/** Public pricing — identical price points to the market leader, far more inside. */
export const pricingPlans: PricingPlan[] = [
  {
    id: "express",
    name: "Express",
    monthly: 70,
    yearly: 840,
    tagline: "Everything a solo detailer or mobile operator needs to run tight.",
    features: [
      "Unlimited users",
      "Live job board & drag-and-drop calendar",
      "Quotes, invoices & text-to-pay",
      "Automated reminder messages",
      "Photo inspections with damage pins",
      "Digital warranty certificates + QR verify",
      "Inventory tracking",
      "Stripe & Square payments",
      "Time clock & job assignment",
      "Command palette & global search",
      "Mobile routing & on-my-way texts",
      "Coupons & e-gift cards",
      "Recurring jobs, time off & meetings",
      "CSV import & export",
      "Cloud storage & live chat support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 110,
    yearly: 1320,
    tagline: "For growing shops that want leads booked and quoted on autopilot.",
    highlight: true,
    inherits: "Everything in Express, plus",
    features: [
      "AI Quote Copilot",
      "Online booking with real-time availability",
      "Live customer portal (track, approve, pay)",
      "Custom lead forms",
      "Long-term follow-up messaging",
      "Document upload & storage",
      "QuickBooks Online sync",
      "Profit analytics",
      "AI Insights: forecast & churn radar",
      "Smart-segment SMS & email campaigns",
      "Reputation hub with AI review replies",
      "Supplier marketplace with 2% cashback",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 183,
    yearly: 2200,
    tagline: "Multi-bay and multi-location operations with full automation.",
    inherits: "Everything in Pro, plus",
    features: [
      "Visual workflow automation builder",
      "Memberships & recurring billing",
      "HD video inspections",
      "Line-item scheduling",
      "Bay capacity planner",
      "Commission tracking",
      "Automated payment reminders",
      "Multi-location management",
      "Developer API, signed webhooks & Zapier",
      "1:1 account executive",
      "Pro User Group access",
    ],
  },
];

export const visualizerAddOn = {
  name: "3D Visualizer",
  monthly: 150,
  description: "Interactive 3D configurator for PPF, wrap and tint — embedded on your site and inside every quote.",
};
