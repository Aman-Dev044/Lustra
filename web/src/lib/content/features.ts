import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BellRing,
  Bot,
  CalendarCheck,
  Camera,
  CircleDollarSign,
  Clock,
  Gauge,
  Layers,
  LineChart,
  Lock,
  MapPinned,
  MessageCircle,
  MousePointerClick,
  PackageCheck,
  QrCode,
  Radio,
  Repeat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Split,
  Timer,
  TrendingUp,
  Users,
  Wallet,
  Workflow,
  Zap,
  Coins,
  FileSpreadsheet,
  Filter,
  Gift,
  HeartPulse,
  Link2,
  ListChecks,
  MessageSquareReply,
  Package,
  Percent,
  Plug,
  Receipt,
  Send,
  Star,
  Store,
  Target,
  Ticket,
  Webhook,
} from "lucide-react";
import type { PlanId } from "@/lib/types";

export interface FeatureContent {
  slug: string;
  title: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  image: string;
  imageAlt: string;
  plan: PlanId;
  seo: { title: string; description: string; keywords: string[] };
  stats: { value: string; label: string }[];
  benefits: { title: string; body: string; icon: LucideIcon }[];
  steps: { title: string; body: string }[];
  highlights: string[];
  faqs: { q: string; a: string }[];
  related: string[];
}

