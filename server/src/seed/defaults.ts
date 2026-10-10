import type { Industry, ServiceCategory, Trigger, ActionType } from '../models/common.js';

export interface ServiceSeed {
  name: string;
  category: ServiceCategory;
  basePrice: number;
  durationMinutes: number;
  description: string;
  keywords: string[];
  color: string;
  bookable?: boolean;
}

const C = {
  detailing: '#38bdf8',
  ceramic: '#a78bfa',
  ppf: '#22d3ee',
  tint: '#64748b',
  wrap: '#f472b6',
  correction: '#fbbf24',
  interior: '#34d399',
  maintenance: '#60a5fa',
  marine: '#2dd4bf',
  lawn: '#4ade80',
} as const;

const AUTO_SERVICES: ServiceSeed[] = [
  { name: 'Maintenance Wash', category: 'maintenance', basePrice: 79, durationMinutes: 60, color: C.maintenance, description: 'pH-neutral two-bucket hand wash, wheels, tires, glass and quick interior wipe-down.', keywords: ['maintenance wash', 'wash', 'upkeep', 'monthly'] },
  { name: 'Full Detail', category: 'detailing', basePrice: 249, durationMinutes: 240, color: C.detailing, description: 'Complete inside-and-out reset: decon wash, clay, sealant, deep interior vacuum, steam and leather care.', keywords: ['full detail', 'detail', 'inside and out', 'complete detail'] },
  { name: 'Exterior Decon & Sealant', category: 'detailing', basePrice: 149, durationMinutes: 150, color: C.detailing, description: 'Iron & tar decontamination, clay bar and 6-month paint sealant.', keywords: ['decon', 'clay', 'sealant', 'exterior'] },
  { name: 'Engine Bay Detail', category: 'detailing', basePrice: 89, durationMinutes: 60, color: C.detailing, description: 'Safe degrease, steam and dress of the engine bay.', keywords: ['engine bay', 'engine'] },
  { name: 'Interior Deep Clean', category: 'interior', basePrice: 189, durationMinutes: 180, color: C.interior, description: 'Hot-water extraction, steam, pet hair removal, stain treatment and leather conditioning.', keywords: ['interior', 'pet hair', 'stains', 'shampoo', 'odor', 'seats', 'carpet'] },
  { name: 'Paint Correction — Stage 1', category: 'correction', basePrice: 450, durationMinutes: 360, color: C.correction, description: 'One-step machine polish removing 60–70% of swirls and light defects.', keywords: ['stage 1', 'one step', 'paint enhancement', 'polish', 'light swirls'] },
  { name: 'Paint Correction — Stage 2', category: 'correction', basePrice: 850, durationMinutes: 720, color: C.correction, description: 'Two-step compound + polish removing 85–95% of swirls, holograms and moderate scratches.', keywords: ['stage 2', 'two step', 'compound', 'heavy swirls', 'scratches'] },
  { name: 'Ceramic Coating — 1 Year', category: 'ceramic', basePrice: 699, durationMinutes: 300, color: C.ceramic, description: 'Entry ceramic coating with 12 months of gloss and hydrophobic protection.', keywords: ['1 year', 'one year', 'entry coating'] },
  { name: 'Ceramic Coating — 5 Year', category: 'ceramic', basePrice: 1299, durationMinutes: 480, color: C.ceramic, description: 'Professional multi-layer ceramic coating with 5-year warranty certificate.', keywords: ['5 year', 'five year', 'ceramic coating'] },
  { name: 'Ceramic Coating — 9H Lifetime', category: 'ceramic', basePrice: 1999, durationMinutes: 720, color: C.ceramic, description: 'Flagship 9H coating on paint, wheels, glass and trim with a lifetime warranty.', keywords: ['lifetime', '9h', 'flagship', 'wheels off'] },
  { name: 'Full Front PPF', category: 'ppf', basePrice: 1800, durationMinutes: 600, color: C.ppf, description: 'Self-healing PPF on full hood, fenders, bumper and mirrors.', keywords: ['full front', 'front ppf', 'front end', 'front pp'] },
  { name: 'Track Pack PPF', category: 'ppf', basePrice: 2400, durationMinutes: 780, color: C.ppf, description: 'Full front plus rockers, A-pillars, roof leading edge and rear impact zones.', keywords: ['track pack', 'track'] },
  { name: 'Full Body PPF', category: 'ppf', basePrice: 6500, durationMinutes: 2400, color: C.ppf, description: 'Every painted panel wrapped in self-healing, stain-resistant film.', keywords: ['full body', 'whole car', 'entire car'] },
  { name: 'Ceramic Window Tint', category: 'tint', basePrice: 399, durationMinutes: 180, color: C.tint, description: 'Nano-ceramic film on all side and rear windows — up to 98% IR rejection.', keywords: ['ceramic tint', 'window tint', 'tint', 'windows'] },
  { name: 'Windshield Tint', category: 'tint', basePrice: 199, durationMinutes: 90, color: C.tint, description: 'Clear-to-light ceramic windshield film for heat rejection.', keywords: ['windshield'] },
  { name: 'Color Change Wrap', category: 'wrap', basePrice: 3800, durationMinutes: 2400, color: C.wrap, description: 'Premium cast vinyl color change with door jambs optional.', keywords: ['color change', 'wrap', 'vinyl', 'satin', 'matte'] },
  { name: 'Chrome Delete', category: 'wrap', basePrice: 650, durationMinutes: 300, color: C.wrap, description: 'Gloss or satin black wrap on window trim, badges and grille.', keywords: ['chrome delete', 'dechrome', 'blackout'] },
];

