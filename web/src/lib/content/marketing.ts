import type { PlanId } from "@/lib/types";

export const homeFaqs = [
  {
    q: "What is Lustra?",
    a: "Lustra is an all-in-one shop management platform for auto detailing, ceramic coating, PPF, window tint, vinyl wrap and marine businesses. It combines online booking, AI-assisted quoting, a real-time job board, digital inspections, payments, messaging, memberships and analytics in one app for web, iPhone and Android.",
  },
  {
    q: "How much does Lustra cost?",
    a: "Express is $70/month, Pro is $110/month and Enterprise is $183/month (or $840, $1,320 and $2,200 billed yearly). Every plan includes unlimited users, and the optional 3D Visualizer add-on is $150/month. There are no contracts — upgrade, downgrade or cancel any time.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every plan starts with a 14-day free trial, no credit card required, and we'll import your existing customers and vehicles for free.",
  },
  {
    q: "How is Lustra different from other detailing software?",
    a: "Lustra is real-time by design — the job board, payments and customer portal update instantly on every device. It also adds next-generation tools other platforms don't have: an AI Quote Copilot, a live customer portal, QR-verifiable warranty certificates, memberships with recurring billing, a visual automation builder and a bay capacity planner.",
  },
  {
    q: "Does Lustra work for mobile detailers?",
    a: "Yes. Route optimization, on-my-way texts, driveway inspections and tap-to-pay make Lustra a full business-in-a-van for mobile operators.",
  },
  {
    q: "Can I keep my current payment processor?",
    a: "Yes. You can use LustraPay (2.6% + 10¢ in person, 2.9% + 30¢ online, next-day payouts) or connect Stripe or Square on any plan.",
  },
];

export const pricingFaqs = [
  {
    q: "Do you charge per user?",
    a: "No. Every Lustra plan includes unlimited users — add your whole team, part-timers and seasonal help at no extra cost.",
  },
  {
    q: "Are there contracts or setup fees?",
    a: "No contracts and no setup fees. Pay monthly or yearly and change or cancel your plan any time from Settings.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "You choose a plan and keep everything you set up. If you don't choose a plan, your account is paused — your data stays safe for 90 days.",
  },
  {
    q: "How does the 3D Visualizer add-on work?",
    a: "For $150/month you get an interactive 3D configurator for PPF coverage, wrap colors and window tint inside Lustra and embeddable on your website, with built-in lead capture. Most shops cover the cost with a single PPF upgrade.",
  },
  {
    q: "Is the yearly price discounted?",
    a: "Yearly billing is $840 (Express), $1,320 (Pro) and $2,200 (Enterprise). It locks in your price for 12 months and simplifies bookkeeping.",
  },
  {
    q: "Will you help me switch from my current software?",
    a: "Yes. Data import is free on every plan. Send us your export and our team migrates customers, vehicles, services and history — usually within two business days.",
  },
  {
    q: "What does payment processing cost?",
    a: "LustraPay is 2.6% + 10¢ for in-person payments and 2.9% + 30¢ online, with next-day payouts, no monthly minimums and no hidden fees. You can also connect Stripe or Square.",
  },
];

export const testimonials = [
  {
    quote:
      "We went from a whiteboard and three group chats to one live board. Saturday used to be chaos — now the team looks at the TV and knows exactly what's next.",
    name: "Marcus Vellani",
    role: "Owner, Gloss Theory Detail Studio",
    city: "Scottsdale, AZ",
    metric: "+41% jobs/month",
  },
  {
    quote:
      "Copilot writes my PPF quotes while I'm still on the phone. Customers get a link, toggle the track pack, sign and pay the deposit before we hang up.",
    name: "Andre Liang",
    role: "Owner, Clearline PPF Atelier",
    city: "Irvine, CA",
    metric: "$2,950 avg. ticket",
  },
  {
    quote:
      "The QR warranty certificates changed how customers see a coating. It's not a $1,999 service anymore — it's a protected asset they can prove.",
    name: "Danielle Okafor",
    role: "Founder, Halo Ceramic Lab",
    city: "Charlotte, NC",
    metric: "+31% maintenance rebooks",
  },
  {
    quote:
      "Two vans, one app. The guys see their route, customers get the on-my-way text, and the money's in the account before they're back in the truck.",
    name: "Jordan Pike",
    role: "Owner, Driveway Pros Mobile Detailing",
    city: "Tampa, FL",
    metric: "+1.4 jobs/day",
  },
  {
    quote:
      "Our membership club pays rent before the month starts. Lustra bills it, tracks usage and reminds members to come in. I just wash cars.",
    name: "Sofia Marchetti",
    role: "Owner, Velvet Hand Wash & Detail",
    city: "Austin, TX",
    metric: "$7.4k MRR",
  },
  {
    quote:
      "Booking page does the quoting now. Phones are quieter, bays are fuller, and automated aftercare texts killed our comebacks.",
    name: "Priya Raman",
    role: "GM, Shade District Tint Co.",
    city: "Houston, TX",
    metric: "−62% phone tag",
  },
];

type Cell = boolean | string;
export interface ComparisonRow {
  label: string;
  values: Record<PlanId, Cell>;
}
export interface ComparisonGroup {
  group: string;
  rows: ComparisonRow[];
}

