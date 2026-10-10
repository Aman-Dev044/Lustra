/* Navigation-level catalog of features & industries. Full page content lives in features.ts / industries.ts. */
import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  BarChart3,
  Boxes,
  CalendarClock,
  Car,
  CreditCard,
  Crown,
  Droplets,
  Gem,
  KanbanSquare,
  Layers,
  Leaf,
  MessagesSquare,
  PanelsTopLeft,
  Route,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Sprout,
  SunDim,
  Truck,
  Users,
  Workflow,
  Globe,
  Brush,
  BrainCircuit,
  Megaphone,
  Star,
  Ticket,
  ClipboardList,
  ShoppingCart,
  Plug,
} from "lucide-react";

export interface CatalogEntry {
  slug: string;
  title: string;
  short: string;
  icon: LucideIcon;
  isNew?: boolean;
}

export const featureCatalog: CatalogEntry[] = [
  { slug: "live-job-board", title: "Live Job Board", short: "Real-time kanban synced across every bay and device.", icon: KanbanSquare, isNew: true },
  { slug: "quote-copilot", title: "AI Quote Copilot", short: "Describe the job, get a priced, itemized quote in seconds.", icon: Sparkles, isNew: true },
  { slug: "online-booking", title: "Online Booking", short: "Real-time availability that respects bays and lead time.", icon: CalendarClock },
  { slug: "customer-portal", title: "Live Customer Portal", short: "Clients track progress, approve, sign and pay from one link.", icon: Globe, isNew: true },
  { slug: "payments", title: "Payments & Text-to-Pay", short: "Cards, tap-to-pay, ACH, financing, deposits and tips.", icon: CreditCard },
  { slug: "smart-scheduling", title: "Smart Scheduling", short: "Drag-and-drop calendar, line-item scheduling and bay capacity.", icon: PanelsTopLeft },
  { slug: "digital-inspections", title: "Digital Inspections", short: "Damage pins on a vehicle map, HD photo & video, e-signature.", icon: ScanSearch },
  { slug: "workflow-automations", title: "Workflow Automations", short: "Visual if-this-then-that builder for every customer touchpoint.", icon: Workflow },
  { slug: "messaging", title: "Two-Way Messaging", short: "Unified SMS & email inbox with smart reminders and follow-ups.", icon: MessagesSquare },
  { slug: "warranty-certificates", title: "Warranty Certificates", short: "Branded coating & PPF certificates with QR verification.", icon: ShieldCheck, isNew: true },
  { slug: "memberships", title: "Memberships", short: "Recurring wash clubs and maintenance plans that bill themselves.", icon: Crown, isNew: true },
  { slug: "team-payroll", title: "Team, Time & Commissions", short: "Clock-ins, hourly, tips and commissions calculated for you.", icon: Users },
  { slug: "inventory", title: "Inventory", short: "Track film, coatings and chemicals with low-stock alerts.", icon: Boxes },
  { slug: "profit-analytics", title: "Profit Analytics", short: "Revenue, conversion, technician output and pipeline at a glance.", icon: BarChart3 },
  { slug: "mobile-routing", title: "Mobile Routing", short: "Optimized routes and on-my-way texts for mobile crews.", icon: Route },
  { slug: "ai-insights", title: "AI Insights", short: "Revenue forecast, churn radar and opportunities found for you.", icon: BrainCircuit, isNew: true },
  { slug: "smart-campaigns", title: "Smart Campaigns", short: "SMS & email blasts to segments like ‘coating anniversary’.", icon: Megaphone, isNew: true },
  { slug: "reputation-hub", title: "Reputation Hub", short: "Request, track and reply to reviews with AI-drafted responses.", icon: Star, isNew: true },
  { slug: "promotions-gift-cards", title: "Coupons & Gift Cards", short: "Promo codes and e-gift cards redeemable at checkout.", icon: Ticket },
  { slug: "lead-forms", title: "Custom Lead Forms", short: "Embeddable forms that turn visitors into quoted leads.", icon: ClipboardList },
  { slug: "supplier-marketplace", title: "Supplier Marketplace", short: "Order film & chemicals at member pricing, synced to inventory.", icon: ShoppingCart },
  { slug: "integrations-api", title: "Integrations & API", short: "QuickBooks, Stripe, Square, Zapier, API keys and webhooks.", icon: Plug, isNew: true },
];

export const industryCatalog: CatalogEntry[] = [
  { slug: "auto-detailing", title: "Auto Detailing", short: "Shops and studios running washes, details and corrections.", icon: Droplets },
  { slug: "ceramic-coating", title: "Ceramic Coating", short: "Certified installers selling multi-year protection.", icon: Gem },
  { slug: "paint-protection-film", title: "Paint Protection Film", short: "PPF installers quoting packages from track to full body.", icon: ShieldCheck },
  { slug: "window-tint", title: "Window Tint", short: "Automotive tint shops pricing by film, shade and glass.", icon: SunDim },
  { slug: "vinyl-wrap", title: "Vinyl Wrap", short: "Color change, commercial graphics and chrome deletes.", icon: Layers },
  { slug: "mobile-detailing", title: "Mobile Detailing", short: "Crews on the road with routing and on-site payments.", icon: Truck },
  { slug: "marine-detailing", title: "Marine Detailing", short: "Boats and yachts priced by the foot with oxidation work.", icon: Anchor },
  { slug: "flat-glass", title: "Flat Glass Film", short: "Residential & commercial window film by square foot.", icon: Brush },
  { slug: "landscaping", title: "Landscaping", short: "Design-build crews with recurring maintenance routes.", icon: Leaf },
  { slug: "lawn-care", title: "Lawn Care", short: "Recurring mowing and treatment programs that renew themselves.", icon: Sprout },
];

export const vehicleIcon = Car;