const MARINE_SERVICES: ServiceSeed[] = [
  { name: 'Boat Wash & Wax', category: 'marine', basePrice: 18, durationMinutes: 180, color: C.marine, description: 'Per-foot hull and deck wash with marine wax.', keywords: ['wash', 'wax', 'boat wash'] },
  { name: 'Boat Oxidation Removal', category: 'marine', basePrice: 899, durationMinutes: 600, color: C.marine, description: 'Gelcoat compound & polish restoring chalky, oxidized hulls.', keywords: ['oxidation', 'gelcoat', 'chalky', 'restore'] },
  { name: 'Marine Ceramic Coating', category: 'ceramic', basePrice: 1899, durationMinutes: 900, color: C.ceramic, description: 'Marine-grade ceramic for gelcoat, metal and glass.', keywords: ['ceramic', 'coating'] },
  { name: 'Teak & Interior Refresh', category: 'interior', basePrice: 349, durationMinutes: 240, color: C.interior, description: 'Teak cleaning & brightening, vinyl upholstery and cabin clean.', keywords: ['teak', 'interior', 'upholstery', 'cabin'] },
];

const LAWN_SERVICES: ServiceSeed[] = [
  { name: 'Weekly Mow & Edge', category: 'lawn', basePrice: 55, durationMinutes: 60, color: C.lawn, description: 'Mow, edge, trim and blow — standard residential lot.', keywords: ['mow', 'mowing', 'edge', 'weekly'] },
  { name: 'Core Aeration', category: 'lawn', basePrice: 149, durationMinutes: 90, color: C.lawn, description: 'Core aeration for healthier roots and better water uptake.', keywords: ['aeration', 'aerate'] },
  { name: 'Mulch Installation', category: 'lawn', basePrice: 320, durationMinutes: 240, color: C.lawn, description: 'Bed edging plus premium hardwood mulch (up to 5 yards).', keywords: ['mulch', 'beds'] },
  { name: 'Hedge & Shrub Trimming', category: 'lawn', basePrice: 120, durationMinutes: 120, color: C.lawn, description: 'Shape and trim hedges and shrubs, haul away clippings.', keywords: ['hedge', 'shrub', 'trim'] },
  { name: 'Seasonal Cleanup', category: 'lawn', basePrice: 260, durationMinutes: 240, color: C.lawn, description: 'Leaf removal, bed cleanup and first cut of the season.', keywords: ['cleanup', 'leaves', 'spring', 'fall'] },
];