const all = (v: Cell = true): Record<PlanId, Cell> => ({ express: v, pro: v, enterprise: v });
const proUp: Record<PlanId, Cell> = { express: false, pro: true, enterprise: true };
const entOnly: Record<PlanId, Cell> = { express: false, pro: false, enterprise: true };

export const comparison: ComparisonGroup[] = [
  {
    group: "Team & platform",
    rows: [
      { label: "Users", values: all("Unlimited") },
      { label: "Web, iPhone & Android apps", values: all() },
      { label: "Role-based permissions", values: all() },
      { label: "Real-time sync & live presence", values: all() },
      { label: "Command palette & global search", values: all() },
      { label: "Cloud data storage", values: all() },
      { label: "Multi-location management", values: entOnly },
    ],
  },
  {
    group: "Next-gen intelligence",
    rows: [
      { label: "AI Quote Copilot", values: proUp },
      { label: "AI Insights: revenue forecast, churn radar & opportunities", values: proUp },
      { label: "AI reply suggestions for messages & reviews", values: proUp },
      { label: "Live Job Board (real-time kanban)", values: all() },
      { label: "Live customer portal (track, approve, sign, pay)", values: proUp },
      { label: "Warranty certificates with QR verification", values: all() },
      { label: "Bay capacity planner", values: entOnly },
    ],
  },
  {
    group: "Sales & customer experience",
    rows: [
      { label: "Branded quotes, invoices & PDF receipts", values: all() },
      { label: "Quote approvals with e-signature", values: all() },
      { label: "Proposals with optional add-ons", values: all() },
      { label: "Online booking with real-time availability", values: proUp },
      { label: "Custom lead forms", values: proUp },
      { label: "Coupons, discounts & promo codes", values: all() },
      { label: "E-gift cards with balances", values: all() },
      { label: "Loyalty points", values: all() },
      { label: "Customer interaction history", values: all() },
    ],
  },
  {
    group: "Scheduling & operations",
    rows: [
      { label: "Drag-and-drop calendar & rescheduling", values: all() },
      { label: "Multiple calendars, time off & meetings", values: all() },
      { label: "Recurring / repeat jobs", values: all() },
      { label: "Multi-vehicle jobs", values: all() },
      { label: "Drop-off times & tentative holds", values: all() },
      { label: "Line-item scheduling", values: entOnly },
      { label: "Route optimization & Google Maps navigation", values: all() },
      { label: "On-my-way ETA texts", values: all() },
      { label: "VIN scanning & decoding", values: all() },
      { label: "Photo inspections with damage map & signatures", values: all() },
      { label: "HD video inspections", values: entOnly },
      { label: "Document upload & storage", values: proUp },
      { label: "Inventory tracking & low-stock alerts", values: all() },
    ],
  },
  {
    group: "Messaging, marketing & automation",
    rows: [
      { label: "Automated reminder & review messages", values: all() },
      { label: "Two-way SMS & email inbox", values: all() },
      { label: "Long-term follow-up messaging", values: proUp },
      { label: "Smart Campaigns (segmented SMS & email)", values: proUp },
      { label: "Reputation Hub (review requests & replies)", values: proUp },
      { label: "Visual workflow automation builder", values: entOnly },
      { label: "Automated payment request reminders", values: entOnly },
    ],
  },
  {
    group: "Payments & money",
    rows: [
      { label: "LustraPay, Stripe & Square", values: all() },
      { label: "Card readers & tap-to-pay", values: all() },
      { label: "Text & email invoices (text-to-pay)", values: all() },
      { label: "Tipping", values: all() },
      { label: "Deposits & multiple payments per job", values: all() },
      { label: "Saved cards on file", values: all() },
      { label: "ACH bank payments", values: all() },
      { label: "Consumer financing (Affirm/Afterpay-style)", values: all() },
      { label: "Grouped invoices", values: all() },
      { label: "Sales tax reports", values: all() },
      { label: "Memberships & recurring billing", values: entOnly },
    ],
  },
  {
    group: "Integrations & data",
    rows: [
      { label: "CSV data import & export", values: all() },
      { label: "QuickBooks Online sync", values: proUp },
      { label: "Supplier marketplace with member pricing & 2% credit", values: proUp },
      { label: "Zapier (6,000+ apps)", values: entOnly },
      { label: "Developer API keys & signed webhooks", values: entOnly },
    ],
  },
  {
    group: "Insights & team",
    rows: [
      { label: "Core analytics (revenue, jobs, sources, hours)", values: all() },
      { label: "Profit analytics", values: proUp },
      { label: "Time clock, wages & tips", values: all() },
      { label: "Commission tracking", values: entOnly },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Live chat support & video library", values: all() },
      { label: "Free data migration", values: all() },
      { label: "Feature requests & early access", values: proUp },
      { label: "Pro User Group", values: entOnly },
      { label: "1:1 account executive", values: entOnly },
    ],
  },
];

export const trustStats = [
  { to: 4800, suffix: "+", label: "Shops running on Lustra" },
  { to: 310, prefix: "$", suffix: "M", label: "Processed through LustraPay" },
  { to: 4.9, suffix: "★", decimals: 1, label: "Average rating from 1,200+ reviews" },
  { to: 38, suffix: "%", label: "More booked jobs in year one" },
];