export const features: FeatureContent[] = [
  {
    slug: "live-job-board",
    title: "Live Job Board",
    eyebrow: "Real-time operations",
    headline: "Every bay, every tech, every car — moving in real time.",
    subhead:
      "A live kanban that syncs across the front desk, the shop floor and your phone in under 100 ms. Drag a Model Y from Prep to Correction and everyone sees it instantly — no refresh, no whiteboard, no shouting across the shop.",
    image: "/images/garage-night.webp",
    imageAlt: "Sports car parked in a lit garage at night, ready for its next service stage",
    plan: "express",
    seo: {
      title: "Live Job Board for Detailing & PPF Shops",
      description:
        "Real-time kanban job board for auto detailing, PPF and tint shops. Track every vehicle from lead to pickup, synced instantly across every device.",
      keywords: ["detailing job board", "shop kanban", "real-time job tracking", "PPF shop workflow", "auto spa job management"],
    },
    stats: [
      { value: "<100ms", label: "sync across devices" },
      { value: "6", label: "stages out of the box" },
      { value: "2.4h", label: "saved per week on status calls" },
    ],
    benefits: [
      {
        title: "Live presence",
        body: "See which teammates are online and what they just moved. Changes stream to every open screen over a persistent socket — the board is always the truth.",
        icon: Radio,
      },
      {
        title: "Stage automations",
        body: "Moving a card can text the customer, request a signature, or spin up an invoice. The board doesn't just show work — it triggers it.",
        icon: Zap,
      },
      {
        title: "Built for the floor",
        body: "Big touch targets, priority colors and rush flags make it usable on a wall-mounted TV or a phone in a gloved hand.",
        icon: Smartphone,
      },
      {
        title: "Value at a glance",
        body: "Each column totals the dollars sitting in it, so you know exactly how much revenue is in Quality Check before the weekend.",
        icon: CircleDollarSign,
      },
    ],
    steps: [
      { title: "Cards appear automatically", body: "Online bookings, approved quotes and walk-ins land on the board with the vehicle, services and customer attached." },
      { title: "Drag through your stages", body: "Lead → Quoted → Scheduled → In progress → Quality check → Completed. Rename or reorder to match how your shop works." },
      { title: "Customers follow along", body: "Every move updates the customer's live portal, so 'is my car done yet?' calls disappear." },
    ],
    highlights: [
      "Real-time sync with presence indicators",
      "Column revenue totals",
      "Priority & rush flags",
      "Checklists per job",
      "Stage-change automations",
      "Works on TV, desktop, tablet & phone",
    ],
    faqs: [
      { q: "Does the board work without refreshing?", a: "Yes. Lustra keeps a live connection open, so every change made by anyone on your team appears on every screen within a fraction of a second." },
      { q: "Can I customize the stages?", a: "You get six proven stages out of the box. Enterprise shops can trigger automations on any stage change, and every plan can filter the board by technician, bay or priority." },
      { q: "Can technicians use it on their phones?", a: "Absolutely. The board is fully responsive and installable as an app on iPhone and Android, with large touch targets designed for the shop floor." },
    ],
    related: ["smart-scheduling", "workflow-automations", "customer-portal"],
  },
  {
    slug: "quote-copilot",
    title: "AI Quote Copilot",
    eyebrow: "New · AI-assisted sales",
    headline: "Type what the customer said. Get a priced quote in seconds.",
    subhead:
      "“2022 Tahoe, heavy swirls, wants ceramic and front PPF.” Copilot reads it like your best estimator would — detects the vehicle size, the paint condition and the services — then builds an itemized, size-adjusted quote from your own price book.",
    image: "/images/paint-correction.webp",
    imageAlt: "Detailer machine-polishing a black hood to remove swirl marks before coating",
    plan: "pro",
    seo: {
      title: "AI Quote Copilot — Instant Detailing & PPF Quotes",
      description:
        "Lustra's AI Quote Copilot turns a plain-English job description into an itemized, size-adjusted quote for detailing, ceramic coating, PPF and tint.",
      keywords: ["AI detailing quote", "ceramic coating quote tool", "PPF estimate software", "detailing estimate app", "auto spa quoting"],
    },
    stats: [
      { value: "11s", label: "average time to a first draft" },
      { value: "+23%", label: "higher average ticket from upsells" },
      { value: "100%", label: "your prices, your catalog" },
    ],
    benefits: [
      { title: "Understands shop language", body: "Swirls, oxidation, pet hair, track pack, 20% all around — Copilot maps everyday words to the right services and condition upcharges.", icon: Bot },
      { title: "Size-aware pricing", body: "A Miata and a Sprinter aren't the same job. Size multipliers from your catalog are applied automatically and shown transparently.", icon: Layers },
      { title: "Smart upsells", body: "Ceramic after correction, tint with PPF, engine bay with a full detail — Copilot suggests optional add-ons the customer can toggle on.", icon: TrendingUp },
      { title: "Explainable", body: "Every suggestion comes with its reasoning and a confidence score, so you stay in control and can edit anything before sending.", icon: Sparkles },
    ],
    steps: [
      { title: "Describe the job", body: "Paste a text, DM or call note — or type it in your own words." },
      { title: "Review the draft", body: "See detected size, condition, line items, duration and total. Tweak anything inline." },
      { title: "Send & get approved", body: "The customer gets a branded link to toggle add-ons, sign and pay a deposit." },
    ],
    highlights: [
      "Plain-English job intake",
      "Vehicle size & condition detection",
      "Uses your own service catalog",
      "Optional add-on upsells",
      "Confidence score & reasoning",
      "One click to send for e-signature",
    ],
    faqs: [
      { q: "Does Copilot invent prices?", a: "No. It only uses services and prices from your own catalog, then applies your size multipliers. You review every draft before it goes to a customer." },
      { q: "Which plan includes Copilot?", a: "AI Quote Copilot is included in Pro and Enterprise at no extra cost." },
      { q: "Can I edit the quote after Copilot builds it?", a: "Yes — every line, price, quantity and description stays editable, and you can add or remove items freely." },
    ],
    related: ["customer-portal", "payments", "online-booking"],
  },
  {
    slug: "online-booking",
    title: "Online Booking",
    eyebrow: "24/7 self-scheduling",
    headline: "Bookings that respect your bays, your hours and your sanity.",
    subhead:
      "A beautiful booking page that only offers times you can actually deliver — calculated from service duration, bay count, working hours, lead time and every job already on the calendar.",
    image: "/images/foam-wash.webp",
    imageAlt: "Detailer spraying snow foam onto a red car during a pre-wash",
    plan: "pro",
    seo: {
      title: "Online Booking Software for Detailers",
      description:
        "Let customers book detailing, ceramic coating, PPF and tint appointments online with real-time, bay-aware availability and automatic confirmations.",
      keywords: ["detailing online booking", "car detailing scheduling software", "auto detailing booking app", "tint shop booking", "book detailing online"],
    },
    stats: [
      { value: "41%", label: "of bookings happen after hours" },
      { value: "0", label: "double-bookings" },
      { value: "−62%", label: "phone tag" },
    ],
    benefits: [
      { title: "Capacity-aware slots", body: "Lustra knows a full-body PPF takes three days and a maintenance wash takes an hour — and only shows slots where a bay is truly free.", icon: CalendarCheck },
      { title: "Your brand, your link", body: "A dedicated page at your own URL with your colors, services and prices. Embed it on your site, Instagram bio or Google Business Profile.", icon: MousePointerClick },
      { title: "Instant confirmations", body: "Customers get confirmation and reminder texts automatically, plus a live portal link to track their car.", icon: BellRing },
    ],
    steps: [
      { title: "Choose services", body: "Customers pick from your bookable menu with clear durations and starting prices." },
      { title: "Pick a real slot", body: "Availability is calculated live against bays, hours and lead time." },
      { title: "Land on your board", body: "The booking appears as a scheduled job — customer, vehicle and services attached." },
    ],
    highlights: ["Real-time availability", "Bay-aware capacity", "Minimum lead time", "Working hours per day", "Optional deposits", "Automatic reminders"],
    faqs: [
      { q: "Can I require a deposit?", a: "Yes. You can require a percentage deposit at booking so high-value PPF and coating slots aren't left empty by no-shows." },
      { q: "Can customers book multi-day jobs?", a: "Yes. Service durations drive availability, so a 2-day coating automatically blocks the right amount of bay time." },
      { q: "Do I need a website?", a: "No. Every shop gets a hosted booking page. If you have a website, you can link or embed it." },
    ],
    related: ["smart-scheduling", "messaging", "customer-portal"],
  },
  {
    slug: "customer-portal",
    title: "Live Customer Portal",
    eyebrow: "New · Client experience",
    headline: "One link where customers watch, approve, sign and pay.",
    subhead:
      "Every job gets a private, branded portal. Customers follow their vehicle through each stage in real time, approve quotes and add-ons, sign inspections, pay invoices and download their warranty — without creating an account.",
    image: "/images/mustang-dusk.webp",
    imageAlt: "Black performance coupe at dusk after a fresh detail, ready for customer pickup",
    plan: "pro",
    seo: {
      title: "Customer Portal for Detailing & PPF Shops",
      description:
        "Give detailing customers a live portal to track their vehicle, approve quotes, sign inspections, pay invoices and access warranty certificates.",
      keywords: ["detailing customer portal", "car detailing status tracking", "PPF customer approval", "auto shop customer portal"],
    },
    stats: [
      { value: "−74%", label: "“is it ready?” calls" },
      { value: "3.1×", label: "faster quote approvals" },
      { value: "0", label: "logins required" },
    ],
    benefits: [
      { title: "Domino's-style tracking", body: "A live timeline shows exactly where the car is — scheduled, in progress, quality check, ready for pickup.", icon: Radio },
      { title: "Approvals without friction", body: "Customers toggle optional upsells, sign with their name and approve from their phone in seconds.", icon: BadgeCheck },
      { title: "Pay & tip in one tap", body: "Outstanding balances are payable right in the portal, with tips that flow to your techs.", icon: Wallet },
      { title: "Secure by design", body: "Each portal uses an unguessable token and exposes only that job — nothing else about your shop or other customers.", icon: Lock },
    ],
    steps: [
      { title: "Job created", body: "A unique portal link is generated automatically." },
      { title: "Shared automatically", body: "Your confirmation text includes the link — no extra steps for your team." },
      { title: "Customer self-serves", body: "Approve, sign, pay and download the certificate from one place." },
    ],
    highlights: ["Real-time progress timeline", "Quote approval with e-signature", "Inspection sign-off", "Invoice payment & tipping", "Warranty certificate access", "Mobile-first, no app or login"],
    faqs: [
      { q: "Do customers need to download an app?", a: "No. The portal is a fast mobile web page that opens straight from a text message." },
      { q: "Is the portal branded?", a: "Yes. It uses your shop name, colors and contact details." },
      { q: "Which plan includes it?", a: "The live customer portal is included in Pro and Enterprise." },
    ],
    related: ["quote-copilot", "payments", "digital-inspections"],
  },
  {
    slug: "payments",
    title: "Payments & Text-to-Pay",
    eyebrow: "LustraPay",
    headline: "Get paid before the car leaves the bay.",
    subhead:
      "Cards, tap-to-pay, ACH, financing, deposits and tips — all reconciled to the right job automatically. Send a text-to-pay link and watch the invoice flip to Paid on the board in real time.",
    image: "/images/night-performance.webp",
    imageAlt: "Black sports car with glowing tail lights on a city street at night",
    plan: "express",
    seo: {
      title: "Payments for Detailers — Text-to-Pay, Tips & Deposits",
      description:
        "Accept cards, tap-to-pay, ACH and financing for detailing, PPF and tint jobs. Transparent rates, next-day payouts, tips and deposits built in.",
      keywords: ["detailing payment processing", "text to pay detailing", "mobile detailer card reader", "PPF financing", "car wash tips"],
    },
    stats: [
      { value: "2.6% + 10¢", label: "in-person rate" },
      { value: "Next-day", label: "payouts" },
      { value: "$0", label: "setup or monthly fees" },
    ],
    benefits: [
      { title: "Every way to pay", body: "Tap-to-pay, chip, text-to-pay links, ACH for fleets and buy-now-pay-later financing for big PPF and wrap tickets.", icon: CircleDollarSign },
      { title: "Deposits & partials", body: "Collect deposits at booking and partial payments mid-job. Balances update everywhere instantly.", icon: Split },
      { title: "Tips that reach techs", body: "Customers tip at checkout; tips are attributed to the technicians on the job and land in payroll reports.", icon: Users },
    ],
    steps: [
      { title: "Invoice from the job", body: "One click converts a completed job into an itemized invoice." },
      { title: "Send or tap", body: "Text a pay link or take the card on-site." },
      { title: "Auto-reconciled", body: "Payments, tips and loyalty points post to the customer and job automatically." },
    ],
    highlights: ["Transparent flat-rate pricing", "Text & email pay links", "Tap-to-pay and card readers", "ACH and financing", "Deposits & partial payments", "QuickBooks sync (Pro+)"],
    faqs: [
      { q: "What are the processing rates?", a: "LustraPay is 2.6% + 10¢ in person and 2.9% + 30¢ online, with no setup fees, no monthly minimums and no long-term processing contract." },
      { q: "Can I keep Stripe or Square?", a: "Yes. Every plan also integrates with Stripe and Square if you prefer to keep your existing processor." },
      { q: "How fast are payouts?", a: "Next business day by default." },
    ],
    related: ["customer-portal", "memberships", "profit-analytics"],
  },
  {
    slug: "smart-scheduling",
    title: "Smart Scheduling",
    eyebrow: "Calendar & capacity",
    headline: "A calendar that thinks in bays, technicians and hours.",
    subhead:
      "Drag-and-drop scheduling with line-item precision. Put the correction on Marco Tuesday, the coating on Jess Wednesday, and see your bay capacity heatmap for the next three weeks at a glance.",
    image: "/images/ceramic-polish.webp",
    imageAlt: "Technician applying polish with a dual-action machine on a dark vehicle",
    plan: "express",
    seo: {
      title: "Detailing Scheduling Software with Bay Capacity Planning",
      description:
        "Drag-and-drop calendar for detailing and PPF shops with line-item scheduling, technician assignment and a bay capacity heatmap.",
      keywords: ["detailing scheduling software", "PPF shop calendar", "bay capacity planning", "technician scheduling app"],
    },
    stats: [
      { value: "+19%", label: "bay utilization" },
      { value: "1 drag", label: "to reschedule & notify" },
      { value: "21 days", label: "capacity forecast" },
    ],
    benefits: [
      { title: "Line-item scheduling", body: "Split one job across days and people — prep, correction, coating and cure each get their own slot and assignee.", icon: Layers },
      { title: "Bay capacity heatmap", body: "See exactly where you're overbooked or leaving money on the table, hour by hour, for every bay.", icon: Gauge },
      { title: "Reschedule with grace", body: "Drag a job to a new slot and Lustra can text the customer the new time automatically.", icon: Repeat },
    ],
    steps: [
      { title: "Drop jobs on the calendar", body: "Day, week and bay views with color-coded stages." },
      { title: "Assign line items", body: "Each service can have its own technician and time window (Enterprise)." },
      { title: "Plan capacity", body: "Use the heatmap to fill gaps and avoid burnout weeks." },
    ],
    highlights: ["Day / week / bay views", "Drag-and-drop rescheduling", "Recurring / repeat jobs", "Multi-day & multi-vehicle jobs", "Multiple calendars, time off & meetings", "Line-item scheduling", "Capacity heatmap", "Drop-off times"],
    faqs: [
      { q: "Can one job span multiple days?", a: "Yes. Jobs have start and end times, and on Enterprise each line item can be scheduled separately." },
      { q: "Can I schedule recurring jobs?", a: "Yes, on every plan. Set a job to repeat weekly, biweekly, monthly or quarterly — when one visit is completed, Lustra creates the next one automatically." },
      { q: "Does it prevent double-booking?", a: "Online booking only offers open capacity, and the heatmap shows when manual bookings exceed your bay count." },
    ],
    related: ["live-job-board", "online-booking", "team-payroll"],
  },
  {
    slug: "digital-inspections",
    title: "Digital Inspections",
    eyebrow: "Liability protection",
    headline: "Document every chip before you touch the car.",
    subhead:
      "Tap damage pins onto a vehicle map, attach HD photos and video, and capture the customer's e-signature before work starts. When someone says “that scratch wasn't there,” you have proof in two taps.",
    image: "/images/red-coupe.webp",
    imageAlt: "Red performance coupe parked on a road, ready for a pre-service inspection",
    plan: "express",
    seo: {
      title: "Vehicle Inspection App for Detailers & PPF Shops",
      description:
        "Digital pre- and post-service vehicle inspections with damage pins, HD photos, video and customer e-signatures for detailing and PPF shops.",
      keywords: ["vehicle inspection app", "detailing damage inspection", "pre-service inspection", "PPF inspection checklist", "car damage photo app"],
    },
    stats: [
      { value: "90s", label: "average inspection" },
      { value: "5 views", label: "top, sides, front & rear" },
      { value: "100%", label: "time-stamped evidence" },
    ],
    benefits: [
      { title: "Pin it, don't describe it", body: "Mark scratches, dents, chips, swirls and cracks on top, side, front and rear views with severity levels.", icon: MapPinned },
      { title: "Photo & video evidence", body: "Attach HD photos to any inspection — and HD video walkarounds on Enterprise.", icon: Camera },
      { title: "Signed before you start", body: "Customers sign in the portal or on your tablet. The signed record is locked and time-stamped.", icon: BadgeCheck },
    ],
    steps: [
      { title: "Walk around", body: "Tap the vehicle map where you see damage and choose the type." },
      { title: "Capture media", body: "Snap photos or record a walkaround video." },
      { title: "Get the signature", body: "Send for e-signature or sign on-device. Done." },
    ],
    highlights: ["Interactive damage map", "Severity levels", "HD photo uploads", "Video walkarounds (Enterprise)", "Customer e-signature", "Pre & post comparisons"],
    faqs: [
      { q: "Can customers sign remotely?", a: "Yes — they receive a secure link and can sign from their phone." },
      { q: "Is video included?", a: "Photo inspections are on every plan. HD video inspections are part of Enterprise." },
    ],
    related: ["customer-portal", "warranty-certificates", "live-job-board"],
  },
  {
    slug: "workflow-automations",
    title: "Workflow Automations",
    eyebrow: "Visual automation builder",
    headline: "If this happens, Lustra handles that. Forever.",
    subhead:
      "Build automations visually: when a job hits Quality Check, text the customer; when a coating is completed, wait 11 months and book the annual maintenance. Triggers, conditions, waits and actions — no code, no Zapier tax.",
    image: "/images/tint-dark.webp",
    imageAlt: "Dark sedan with tinted windows parked at night",
    plan: "enterprise",
    seo: {
      title: "Automation Builder for Detailing Shops",
      description:
        "Automate reminders, follow-ups, review requests and maintenance bookings for your detailing, PPF or tint shop with a visual workflow builder.",
      keywords: ["detailing automation", "auto detailing follow up", "car detailing review requests", "shop workflow automation"],
    },
    stats: [
      { value: "10", label: "event triggers" },
      { value: "6", label: "action types incl. waits" },
      { value: "9h", label: "saved per week" },
    ],
    benefits: [
      { title: "Triggers for everything", body: "Job created, stage changed, quote approved, invoice paid or overdue, booking created, inspection signed and more.", icon: Workflow },
      { title: "Conditions & waits", body: "Only run for ceramic jobs over $1,000. Wait 3 days, then ask for a review. Wait 11 months, then offer maintenance.", icon: Timer },
      { title: "Personalized messages", body: "Templates with {{customer.firstName}}, {{job.number}} and portal links feel hand-written — because they're yours.", icon: MessageCircle },
    ],
    steps: [
      { title: "Pick a trigger", body: "Choose the moment that should start the workflow." },
      { title: "Add conditions", body: "Filter by service category, amount, tags or stage." },
      { title: "Chain actions", body: "Send SMS or email, notify the team, tag the customer, move the stage or wait." },
    ],
    highlights: ["Visual builder", "10 triggers", "Conditions & delays", "SMS, email & team alerts", "Run history & test mode", "Proven templates included"],
    faqs: [
      { q: "Do I need to build everything from scratch?", a: "No. Lustra ships with proven templates — booking confirmations, review requests, payment reminders and maintenance follow-ups — that you can enable in one click." },
      { q: "Which plan includes custom automations?", a: "The visual automation builder is part of Enterprise. Express and Pro include built-in reminder messages." },
    ],
    related: ["messaging", "memberships", "live-job-board"],
  },
  {
    slug: "messaging",
    title: "Two-Way Messaging",
    eyebrow: "Unified inbox",
    headline: "Every text and email with a customer, in one thread.",
    subhead:
      "A unified inbox tied to each customer and job. Send on-my-way texts, reminders and quotes; see replies in real time; never lose a conversation in someone's personal phone again.",
    image: "/images/mobile-detailing.webp",
    imageAlt: "Mobile detailer hand-drying a grey hatchback outdoors",
    plan: "express",
    seo: {
      title: "Two-Way Texting & Email for Detailing Businesses",
      description:
        "Unified SMS and email inbox for detailing, PPF and tint shops with automatic reminders, on-my-way texts and job-linked conversation history.",
      keywords: ["detailing text messaging", "business texting for detailers", "appointment reminder texts", "customer messaging app"],
    },
    stats: [
      { value: "98%", label: "SMS open rate" },
      { value: "−35%", label: "no-shows with reminders" },
      { value: "1 inbox", label: "for the whole team" },
    ],
    benefits: [
      { title: "Shared team inbox", body: "Everyone sees the same history, so whoever picks up the conversation has full context.", icon: MessageCircle },
      { title: "Automatic reminders", body: "Appointment, pickup and payment reminders go out on schedule without anyone remembering to send them.", icon: BellRing },
      { title: "Job-linked context", body: "Messages attach to the customer and job, alongside quotes, invoices and inspections.", icon: Layers },
    ],
    steps: [
      { title: "Customer texts or books", body: "Conversations appear in the inbox, threaded by customer." },
      { title: "Reply with templates", body: "Use saved replies with merge fields for speed." },
      { title: "Automate the routine", body: "Reminders and follow-ups send themselves." },
    ],
    highlights: ["Unified SMS & email", "Threaded by customer", "Unread tracking", "Saved templates", "Automated reminders", "Long-term follow-ups (Pro+)"],
    faqs: [
      { q: "Can I keep my business number?", a: "Lustra provisions a dedicated business number; number porting is available on request." },
      { q: "Are reminders included on Express?", a: "Yes — automated reminder messages are part of every plan." },
    ],
    related: ["workflow-automations", "online-booking", "customer-portal"],
  },
  {
    slug: "warranty-certificates",
    title: "Warranty Certificates",
    eyebrow: "New · Trust & resale value",
    headline: "Certificates customers frame — and buyers can verify.",
    subhead:
      "Issue branded ceramic coating, PPF and tint warranty certificates with a unique code and QR. Anyone — a future buyer, a dealer, an insurer — can scan it and verify the installation is genuine and active.",
    image: "/images/ppf-install.webp",
    imageAlt: "Installer squeegeeing paint protection film onto a car hood in a clean workshop",
    plan: "express",
    seo: {
      title: "Coating & PPF Warranty Certificates with QR Verify",
      description:
        "Issue branded, verifiable warranty certificates for ceramic coating, paint protection film and window tint — with QR codes anyone can scan.",
      keywords: ["ceramic coating warranty certificate", "PPF warranty registration", "coating certificate template", "warranty verification QR"],
    },
    stats: [
      { value: "1 scan", label: "to verify" },
      { value: "+$1,100", label: "avg. resale story for coated cars" },
      { value: "∞", label: "certificates on every plan" },
    ],
    benefits: [
      { title: "Verifiable anywhere", body: "Each certificate gets a code like LX-7K2M9Q and a public verification page — proof that can't be photoshopped.", icon: QrCode },
      { title: "Track expirations", body: "Know which coatings are due for maintenance or expiring, and turn that list into booked jobs.", icon: Clock },
      { title: "Premium perception", body: "A beautiful certificate turns a $1,999 coating into a tangible asset the customer is proud to own.", icon: ShieldCheck },
    ],
    steps: [
      { title: "Complete the job", body: "Issue the certificate with product, coverage and term." },
      { title: "Share instantly", body: "It appears in the customer's portal and can be texted or printed." },
      { title: "Verify forever", body: "Scan the QR to confirm installer, product and status." },
    ],
    highlights: ["Unique verification codes", "QR verification page", "Product, coverage & term", "Installer attribution", "Expiry tracking", "Void/transfer controls"],
    faqs: [
      { q: "Can a certificate be transferred when the car is sold?", a: "Yes. Shops can update ownership or void a certificate, and the public verification page always reflects the current status." },
      { q: "Is this included on Express?", a: "Yes — warranty certificates are included on every plan." },
    ],
    related: ["digital-inspections", "memberships", "customer-portal"],
  },
  {
    slug: "memberships",
    title: "Memberships",
    eyebrow: "New · Recurring revenue",
    headline: "Turn one-time details into monthly revenue.",
    subhead:
      "Launch wash clubs, coating maintenance plans and fleet programs that bill themselves. Members get perks and discounts automatically; you get predictable revenue that smooths out the slow months.",
    image: "/images/foam-wash.webp",
    imageAlt: "Snow foam maintenance wash on a red car",
    plan: "enterprise",
    seo: {
      title: "Detailing Membership & Subscription Billing Software",
      description:
        "Create recurring detailing memberships, wash clubs and ceramic maintenance plans with automatic billing, perks and member discounts.",
      keywords: ["detailing membership program", "car wash club software", "recurring billing detailing", "ceramic maintenance plan"],
    },
    stats: [
      { value: "$7.2k", label: "avg. monthly recurring at 60 members" },
      { value: "4.8×", label: "member lifetime value" },
      { value: "Auto", label: "billing & renewals" },
    ],
    benefits: [
      { title: "Plans your way", body: "Monthly or yearly, with perks, included washes and a member discount applied to every invoice.", icon: Repeat },
      { title: "Predictable cash flow", body: "Recurring revenue you can plan payroll and marketing around — even in January.", icon: LineChart },
      { title: "Retention on autopilot", body: "Pair memberships with automations to remind members to use their perks.", icon: Workflow },
    ],
    steps: [
      { title: "Design a plan", body: "Name, price, interval, perks and discount." },
      { title: "Enroll customers", body: "Add members in the app or upsell at checkout." },
      { title: "Bill automatically", body: "Renewals, usage and status are tracked for you." },
    ],
    highlights: ["Unlimited plans", "Monthly or yearly billing", "Member discounts", "Usage tracking", "Pause & cancel controls", "MRR reporting"],
    faqs: [
      { q: "Which plan includes memberships?", a: "Memberships and recurring billing are part of Enterprise." },
      { q: "Can members pause?", a: "Yes — memberships can be active, paused or cancelled at any time." },
    ],
    related: ["payments", "workflow-automations", "profit-analytics"],
  },
  {
    slug: "team-payroll",
    title: "Team, Time & Commissions",
    eyebrow: "People ops",
    headline: "Pay your team right, without a spreadsheet.",
    subhead:
      "Clock-ins, hourly wages, tips and commissions calculated per technician and per job. Run payroll in minutes, and show your best installers exactly what they earned.",
    image: "/images/ceramic-polish.webp",
    imageAlt: "Close-up of a technician's hands polishing paint with a machine polisher",
    plan: "express",
    seo: {
      title: "Time Clock, Payroll & Commissions for Detailers",
      description:
        "Track technician hours, tips and commissions for detailing and PPF shops. Unlimited users, role-based access and payroll-ready reports.",
      keywords: ["detailing payroll", "technician commission tracking", "time clock app for detailers", "shop employee management"],
    },
    stats: [
      { value: "Unlimited", label: "users on every plan" },
      { value: "4 roles", label: "owner, admin, manager, tech" },
      { value: "1 click", label: "payroll export" },
    ],
    benefits: [
      { title: "Time clock built in", body: "One-tap clock in/out from the top bar on any device, optionally tied to a job.", icon: Clock },
      { title: "Commissions & tips", body: "Set commission percentages per technician; tips flow from payments to the right people.", icon: CircleDollarSign },
      { title: "Role-based access", body: "Technicians see their work; managers see the money. Permissions keep it that way.", icon: Lock },
    ],
    steps: [
      { title: "Invite your team", body: "Unlimited users with roles and pay rates." },
      { title: "Work & clock", body: "Techs clock in, take jobs and collect tips." },
      { title: "Run payroll", body: "Earnings reports total wages, tips and commission." },
    ],
    highlights: ["Unlimited users", "Role permissions", "Time clock", "Hourly wages", "Tips attribution", "Commissions (Enterprise)"],
    faqs: [
      { q: "Do I pay per user?", a: "Never. Every Lustra plan includes unlimited users." },
      { q: "Is commission tracking on every plan?", a: "Commission tracking is part of Enterprise; time clock, wages and tips are on every plan." },
    ],
    related: ["smart-scheduling", "profit-analytics", "live-job-board"],
  },
  {
    slug: "inventory",
    title: "Inventory",
    eyebrow: "Film, coatings & chemicals",
    headline: "Never run out of film mid-install again.",
    subhead:
      "Track rolls of PPF, bottles of coating, pads and chemicals with reorder levels, costs and suppliers. Low-stock alerts land in your notifications before they become a Saturday emergency.",
    image: "/images/ppf-install.webp",
    imageAlt: "Paint protection film being laid onto a car hood",
    plan: "express",
    seo: {
      title: "Inventory Tracking for Detailing & PPF Shops",
      description:
        "Track PPF film, ceramic coatings and detailing chemicals with reorder levels, costs and low-stock alerts.",
      keywords: ["detailing inventory software", "PPF film inventory", "coating stock tracking", "car wash chemical inventory"],
    },
    stats: [
      { value: "Real-time", label: "stock levels" },
      { value: "Alerts", label: "before you run out" },
      { value: "COGS", label: "visibility per job" },
    ],
    benefits: [
      { title: "Reorder levels", body: "Set a threshold per item and get alerted when stock dips below it.", icon: PackageCheck },
      { title: "Adjustment history", body: "Every add or usage is logged with who, when and why.", icon: Clock },
      { title: "Know your margins", body: "Item costs feed profit analytics so you see what each job really earns.", icon: LineChart },
    ],
    steps: [
      { title: "Add your products", body: "Name, SKU, unit, cost, supplier and location." },
      { title: "Adjust as you go", body: "Log usage or receive stock in two taps." },
      { title: "Reorder on time", body: "Low-stock alerts keep the shelves full." },
    ],
    highlights: ["Unlimited SKUs", "Reorder thresholds", "Cost tracking", "Supplier & location", "Adjustment log", "Low-stock alerts"],
    faqs: [{ q: "Is inventory included on Express?", a: "Yes. Inventory tracking is included on every plan." }],
    related: ["profit-analytics", "team-payroll", "payments"],
  },
  {
    slug: "profit-analytics",
    title: "Profit Analytics",
    eyebrow: "Know your numbers",
    headline: "The numbers that actually grow a shop.",
    subhead:
      "Revenue trends, average ticket, quote conversion, pipeline value, revenue by service category, lead sources and technician leaderboards — live, beautiful and decision-ready.",
    image: "/images/hero-supercar.webp",
    imageAlt: "Supercar with butterfly doors open at a night event",
    plan: "pro",
    seo: {
      title: "Analytics & Reporting for Detailing Businesses",
      description:
        "Live revenue, conversion, pipeline and technician analytics for auto detailing, PPF, tint and wrap shops.",
      keywords: ["detailing business analytics", "auto detailing reports", "shop revenue dashboard", "PPF shop KPIs"],
    },
    stats: [
      { value: "8 KPIs", label: "on one screen" },
      { value: "365d", label: "trend history" },
      { value: "Live", label: "updates" },
    ],
    benefits: [
      { title: "Revenue & ticket trends", body: "Daily revenue and job counts with period-over-period change.", icon: TrendingUp },
      { title: "Where money comes from", body: "Revenue by category and lead source shows which services and channels to double down on.", icon: LineChart },
      { title: "Team performance", body: "Technician leaderboards by jobs and revenue — fair, transparent and motivating.", icon: Users },
    ],
    steps: [
      { title: "Work normally", body: "Every job, quote and payment feeds analytics automatically." },
      { title: "Pick a range", body: "7, 30, 90 or 365 days." },
      { title: "Act on it", body: "Spot slow services, strong channels and pipeline gaps." },
    ],
    highlights: ["Revenue & job trends", "Average ticket", "Quote conversion", "Pipeline by stage", "Lead sources", "Technician leaderboard"],
    faqs: [{ q: "Is profit analytics on every plan?", a: "Basic analytics are on every plan; profit analytics are included in Pro and Enterprise." }],
    related: ["payments", "team-payroll", "inventory"],
  },
  {
    slug: "mobile-routing",
    title: "Mobile Routing",
    eyebrow: "For crews on the road",
    headline: "More driveways per day, fewer miles per job.",
    subhead:
      "Plan the day's stops in the smartest order, send on-my-way texts with ETAs, navigate in one tap and take payment in the driveway.",
    image: "/images/mobile-detailing.webp",
    imageAlt: "Mobile detailer cleaning a car on location in a driveway",
    plan: "express",
    seo: {
      title: "Route Planning App for Mobile Detailers",
      description:
        "Optimize mobile detailing routes, send on-my-way ETA texts and collect payment on-site with Lustra.",
      keywords: ["mobile detailing app", "mobile detailing route planner", "on my way text app", "mobile car wash software"],
    },
    stats: [
      { value: "+1.4", label: "extra jobs per day" },
      { value: "−22%", label: "drive time" },
      { value: "1 tap", label: "navigation" },
    ],
    benefits: [
      { title: "Optimized stop order", body: "Reorder the day to minimize backtracking between appointments.", icon: MapPinned },
      { title: "On-my-way texts", body: "Customers get a heads-up with an ETA so the car is unlocked and ready.", icon: BellRing },
      { title: "Driveway checkout", body: "Tap-to-pay and tips on-site — invoice closed before you pull away.", icon: Wallet },
    ],
    steps: [
      { title: "Book the day", body: "Jobs with addresses fill your route." },
      { title: "Optimize", body: "Get the most efficient order." },
      { title: "Roll out", body: "Navigate, notify, detail, get paid." },
    ],
    highlights: ["Route optimization", "Google/Apple Maps handoff", "ETA texts", "On-site payments", "Offline-friendly PWA", "Cloud sync"],
    faqs: [{ q: "Does it work for multiple vans?", a: "Yes — assign jobs to technicians and each sees their own route." }],
    related: ["messaging", "payments", "smart-scheduling"],
  },
  {
    slug: "ai-insights",
    title: "AI Insights",
    eyebrow: "New · Predictive intelligence",
    headline: "Know next month's revenue — and who's about to leave.",
    subhead:
      "Lustra studies your jobs, invoices and visit patterns to forecast the next 30 days, flag customers drifting past their usual cadence, and surface dollar-sized opportunities: quotes to follow up, coating anniversaries, idle bay-hours, unpaid invoices. Every insight comes with a one-click action.",
    image: "/images/mustang-dusk.webp",
    imageAlt: "Black performance coupe at dusk, representing a shop's next opportunity",
    plan: "pro",
    seo: {
      title: "AI Insights — Revenue Forecasts & Churn Radar",
      description:
        "AI-powered revenue forecasting, customer churn prediction and actionable growth opportunities for detailing, PPF and tint shops.",
      keywords: ["detailing business forecasting", "customer churn detailing", "AI for detailing shops", "shop growth insights"],
    },
    stats: [
      { value: "30-day", label: "revenue forecast with range" },
      { value: "7", label: "opportunity detectors" },
      { value: "0–100", label: "shop health score" },
    ],
    benefits: [
      { title: "Revenue forecast", body: "A 30-day projection with a confidence band, built from your seasonality, booked jobs and trend — so payroll and promos are planned, not guessed.", icon: LineChart },
      { title: "Churn radar", body: "Lustra learns each customer's normal visit interval and flags the ones running late — sorted by lifetime value so you save the right relationships first.", icon: HeartPulse },
      { title: "Opportunities with a price tag", body: "Unfollowed quotes, coating anniversaries, idle capacity, lapsed VIPs and unpaid invoices — each with an estimated dollar impact.", icon: Target },
      { title: "One-click action", body: "Every insight links straight to the fix: a campaign, a filtered list, a quote or a booking slot.", icon: MousePointerClick },
    ],
    steps: [
      { title: "Lustra watches the data", body: "Jobs, quotes, invoices, memberships and inventory feed the models automatically." },
      { title: "Insights rank themselves", body: "Opportunities are sorted by estimated revenue impact, refreshed continuously." },
      { title: "You act in a click", body: "Launch a win-back campaign or follow up a quote straight from the card." },
    ],
    highlights: ["30-day revenue forecast", "Per-customer churn risk", "Opportunity feed with $ impact", "Shop health score", "Low-stock & unpaid alerts", "Actionable deep links"],
    faqs: [
      { q: "Do I need to configure anything?", a: "No. Insights start working from your existing jobs and invoices. The more history you have, the sharper the forecast — imported history counts too." },
      { q: "Which plan includes AI Insights?", a: "AI Insights is included in Pro and Enterprise." },
      { q: "Is my data used to train models for other shops?", a: "No. Insights are computed for your account only." },
    ],
    related: ["smart-campaigns", "profit-analytics", "reputation-hub"],
  },
  {
    slug: "smart-campaigns",
    title: "Smart Campaigns",
    eyebrow: "New · Marketing that books jobs",
    headline: "Send the right offer to the right cars — and see what it booked.",
    subhead:
      "Target smart segments like ‘coating anniversary this month’, ‘lapsed 90 days’, ‘VIPs’ or ‘members’, send a personalized SMS or email in two minutes, and track delivered, booked and revenue for every campaign.",
    image: "/images/red-coupe.webp",
    imageAlt: "Bright red coupe — the kind of returning customer a campaign brings back",
    plan: "pro",
    seo: {
      title: "SMS & Email Marketing Campaigns for Detailers",
      description:
        "Segmented SMS and email campaigns for detailing, ceramic coating and PPF shops — lapsed customers, coating anniversaries, VIPs and members — with booking and revenue tracking.",
      keywords: ["detailing marketing", "car detailing SMS marketing", "detailing email campaigns", "win back detailing customers"],
    },
    stats: [
      { value: "98%", label: "SMS open rate" },
      { value: "7", label: "smart segments" },
      { value: "$ ROI", label: "tracked per campaign" },
    ],
    benefits: [
      { title: "Segments that mean something", body: "Not just ‘everyone’ — coating anniversaries, customers due for maintenance, lapsed regulars, VIPs, members or any tag.", icon: Filter },
      { title: "Personal at scale", body: "Merge fields like {{customer.firstName}} and vehicle details make a blast read like a text from you.", icon: Send },
      { title: "Measured in bookings", body: "See recipients, deliveries, jobs booked and revenue attributed to every campaign — not just opens.", icon: LineChart },
    ],
    steps: [
      { title: "Pick a segment", body: "Preview exactly who's in it before you write a word." },
      { title: "Write or use a template", body: "SMS or email, with merge fields and your booking link." },
      { title: "Send & track", body: "Watch delivered, booked and revenue roll in." },
    ],
    highlights: ["SMS & email", "Smart segments + tags", "Live audience preview", "Merge fields", "Booking & revenue attribution", "Opt-out handling built in"],
    faqs: [
      { q: "Do campaigns respect opt-outs?", a: "Yes. Customers who opted out of marketing are excluded automatically, and every SMS includes opt-out instructions." },
      { q: "Which plan includes campaigns?", a: "Smart Campaigns are included in Pro and Enterprise." },
    ],
    related: ["ai-insights", "workflow-automations", "promotions-gift-cards"],
  },
  {
    slug: "reputation-hub",
    title: "Reputation Hub",
    eyebrow: "New · Reviews on autopilot",
    headline: "More five-star reviews. Every reply in seconds.",
    subhead:
      "Request reviews automatically after every job, see Google, Facebook, Yelp and in-app reviews in one feed, and reply with AI-drafted responses that sound like you. Every customer is invited to share publicly — no review gating.",
    image: "/images/foam-wash.webp",
    imageAlt: "Freshly foamed red car — a happy customer moment worth a review",
    plan: "pro",
    seo: {
      title: "Review Management for Detailers — AI Replies",
      description:
        "Get more Google reviews for your detailing, PPF or tint shop with automatic review requests, a unified review feed and AI-suggested replies.",
      keywords: ["detailing google reviews", "review management detailing", "get more reviews car detailing", "AI review replies"],
    },
    stats: [
      { value: "3.4×", label: "more reviews per month" },
      { value: "<10s", label: "to reply with AI drafts" },
      { value: "1 feed", label: "for every source" },
    ],
    benefits: [
      { title: "Automatic requests", body: "A friendly text goes out after completion with a one-tap rating page that offers your Google profile to every customer.", icon: Send },
      { title: "One unified feed", body: "Google, Facebook, Yelp and Lustra reviews with average rating, distribution and response rate at a glance.", icon: Star },
      { title: "AI-suggested replies", body: "Tone-matched reply drafts for praise and complaints alike — edit, approve, done.", icon: MessageSquareReply },
    ],
    steps: [
      { title: "Job completed", body: "Review request is sent automatically (or manually from any job)." },
      { title: "Customer rates", body: "They rate in one tap and are invited to post publicly." },
      { title: "You respond", body: "Pick an AI draft, personalize, reply." },
    ],
    highlights: ["Automatic review requests", "Multi-source feed", "Rating distribution & trends", "Response-rate tracking", "AI reply suggestions", "No review gating"],
    faqs: [
      { q: "Do you filter out unhappy customers?", a: "No. Every customer is offered the public review link. Lustra helps you respond quickly and professionally to every review instead." },
      { q: "Which plan includes the Reputation Hub?", a: "Pro and Enterprise." },
    ],
    related: ["smart-campaigns", "messaging", "ai-insights"],
  },
  {
    slug: "promotions-gift-cards",
    title: "Coupons & Gift Cards",
    eyebrow: "Promotions",
    headline: "Promo codes and e-gift cards that redeem themselves.",
    subhead:
      "Create percent or fixed-amount coupons with minimum spend, usage limits, expiry and category rules. Sell branded e-gift cards with live balances. Both apply at checkout, in online booking and on invoices — tracked to the dollar.",
    image: "/images/night-performance.webp",
    imageAlt: "Sports car with glowing tail lights — a perfect gift-card detail",
    plan: "express",
    seo: {
      title: "Coupons & E-Gift Cards for Detailing Businesses",
      description:
        "Create detailing coupons, promo codes and e-gift cards with usage limits, expiry and live balances — redeemable at booking and checkout.",
      keywords: ["detailing gift cards", "car detailing coupons", "promo codes for detailing", "e-gift card detailing"],
    },
    stats: [
      { value: "Q4", label: "gift cards = free cash flow" },
      { value: "100%", label: "redemptions tracked" },
      { value: "Every", label: "plan includes it" },
    ],
    benefits: [
      { title: "Rules you control", body: "Percent or fixed, minimum spend, max uses, expiry and service categories — so a promo never eats your margin.", icon: Percent },
      { title: "Gift cards with balances", body: "Unique codes like GC-8F3K-2QPL, partial redemptions and a full transaction history.", icon: Gift },
      { title: "Redeem anywhere", body: "Apply at online booking, on invoices or at checkout — balances and uses update instantly.", icon: Ticket },
    ],
    steps: [
      { title: "Create a code or card", body: "Set the rules or the starting balance." },
      { title: "Share it", body: "Campaigns, social posts, or a gift card emailed to the recipient." },
      { title: "Redeem & report", body: "Discounts and balances reconcile automatically." },
    ],
    highlights: ["Percent & fixed coupons", "Min spend & usage caps", "Category restrictions", "E-gift cards with balances", "Partial redemptions", "Redemption history"],
    faqs: [
      { q: "Can customers use a gift card for part of a bill?", a: "Yes. Gift cards support partial redemptions; the remaining balance stays on the card." },
      { q: "Is this included on Express?", a: "Yes — coupons and e-gift cards are included on every plan." },
    ],
    related: ["smart-campaigns", "payments", "online-booking"],
  },
  {
    slug: "lead-forms",
    title: "Custom Lead Forms",
    eyebrow: "Lead capture",
    headline: "Forms that turn website visitors into quoted leads.",
    subhead:
      "Build branded forms with vehicle, service, date and custom fields in minutes. Embed them anywhere or share the link — every submission creates the customer, the vehicle and a lead on your board, and pings your team instantly.",
    image: "/images/tint-dark.webp",
    imageAlt: "Dark tinted sedan — the kind of quote request a lead form captures",
    plan: "pro",
    seo: {
      title: "Custom Lead Forms for Detailing & PPF Shops",
      description:
        "Build embeddable quote request forms with vehicle and service fields that create customers and leads automatically in Lustra.",
      keywords: ["detailing quote form", "PPF quote request form", "lead capture form detailing", "website lead form car detailing"],
    },
    stats: [
      { value: "9", label: "field types incl. vehicle" },
      { value: "0", label: "copy-paste into your CRM" },
      { value: "Instant", label: "team notification" },
    ],
    benefits: [
      { title: "Built for vehicles", body: "Year/make/model and service pickers are native field types — no hacky dropdowns.", icon: ListChecks },
      { title: "Straight to the board", body: "Submissions create or match the customer, add the vehicle and drop a lead into your pipeline.", icon: Workflow },
      { title: "Embed anywhere", body: "Your site, Instagram bio, Google Business Profile or a QR code at events.", icon: Link2 },
    ],
    steps: [
      { title: "Design the form", body: "Pick fields, labels, required rules and your success message." },
      { title: "Publish", body: "Share the hosted link or embed it." },
      { title: "Quote fast", body: "Leads arrive on the board ready for Copilot." },
    ],
    highlights: ["Drag-and-drop fields", "Vehicle & service fields", "Hosted link + embed", "Auto customer matching", "Lead creation & alerts", "Submission history"],
    faqs: [
      { q: "Does it create duplicates for returning customers?", a: "No. Lustra matches submissions to existing customers by email or phone." },
      { q: "Which plan includes custom lead forms?", a: "Pro and Enterprise." },
    ],
    related: ["quote-copilot", "online-booking", "live-job-board"],
  },
  {
    slug: "supplier-marketplace",
    title: "Supplier Marketplace",
    eyebrow: "Supplies at member pricing",
    headline: "Order film and chemicals without leaving the app.",
    subhead:
      "Shop coatings, PPF, tint, chemicals, towels and tools at member pricing. Every order earns 2% back as credit, and when the box arrives one tap adds it to inventory — no re-typing SKUs.",
    image: "/images/ppf-install.webp",
    imageAlt: "PPF roll being applied — supplies ordered through the marketplace",
    plan: "pro",
    seo: {
      title: "Detailing Supply Marketplace with Member Pricing",
      description:
        "Order ceramic coatings, PPF, tint film and detailing chemicals at member pricing with 2% credit back, synced straight into inventory.",
      keywords: ["detailing supplies", "PPF film supplier", "ceramic coating wholesale", "detailing chemicals ordering"],
    },
    stats: [
      { value: "2%", label: "credit back on every order" },
      { value: "1 tap", label: "receive into inventory" },
      { value: "7", label: "supply categories" },
    ],
    benefits: [
      { title: "Member pricing", body: "Pro and Enterprise shops see member prices on every product.", icon: Coins },
      { title: "Inventory-synced", body: "Mark an order received and quantities land in inventory, matched by SKU.", icon: Package },
      { title: "Credit that compounds", body: "2% of every order is credited to your account for future purchases.", icon: Store },
    ],
    steps: [
      { title: "Browse & add", body: "Search by category or name; compare list vs member price." },
      { title: "Place the order", body: "Credit is applied and earned automatically." },
      { title: "Receive", body: "One tap adds stock to inventory." },
    ],
    highlights: ["Coatings, PPF, tint & chemicals", "Member pricing", "2% credit back", "Order history", "Receive-to-inventory", "Low-stock reorder links"],
    faqs: [{ q: "Which plan includes the marketplace?", a: "Marketplace access with member pricing is included in Pro and Enterprise." }],
    related: ["inventory", "profit-analytics", "integrations-api"],
  },
  {
    slug: "integrations-api",
    title: "Integrations & API",
    eyebrow: "New · Open platform",
    headline: "Connect Lustra to everything you already use.",
    subhead:
      "Stripe and Square on every plan, QuickBooks Online on Pro, and on Enterprise a full developer platform: API keys, signed webhooks for every event and Zapier for 6,000+ apps. Plus one-click CSV import and export — your data is always yours.",
    image: "/images/hero-supercar.webp",
    imageAlt: "Supercar with doors raised — a connected, high-performance platform",
    plan: "express",
    seo: {
      title: "Integrations & API — QuickBooks, Stripe, Zapier",
      description:
        "Lustra integrates with QuickBooks, Stripe, Square, Zapier, Twilio and more, with a developer API, signed webhooks and CSV import/export.",
      keywords: ["detailing software QuickBooks", "detailing API", "detailing webhooks", "Zapier detailing", "detailing CRM integrations"],
    },
    stats: [
      { value: "8", label: "native integrations" },
      { value: "HMAC", label: "signed webhooks" },
      { value: "CSV", label: "import & export" },
    ],
    benefits: [
      { title: "Accounting in sync", body: "Invoices and payments flow to QuickBooks Online automatically (Pro+).", icon: Receipt },
      { title: "API keys & webhooks", body: "Create scoped API keys and subscribe endpoints to job, quote, invoice, booking and lead events — signed with HMAC-SHA256 (Enterprise).", icon: Webhook },
      { title: "Zapier & beyond", body: "Trigger anything in 6,000+ apps when something happens in your shop (Enterprise).", icon: Plug },
      { title: "Your data, portable", body: "Import customers from any tool and export customers, jobs, invoices and payments as CSV on every plan.", icon: FileSpreadsheet },
    ],
    steps: [
      { title: "Connect", body: "Authorize QuickBooks, Stripe, Square and more in one click." },
      { title: "Automate", body: "Add webhooks or Zapier zaps for custom workflows." },
      { title: "Build", body: "Use your API key to read and write data from your own tools." },
    ],
    highlights: ["Stripe & Square (all plans)", "QuickBooks Online (Pro+)", "Zapier (Enterprise)", "API keys (Enterprise)", "Signed webhooks with delivery log", "CSV import & export"],
    faqs: [
      { q: "How are webhooks secured?", a: "Every delivery includes an X-Lustra-Signature header — an HMAC-SHA256 of the raw body using your endpoint's secret — so you can verify it came from Lustra." },
      { q: "Which plans include what?", a: "Stripe, Square and CSV import/export are on every plan; QuickBooks on Pro and Enterprise; API keys, webhooks and Zapier on Enterprise." },
    ],
    related: ["payments", "workflow-automations", "supplier-marketplace"],
  },
];

export const featureBySlug = (slug: string) => features.find((f) => f.slug === slug);