const FLAT_GLASS_SERVICES: ServiceSeed[] = [
  { name: 'Residential Window Film (per sq ft)', category: 'tint', basePrice: 9, durationMinutes: 240, color: C.tint, description: 'Heat & UV rejection film for homes.', keywords: ['residential', 'home', 'house'] },
  { name: 'Commercial Window Film (per sq ft)', category: 'tint', basePrice: 7, durationMinutes: 480, color: C.tint, description: 'Solar control film for storefronts and offices.', keywords: ['commercial', 'office', 'storefront'] },
  { name: 'Privacy / Decorative Film', category: 'tint', basePrice: 12, durationMinutes: 180, color: C.tint, description: 'Frosted, gradient or custom decorative film.', keywords: ['privacy', 'frosted', 'decorative'] },
  { name: 'Security Film', category: 'tint', basePrice: 15, durationMinutes: 360, color: C.tint, description: 'Shatter-resistant safety and security film.', keywords: ['security', 'safety', 'shatter'] },
];

export function defaultServices(industry: Industry): ServiceSeed[] {
  switch (industry) {
    case 'marine':
      return [...MARINE_SERVICES, ...AUTO_SERVICES.filter((s) => s.category === 'detailing').slice(0, 1)];
    case 'landscaping':
    case 'lawn-care':
      return LAWN_SERVICES;
    case 'flat-glass':
      return FLAT_GLASS_SERVICES;
    default:
      return AUTO_SERVICES;
  }
}

