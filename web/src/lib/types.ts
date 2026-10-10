/* Shared client-side types mirroring the server contract in ARCHITECTURE.md. */

export type ID = string;
export type ISODate = string;

export type Industry =
  | "detailing"
  | "ceramic"
  | "ppf"
  | "tint"
  | "wrap"
  | "marine"
  | "landscaping"
  | "lawn-care"
  | "flat-glass"
  | "mobile";

export type PlanId = "express" | "pro" | "enterprise";
export type Role = "owner" | "admin" | "manager" | "technician";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkingHours {
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface Shop {
  _id: ID;
  name: string;
  slug: string;
  industry: Industry;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  timezone: string;
  currency: string;
  taxRate: number;
  logoUrl?: string;
  brandColor: string;
  plan: PlanId;
  planInterval: "monthly" | "yearly";
  addOns: { visualizer: boolean };
  trialEndsAt?: ISODate;
  booking: {
    enabled: boolean;
    headline?: string;
    leadTimeHours: number;
    slotMinutes: number;
    bays: number;
    requireDeposit: boolean;
    depositPercent: number;
    workingHours: WorkingHours[];
  };
  locations: { _id: ID; name: string; address?: string }[];
  loyalty: { enabled: boolean; pointsPerDollar: number; redeemValue: number };
  onboarding?: { completedSteps: string[] };
  depot?: { address?: string; lat?: number; lng?: number };
  credits?: number;
  createdAt: ISODate;
}

export interface User {
  _id: ID;
  shop: ID;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarColor?: string;
  hourlyRate: number;
  commissionPercent: number;
  active: boolean;
  lastLoginAt?: ISODate;
}

export type CustomerSource =
  | "website"
  | "referral"
  | "google"
  | "instagram"
  | "facebook"
  | "walk-in"
  | "booking"
  | "repeat"
  | "other";

export interface Customer {
  _id: ID;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  tags: string[];
  source: CustomerSource;
  notes?: string;
  loyaltyPoints: number;
  lifetimeValue: number;
  visits: number;
  marketingOptIn: boolean;
  lastVisitAt?: ISODate;
  createdAt: ISODate;
}

export type VehicleType = "car" | "truck" | "suv" | "van" | "motorcycle" | "boat" | "rv" | "other";
export type VehicleSize = "small" | "medium" | "large" | "xl";

export interface Vehicle {
  _id: ID;
  customer: ID | Customer;
  type: VehicleType;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  color?: string;
  vin?: string;
  plate?: string;
  size: VehicleSize;
  notes?: string;
}

export type ServiceCategory =
  | "detailing"
  | "ceramic"
  | "ppf"
  | "tint"
  | "wrap"
  | "correction"
  | "interior"
  | "marine"
  | "lawn"
  | "maintenance"
  | "other";

export interface Service {
  _id: ID;
  name: string;
  category: ServiceCategory;
  description?: string;
  basePrice: number;
  durationMinutes: number;
  sizeMultipliers: Record<VehicleSize, number>;
  keywords: string[];
  active: boolean;
  bookable: boolean;
  color?: string;
}

export interface LineItem {
  _id?: ID;
  service?: ID | Service | null;
  name: string;
  description?: string;
  category?: ServiceCategory;
  qty: number;
  unitPrice: number;
  discount: number;
  durationMinutes?: number;
  assignee?: ID | User | null;
  scheduledStart?: ISODate | null;
  scheduledEnd?: ISODate | null;
  status?: "pending" | "in_progress" | "done";
  optional?: boolean;
  selected?: boolean;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export type JobStage = "lead" | "quoted" | "scheduled" | "in_progress" | "quality_check" | "completed" | "cancelled";
export type Priority = "low" | "normal" | "high" | "rush";

export interface TimelineEvent {
  _id: ID;
  at: ISODate;
  type: "created" | "stage" | "note" | "payment" | "message" | "inspection" | "quote" | "system";
  message: string;
  by?: ID | User | null;
}

export interface Job {
  _id: ID;
  number: number;
  customer: Customer;
  vehicle?: Vehicle | null;
  title: string;
  stage: JobStage;
  priority: Priority;
  lineItems: LineItem[];
  scheduledStart?: ISODate | null;
  scheduledEnd?: ISODate | null;
  bay?: number;
  location?: ID;
  assignees: User[];
  notes?: string;
  internalNotes?: string;
  tags: string[];
  source?: string;
  portalToken: string;
  timeline: TimelineEvent[];
  checklist: { _id: ID; label: string; done: boolean }[];
  quote?: ID | null;
  invoice?: ID | null;
  totals: Totals;
  completedAt?: ISODate | null;
  mobile?: boolean;
  serviceAddress?: string;
  geo?: GeoPoint | null;
  routeOrder?: number | null;
  eta?: ISODate | null;
  recurrence?: Recurrence | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type QuoteStatus = "draft" | "sent" | "viewed" | "approved" | "declined" | "expired";

export interface Quote {
  _id: ID;
  number: number;
  customer: Customer;
  vehicle?: Vehicle | null;
  job?: ID | null;
  title: string;
  items: LineItem[];
  discount: number;
  taxRate: number;
  totals: Totals;
  status: QuoteStatus;
  validUntil?: ISODate;
  notes?: string;
  publicToken: string;
  approvedAt?: ISODate;
  signatureName?: string;
  aiGenerated: boolean;
  copilotPrompt?: string;
  createdAt: ISODate;
}

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "void" | "overdue";
export type PaymentMethod = "card" | "cash" | "ach" | "check" | "financing" | "gift_card" | "other";

export interface Payment {
  _id: ID;
  amount: number;
  tip: number;
  method: PaymentMethod;
  reference?: string;
  giftCard?: string;
  at: ISODate;
  by?: ID | User | null;
}

export interface Invoice {
  _id: ID;
  number: number;
  customer: Customer;
  job?: ID | Job | null;
  items: { _id?: ID; name: string; description?: string; qty: number; unitPrice: number }[];
  discount: number;
  taxRate: number;
  totals: Totals & { tips: number; paid: number; balance: number };
  status: InvoiceStatus;
  dueDate?: ISODate;
  notes?: string;
  publicToken: string;
  payments: Payment[];
  coupon?: { code: string; amount: number } | null;
  paidAt?: ISODate;
  createdAt: ISODate;
}

export type InspectionView = "top" | "left" | "right" | "front" | "rear";
export type DamageKind = "scratch" | "dent" | "chip" | "swirl" | "crack" | "stain" | "other";

export interface Inspection {
  _id: ID;
  job?: ID | Job | null;
  customer: Customer;
  vehicle: Vehicle;
  type: "pre" | "post";
  status: "draft" | "awaiting_signature" | "signed";
  markers: { _id?: ID; view: InspectionView; x: number; y: number; kind: DamageKind; severity: 1 | 2 | 3; note?: string }[];
  media: { _id: ID; url: string; kind: "photo" | "video"; caption?: string }[];
  notes?: string;
  publicToken: string;
  signature?: { name: string; signedAt: ISODate };
  createdAt: ISODate;
}

export interface InventoryItem {
  _id: ID;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  cost: number;
  supplier?: string;
  location?: string;
  adjustments?: { at: ISODate; delta: number; reason: string; by?: ID }[];
}

export interface TimeEntry {
  _id: ID;
  user: ID | User;
  job?: ID | Job | null;
  clockIn: ISODate;
  clockOut?: ISODate | null;
  minutes: number;
  tips: number;
  note?: string;
}

export interface EarningsRow {
  user: User;
  minutes: number;
  hours: number;
  wages: number;
  tips: number;
  commission: number;
  total: number;
  jobs: number;
}

export type AutomationTrigger =
  | "job.created"
  | "job.stage_changed"
  | "job.completed"
  | "quote.sent"
  | "quote.approved"
  | "invoice.paid"
  | "invoice.overdue"
  | "booking.created"
  | "customer.created"
  | "inspection.signed";

export interface AutomationAction {
  type: "send_sms" | "send_email" | "notify_team" | "add_tag" | "update_stage" | "wait";
  config: Record<string, unknown>;
}

export interface Automation {
  _id: ID;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: { field: string; op: "eq" | "neq" | "gt" | "lt" | "contains"; value: string | number }[];
  actions: AutomationAction[];
  runs: number;
  lastRunAt?: ISODate;
}

export interface Message {
  _id: ID;
  customer: ID | Customer;
  job?: ID | null;
  direction: "outbound" | "inbound";
  channel: "sms" | "email" | "note";
  subject?: string;
  body: string;
  status: "queued" | "sent" | "delivered" | "failed" | "received";
  automation?: ID | null;
  readAt?: ISODate | null;
  createdAt: ISODate;
}

export interface Thread {
  customer: Customer;
  lastMessage: Message;
  unread: number;
}

export interface Certificate {
  _id: ID;
  code: string;
  customer: Customer;
  vehicle: Vehicle;
  job?: ID | null;
  product: string;
  coverage: string;
  installedAt: ISODate;
  expiresAt?: ISODate;
  installer?: User | null;
  notes?: string;
  status: "active" | "expired" | "void";
}

export interface MembershipPlan {
  _id: ID;
  name: string;
  price: number;
  interval: "month" | "year";
  perks: string[];
  discountPercent: number;
  color?: string;
  active: boolean;
}

export interface Membership {
  _id: ID;
  plan: MembershipPlan;
  customer: Customer;
  vehicle?: Vehicle | null;
  status: "active" | "paused" | "cancelled";
  startedAt: ISODate;
  nextBillingAt?: ISODate;
  washesUsed: number;
}

export interface AppNotification {
  _id: ID;
  title: string;
  body?: string;
  link?: string;
  kind: "info" | "success" | "warning" | "booking" | "payment";
  read: boolean;
  createdAt: ISODate;
}

export interface ActivityLog {
  _id: ID;
  actor?: User | null;
  action: string;
  entityType: string;
  entityId?: ID;
  summary: string;
  createdAt: ISODate;
}

export interface AnalyticsOverview {
  kpis: {
    revenue: number;
    revenueChange: number;
    jobsCompleted: number;
    jobsChange: number;
    avgTicket: number;
    conversionRate: number;
    outstanding: number;
    newCustomers: number;
  };
  revenueSeries: { date: string; revenue: number; jobs: number }[];
  byCategory: { category: string; revenue: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  sources: { source: string; count: number }[];
  technicians: { user: User; jobs: number; revenue: number }[];
  pipeline: { stage: JobStage; count: number; value: number }[];
  upcoming: Job[];
}

export interface CopilotResult {
  items: LineItem[];
  durationMinutes: number;
  total: number;
  confidence: number;
  reasoning: string[];
  detected: { size: VehicleSize; condition: string; categories: string[] };
}

export interface SearchResults {
  customers: Customer[];
  vehicles: Vehicle[];
  jobs: Job[];
  invoices: Invoice[];
  quotes: Quote[];
}

/* ── Phase 2 (ARCHITECTURE-PHASE2.md) ─────────────────────────────────── */

export type GeoPoint = { lat: number; lng: number };

export interface Recurrence {
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "custom";
  intervalDays: number;
  endsAt?: ISODate | null;
  parent?: ID | null;
  generatedNext?: boolean;
}

export interface CalendarBlock {
  _id: ID;
  user?: User | ID | null;
  title: string;
  kind: "time_off" | "meeting" | "blocked";
  start: ISODate;
  end: ISODate;
  bay?: number | null;
  allDay: boolean;
  notes?: string;
}

export interface RouteStop {
  job: Job;
  order: number;
  lat: number;
  lng: number;
  eta: ISODate;
  legKm: number;
  legMinutes: number;
}

export interface RoutePlan {
  date: string;
  depot: { address?: string } & GeoPoint;
  technicians: { user: User; stops: RouteStop[]; totalKm: number; totalMinutes: number }[];
  unassigned: Job[];
}

export interface Coupon {
  _id: ID;
  code: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  minSpend: number;
  maxUses?: number | null;
  uses: number;
  expiresAt?: ISODate | null;
  active: boolean;
  categories: ServiceCategory[];
  createdAt: ISODate;
}

export interface GiftCard {
  _id: ID;
  code: string;
  initialBalance: number;
  balance: number;
  customer?: Customer | ID | null;
  recipientName: string;
  recipientEmail?: string;
  message?: string;
  expiresAt?: ISODate | null;
  status: "active" | "depleted" | "void";
  transactions: { _id?: ID; at: ISODate; amount: number; invoice?: ID | null; note?: string }[];
  createdAt: ISODate;
}

export type LeadFieldType = "text" | "email" | "phone" | "textarea" | "select" | "vehicle" | "services" | "date" | "checkbox";

export interface LeadForm {
  _id: ID;
  name: string;
  slug: string;
  title: string;
  description?: string;
  fields: { _id?: ID; key: string; label: string; type: LeadFieldType; required: boolean; options: string[] }[];
  submitLabel: string;
  successMessage?: string;
  createJob: boolean;
  active: boolean;
  submissions: number;
  createdAt: ISODate;
}

export interface DocumentFile {
  _id: ID;
  customer?: Customer | ID | null;
  job?: Job | ID | null;
  name: string;
  url: string;
  mime: string;
  size: number;
  category: "waiver" | "contract" | "photo" | "receipt" | "warranty" | "other";
  uploadedBy?: User | ID | null;
  createdAt: ISODate;
}

export type IntegrationProvider = "quickbooks" | "stripe" | "square" | "zapier" | "google" | "twilio" | "carfax" | "mailchimp";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: string;
  status: "connected" | "disconnected";
  connectedAt?: ISODate | null;
  account?: string | null;
  lastSyncAt?: ISODate | null;
  requiredPlan?: PlanId | null;
}

export interface ApiKey {
  _id: ID;
  name: string;
  prefix: string;
  lastUsedAt?: ISODate | null;
  revokedAt?: ISODate | null;
  createdAt: ISODate;
}

export interface Webhook {
  _id: ID;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  deliveries: { at: ISODate; event: string; status: "success" | "failed"; code?: number; durationMs?: number }[];
  createdAt: ISODate;
}

export interface MarketplaceProduct {
  _id: ID;
  vendor: string;
  name: string;
  sku: string;
  category: "ceramic" | "ppf" | "tint" | "chemicals" | "tools" | "towels" | "wrap";
  price: number;
  memberPrice: number;
  unit: string;
  rating: number;
  description?: string;
  badge?: string;
}

export interface SupplyOrder {
  _id: ID;
  number: number;
  items: { product: ID; sku: string; name: string; qty: number; price: number }[];
  subtotal: number;
  credit: number;
  total: number;
  status: "placed" | "shipped" | "delivered";
  deliveredAt?: ISODate | null;
  createdAt: ISODate;
}

export type SegmentType = "all" | "tag" | "lapsed" | "due_maintenance" | "coating_anniversary" | "vip" | "members";

export interface Campaign {
  _id: ID;
  name: string;
  channel: "sms" | "email";
  segment: { type: SegmentType; value?: string | number };
  subject?: string;
  body: string;
  status: "draft" | "sent";
  sentAt?: ISODate | null;
  stats: { recipients: number; delivered: number; booked: number; revenue: number };
  createdAt: ISODate;
}

export interface Review {
  _id: ID;
  customer?: Customer | ID | null;
  job?: Job | ID | null;
  source: "google" | "facebook" | "yelp" | "lustra";
  rating: number;
  comment?: string;
  author: string;
  reply?: string;
  repliedAt?: ISODate | null;
  status: "new" | "replied";
  createdAt: ISODate;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  responseRate: number;
  bySource: { source: Review["source"]; count: number; average: number }[] | Record<string, number>;
}

export interface Insights {
  forecast: {
    series: { date: string; actual?: number; predicted: number; lower: number; upper: number }[];
    next30: number;
    trend: "up" | "down" | "flat" | number;
    trendPct?: number;
  };
  churnRisk: {
    customer: Customer;
    lastVisitAt: ISODate;
    avgIntervalDays: number;
    daysOverdue: number;
    risk: "high" | "medium" | "low";
    lifetimeValue: number;
  }[];
  opportunities: {
    id: string;
    kind:
      | "followup_quotes"
      | "coating_anniversary"
      | "idle_capacity"
      | "lapsed_vips"
      | "unpaid_invoices"
      | "low_stock"
      | "membership_upsell";
    title: string;
    description: string;
    impact: number;
    count: number;
    action: { label: string; href: string };
  }[];
  health: { score: number; factors: { label: string; score: number; hint: string }[] };
}