export interface AutomationTemplate {
  key: string;
  name: string;
  description: string;
  trigger: Trigger;
  conditions: { field: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains'; value: unknown }[];
  actions: { type: ActionType; config: Record<string, unknown> }[];
  plan: 'express' | 'pro' | 'enterprise';
  enabledByDefault: boolean;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: 'booking-confirmation',
    name: 'Booking confirmation',
    description: 'Instantly confirm online bookings by SMS with the live job portal link.',
    trigger: 'booking.created',
    conditions: [],
    actions: [
      { type: 'send_sms', config: { template: 'Hi {{customer.firstName}}! You are booked with {{shop.name}} for your {{vehicle.label}}. Track everything live: {{portalLink}}' } },
      { type: 'notify_team', config: { title: 'New online booking: {{customer.firstName}} {{customer.lastName}}', body: 'Job #{{job.number}} · {{vehicle.label}}' } },
    ],
    plan: 'express',
    enabledByDefault: true,
  },
  {
    key: 'on-my-way',
    name: '"Work started" update',
    description: 'Let customers know the moment work begins on their vehicle.',
    trigger: 'job.stage_changed',
    conditions: [{ field: 'stage', op: 'eq', value: 'in_progress' }],
    actions: [{ type: 'send_sms', config: { template: 'Good news {{customer.firstName}} — our team just started on your {{vehicle.label}}. Follow along: {{portalLink}}' } }],
    plan: 'express',
    enabledByDefault: true,
  },
  {
    key: 'job-complete-review',
    name: 'Ready for pickup + review request',
    description: 'Text when the job is done, then ask for a Google review 2 hours later.',
    trigger: 'job.completed',
    conditions: [],
    actions: [
      { type: 'send_sms', config: { template: 'Your {{vehicle.label}} is ready, {{customer.firstName}}! ✨ View photos & pay here: {{portalLink}}' } },
      { type: 'wait', config: { hours: 2 } },
      { type: 'send_sms', config: { template: 'Thanks for trusting {{shop.name}}! Would you mind leaving us a quick review? It means the world to a small shop 🙏' } },
      { type: 'add_tag', config: { tag: 'review-requested' } },
    ],
    plan: 'express',
    enabledByDefault: true,
  },
  {
    key: 'quote-followup',
    name: 'Quote follow-up',
    description: 'Nudge customers who have not approved a quote after 2 days.',
    trigger: 'quote.sent',
    conditions: [],
    actions: [
      { type: 'wait', config: { days: 2 } },
      { type: 'send_sms', config: { template: 'Hi {{customer.firstName}}, just checking in on your quote #{{quote.number}} ({{quote.total}}). Approve in one tap: {{portalLink}}' } },
    ],
    plan: 'pro',
    enabledByDefault: true,
  },
  {
    key: 'quote-approved-alert',
    name: 'Quote approved alert',
    description: 'Notify the team and tag the customer when a quote is approved.',
    trigger: 'quote.approved',
    conditions: [],
    actions: [
      { type: 'notify_team', config: { title: 'Quote #{{quote.number}} approved 🎉', body: '{{customer.firstName}} {{customer.lastName}} approved {{quote.total}}' } },
      { type: 'add_tag', config: { tag: 'approved-quote' } },
    ],
    plan: 'pro',
    enabledByDefault: true,
  },
  {
    key: 'payment-thank-you',
    name: 'Payment receipt & thank you',
    description: 'Email a receipt as soon as an invoice is paid in full.',
    trigger: 'invoice.paid',
    conditions: [],
    actions: [
      { type: 'send_email', config: { subject: 'Receipt for invoice #{{invoice.number}}', template: 'Hi {{customer.firstName}},\n\nThanks for your payment of {{invoice.total}} to {{shop.name}}. Your receipt and warranty details live here: {{portalLink}}\n\nSee you next time!' } },
    ],
    plan: 'express',
    enabledByDefault: true,
  },
  {
    key: 'overdue-reminder',
    name: 'Overdue payment reminder',
    description: 'Automatically remind customers about overdue balances.',
    trigger: 'invoice.overdue',
    conditions: [],
    actions: [
      { type: 'send_sms', config: { template: 'Friendly reminder from {{shop.name}}: invoice #{{invoice.number}} has a balance of {{invoice.balance}}. Pay securely: {{portalLink}}' } },
      { type: 'notify_team', config: { title: 'Invoice #{{invoice.number}} is overdue', body: '{{customer.firstName}} {{customer.lastName}} · {{invoice.balance}} outstanding' } },
    ],
    plan: 'enterprise',
    enabledByDefault: true,
  },
  {
    key: 'coating-maintenance',
    name: 'Coating maintenance reminder',
    description: 'Invite ceramic customers back for a maintenance wash 30 days later.',
    trigger: 'job.completed',
    conditions: [{ field: 'job.title', op: 'contains', value: 'ceramic' }],
    actions: [
      { type: 'wait', config: { days: 30 } },
      { type: 'send_sms', config: { marketing: true, template: 'Hi {{customer.firstName}}! It has been a month since your coating — book a maintenance wash to keep that gloss perfect: {{bookingLink}}' } },
    ],
    plan: 'enterprise',
    enabledByDefault: false,
  },
  {
    key: 'welcome-new-customer',
    name: 'Welcome new customers',
    description: 'Send a warm welcome email to every new customer.',
    trigger: 'customer.created',
    conditions: [],
    actions: [{ type: 'send_email', config: { subject: 'Welcome to {{shop.name}}', template: 'Hi {{customer.firstName}}, welcome to {{shop.name}}! Book anytime at {{bookingLink}}.' } }],
    plan: 'enterprise',
    enabledByDefault: false,
  },
  {
    key: 'lead-auto-reply',
    name: 'Instant lead reply',
    description: 'Reply to website leads within seconds and alert the team.',
    trigger: 'lead.created',
    conditions: [],
    actions: [
      { type: 'send_sms', config: { template: 'Hi {{customer.firstName}}, thanks for reaching out to {{shop.name}}! We received your request and will text you a quote shortly. Want to pick a time now? {{bookingLink}}' } },
      { type: 'notify_team', config: { title: 'New lead: {{customer.firstName}} {{customer.lastName}}', body: 'Reply fast — leads contacted within 5 minutes convert 4× better.' } },
    ],
    plan: 'pro',
    enabledByDefault: true,
  },
  {
    key: 'inspection-signed',
    name: 'Inspection signed alert',
    description: 'Tell the team the moment a customer signs a vehicle inspection.',
    trigger: 'inspection.signed',
    conditions: [],
    actions: [{ type: 'notify_team', config: { title: 'Inspection signed by {{customer.firstName}}', body: 'Work can begin on job #{{job.number}}' } }],
    plan: 'enterprise',
    enabledByDefault: true,
  },
];
