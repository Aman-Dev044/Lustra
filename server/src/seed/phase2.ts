/** Phase 2 demo data: geo + mobile routes, promotions, forms, documents, reviews, campaigns, platform. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import {
  ApiKey, CalendarBlock, Campaign, Coupon, DocumentFile, GiftCard, Integration, LeadForm, MarketplaceProduct, Review,
  ReviewRequest, SupplyOrder, Webhook,
} from '../models/growth.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { Service } from '../models/Service.js';
import { Shop } from '../models/Shop.js';
import { Vehicle } from '../models/Vehicle.js';
import { Counter, InventoryItem } from '../models/misc.js';
import { createJob } from '../lib/jobs.js';
import { zonedTime } from '../lib/availability.js';
import { hashApiKey } from '../lib/auth.js';
import { newWebhookSecret } from '../lib/webhooks.js';
import { reviewReplySuggestions } from '../lib/suggestions.js';
import { uploadRoot } from '../lib/uploads.js';
import { round2 } from '../lib/money.js';
import { createRandom } from './random.js';
import { ensureMarketplaceCatalog } from './marketplace.js';
import { DEFAULT_FORM_FIELDS } from '../routes/forms.js';

export const PHASE2_MODELS = [ApiKey, CalendarBlock, Campaign, Coupon, DocumentFile, GiftCard, Integration, LeadForm, Review, ReviewRequest, SupplyOrder, Webhook];

const { rand, int, pick, chance, weighted, shuffle } = createRandom(4242);
const DAY = 86_400_000;
// Demo data follows the machine's timezone so times look right wherever the demo runs (override with SEED_TIMEZONE).
const TZ = process.env.SEED_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
const DEPOT = { address: '500 W 2nd St, Austin, TX 78701', lat: 30.265, lng: -97.747 };

const localDate = (offsetDays: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offsetDays * DAY));
const at = (offsetDays: number, time: string) => zonedTime(localDate(offsetDays), time, TZ);
const weekdayOf = (offsetDays: number) => {
  const [y, m, d] = localDate(offsetDays).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** Uniformly scatter a point within `radiusKm` of the depot. */
function scatter(radiusKm: number) {
  const r = Math.sqrt(rand()) * radiusKm;
  const theta = rand() * 2 * Math.PI;
  return {
    lat: round6(DEPOT.lat + (r * Math.cos(theta)) / 111.32),
    lng: round6(DEPOT.lng + (r * Math.sin(theta)) / (111.32 * Math.cos((DEPOT.lat * Math.PI) / 180))),
  };
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'The ceramic coating on my Model Y is unreal — water just flies off. Marcus and team were super professional.',
    'Best detail shop in Austin, period. My truck looks better than the day I bought it.',
    'Full front PPF install was flawless, you literally cannot see the edges. Highly recommend!',
    'Booked online in a minute, got live updates the whole time, and the interior looks brand new. Pet hair completely gone!',
    'Paint correction removed years of swirls. The gloss is incredible under the sun.',
    'Window tint is perfect and the car is so much cooler now. Friendly staff and fair pricing.',
    'They came to my office and detailed my car in the parking lot. Super convenient and spotless work.',
    'Jordan walked me through the inspection before starting and sent photos after. Amazing communication.',
    'Third time here and they never disappoint. The maintenance plan is totally worth it.',
    'Chrome delete looks factory. Quick turnaround and great attention to detail.',
  ],
  4: [
    'Great results on the ceramic coating. Pickup took a little longer than quoted but worth the wait.',
    'Really happy with the detail. Would be 5 stars if Saturday availability was better.',
    'Solid tint job and friendly team. A bit pricey but you get what you pay for.',
  ],
  3: ['Interior came out good but there was still some dust in the vents. Staff were friendly about fixing it.'],
  2: ['Took much longer than promised and I had to call twice for an update.'],
  1: ['Found a scratch on my door after pickup. Waiting to hear back from the manager.'],
};

const MINIMAL_PDF = (title: string, lines: string[]) => {
  const text = [title, '', ...lines].map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${770 - i * 18} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return body;
};

export async function seedPhase2(input: { shopId: Types.ObjectId; owner: Types.ObjectId; techs: Types.ObjectId[] }) {
  const { shopId: S, owner, techs } = input;
  await ensureMarketplaceCatalog();

  /* ---------- depot & customer geo ---------- */
  await Shop.updateOne({ _id: S }, { $set: { depot: DEPOT, googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJLwPMoJm1RIYRetVp1EtGm10' } });
  const customers = await Customer.find({ shop: S }).select('firstName lastName address email phone').lean();
  const geoById = new Map<string, { lat: number; lng: number }>();
  await Customer.bulkWrite(
    customers.map((c) => {
      const geo = scatter(25);
      geoById.set(String(c._id), geo);
      return { updateOne: { filter: { _id: c._id }, update: { $set: { geo } } } };
    }),
  );
  const vehicles = await Vehicle.find({ shop: S }).select('customer').lean();
  const vehicleOf = new Map(vehicles.map((v) => [String(v.customer), v._id]));
  const services = await Service.find({ shop: S }).lean();
  const svc = (name: string) => services.find((s) => s.name === name)!;

  /* ---------- mobile jobs (existing upcoming ~30%) ---------- */
  const upcoming = await Job.find({ shop: S, stage: { $in: ['scheduled', 'in_progress'] }, scheduledStart: { $gte: at(0, '00:00'), $lt: at(8, '00:00') } });
  // Only short, curbside-friendly work goes mobile — PPF, tint and coatings stay in the bay.
  const MOBILE_CATEGORIES = new Set(['detailing', 'interior', 'maintenance']);
  for (const job of upcoming) {
    const minutes = job.lineItems.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);
    const mobileFriendly = job.lineItems.every((l) => MOBILE_CATEGORIES.has(String(l.category))) && minutes <= 240;
    if (!mobileFriendly || !chance(0.5)) continue;
    const c = customers.find((x) => String(x._id) === String(job.customer));
    job.mobile = true;
    job.serviceAddress = c?.address ?? '';
    job.set('geo', geoById.get(String(job.customer)));
    await job.save();
  }

  // Dedicated mobile routes: 4–8 stops per day for the next week, mostly assigned to 2–3 technicians.
  const MOBILE_PACKAGES = [['Maintenance Wash'], ['Full Detail'], ['Interior Deep Clean'], ['Exterior Decon & Sealant'], ['Maintenance Wash', 'Interior Deep Clean']];
  const mobileTechs = techs.slice(1, 4);
  let mobileCreated = 0;
  for (let d = 0; d <= 6; d++) {
    if (weekdayOf(d) === 0) continue;
    const stops = int(5, 8);
    const dayTechs = shuffle([...mobileTechs]).slice(0, int(2, 3));
    for (let k = 0; k < stops; k++) {
      const customer = pick(customers);
      const pkg = pick(MOBILE_PACKAGES);
      const lineItems = pkg.map((n) => {
        const s = svc(n);
        return { service: s._id, name: s.name, description: s.description, category: s.category, qty: 1, unitPrice: s.basePrice, durationMinutes: s.durationMinutes };
      });
      const minutes = lineItems.reduce((s, l) => s + l.durationMinutes, 0);
      const start = at(d, `${String(8 + Math.floor((k * 9) / stops)).padStart(2, '0')}:${pick(['00', '30'])}`);
      const unassigned = k === stops - 1 && chance(0.6);
      await createJob(
        S,
        {
          customer: customer._id,
          vehicle: vehicleOf.get(String(customer._id)),
          stage: d === 0 && k < 2 ? 'in_progress' : 'scheduled',
          lineItems,
          scheduledStart: start,
          scheduledEnd: new Date(start.getTime() + minutes * 60_000),
          assignees: unassigned ? [] : [dayTechs[k % dayTechs.length]],
          mobile: true,
          serviceAddress: customer.address,
          geo: geoById.get(String(customer._id)),
          tags: ['mobile'],
          notes: pick(['Gate code 4417.', 'Park in driveway, water spigot on left side.', 'Office parking lot, level 2.', 'Customer works from home — knock on side door.', '']),
        },
        { source: 'manual', message: 'Mobile appointment booked', silent: true },
      );
      mobileCreated++;
    }
  }

  /* ---------- historical protection jobs (anniversaries & maintenance reminders) ---------- */
  const history: [number, string[]][] = [
    ...Array.from({ length: 7 }, () => [int(340, 390), ['Paint Correction — Stage 1', 'Ceramic Coating — 5 Year']] as [number, string[]]),
    [362, ['Full Front PPF', 'Ceramic Coating — 5 Year']],
    [371, ['Track Pack PPF']],
    ...Array.from({ length: 5 }, () => [int(155, 205), ['Ceramic Coating — 1 Year']] as [number, string[]]),
  ];
  for (const [daysAgo, names] of history) {
    const customer = pick(customers);
    const lineItems = names.map((n) => {
      const s = svc(n);
      return { service: s._id, name: s.name, description: s.description, category: s.category, qty: 1, unitPrice: s.basePrice, durationMinutes: s.durationMinutes, status: 'done' };
    });
    const start = at(-daysAgo, '09:00');
    const end = new Date(start.getTime() + lineItems.reduce((s, l) => s + l.durationMinutes, 0) * 60_000);
    const job = await createJob(S, { customer: customer._id, vehicle: vehicleOf.get(String(customer._id)), stage: 'completed', lineItems, scheduledStart: start, scheduledEnd: end, assignees: [pick(techs)] }, { source: 'manual', silent: true });
    await Job.updateOne({ _id: job._id }, { $set: { completedAt: end, createdAt: new Date(start.getTime() - 3 * DAY), updatedAt: end, timeline: [{ type: 'created', message: 'Job created', at: new Date(start.getTime() - 3 * DAY) }, { type: 'stage', message: 'Quality check → Completed', at: end }] } }, { timestamps: false });
    await Customer.updateOne({ _id: customer._id }, { $addToSet: { tags: 'ceramic-owner' } });
  }

  /* ---------- recurring jobs ---------- */
  const washes = await Job.find({ shop: S, stage: 'scheduled', 'lineItems.name': 'Maintenance Wash', recurrence: null }).sort({ scheduledStart: 1 }).limit(4);
  for (const [i, job] of washes.entries()) {
    const frequency = (['biweekly', 'monthly', 'monthly', 'weekly'] as const)[i];
    job.set('recurrence', { frequency, intervalDays: { weekly: 7, biweekly: 14, monthly: 30 }[frequency], generatedNext: false });
    job.tags = [...new Set([...(job.tags ?? []), 'recurring'])];
    await job.save();
  }

  /* ---------- calendar blocks ---------- */
  const blocks: Record<string, unknown>[] = [];
  for (let d = -14; d <= 28; d++) {
    if (weekdayOf(d) === 1) blocks.push({ shop: S, title: 'Weekly team huddle', kind: 'meeting', start: at(d, '08:00'), end: at(d, '08:30'), notes: 'Review the board, safety check, goals for the week.' });
  }
  blocks.push(
    { shop: S, user: techs[2], title: 'Vacation', kind: 'time_off', start: at(5, '00:00'), end: at(7, '00:00'), allDay: true },
    { shop: S, user: techs[3], title: 'Dentist appointment', kind: 'time_off', start: at(2, '13:00'), end: at(2, '16:00') },
    { shop: S, title: 'Bay 3 — lift maintenance', kind: 'blocked', bay: 3, start: at(9, '08:00'), end: at(9, '18:00'), allDay: true },
    { shop: S, user: techs[1], title: 'XPEL certification course', kind: 'meeting', start: at(12, '09:00'), end: at(12, '17:00') },
  );
  await CalendarBlock.insertMany(blocks);

  /* ---------- coupons ---------- */
  await Coupon.insertMany([
    { shop: S, code: 'WELCOME10', description: '10% off your first visit', type: 'percent', value: 10, uses: 23 },
    { shop: S, code: 'SPRING50', description: '$50 off any service over $300', type: 'fixed', value: 50, minSpend: 300, uses: 14, expiresAt: new Date(Date.now() + 60 * DAY) },
    { shop: S, code: 'CERAMIC15', description: '15% off ceramic coatings', type: 'percent', value: 15, categories: ['ceramic'], maxUses: 50, uses: 12 },
    { shop: S, code: 'TINT25', description: '$25 off window tint', type: 'fixed', value: 25, categories: ['tint'], uses: 7 },
    { shop: S, code: 'VIP20', description: 'VIP appreciation — 20% off', type: 'percent', value: 20, maxUses: 20, uses: 20 },
    { shop: S, code: 'SUMMER24', description: 'Summer 2024 promo', type: 'percent', value: 15, active: true, uses: 41, expiresAt: new Date(Date.now() - 400 * DAY) },
  ]);

  /* ---------- gift cards ---------- */
  const chunk = () => Array.from({ length: 4 }, () => pick('23456789ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))).join('');
  const giftCards = Array.from({ length: 10 }, (_, i) => {
    const amount = pick([50, 100, 100, 150, 200, 250, 500]);
    const issuedAt = new Date(Date.now() - int(5, 150) * DAY);
    const buyer = pick(customers);
    const transactions: { amount: number; note: string; at: Date }[] = [{ amount, note: 'Card issued', at: issuedAt }];
    let balance = amount;
    if (i % 3 !== 0) {
      const spend = i % 4 === 0 ? amount : round2(amount * pick([0.25, 0.5, 0.6]));
      transactions.push({ amount: -spend, note: `Redeemed on job #${int(1010, 1180)}`, at: new Date(issuedAt.getTime() + int(3, 40) * DAY) });
      balance = round2(amount - spend);
    }
    const recipient = pick(customers);
    return {
      shop: S,
      code: `GC-${chunk()}-${chunk()}`,
      initialBalance: amount,
      balance,
      customer: recipient._id,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      recipientEmail: recipient.email,
      expiresAt: chance(0.3) ? new Date(issuedAt.getTime() + 365 * DAY) : undefined,
      status: balance <= 0 ? 'depleted' : 'active',
      transactions,
      createdAt: issuedAt,
      message: chance(0.5) ? `${pick(['Happy birthday! Treat your ride 🎉', 'Thanks for everything this year!', 'Congrats on the new car!'])} — ${buyer.firstName}` : '',
    };
  });
  await GiftCard.insertMany(giftCards);

  /* ---------- lead forms & submissions ---------- */
  const forms = await LeadForm.insertMany([
    {
      shop: S, name: 'Ceramic & PPF quote', slug: 'ceramic-ppf-quote', title: 'Get your protection quote',
      description: 'Tell us about your vehicle and we will send a tailored ceramic coating and PPF quote within the hour.',
      fields: DEFAULT_FORM_FIELDS.map((f) => ({ ...f, options: [...f.options] })),
      submitLabel: 'Get my quote', successMessage: 'Thanks! Your custom quote is on its way — check your texts shortly.',
    },
    {
      shop: S, name: 'Fleet services inquiry', slug: 'fleet', title: 'Fleet detailing programs',
      description: 'Recurring on-site washes and details for dealerships, rental and service fleets.',
      fields: [
        { key: 'name', label: 'Contact name', type: 'text', required: true },
        { key: 'company', label: 'Company', type: 'text', required: true },
        { key: 'email', label: 'Work email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'phone', required: true },
        { key: 'fleetSize', label: 'Fleet size', type: 'select', required: true, options: ['1–10', '11–50', '51–200', '200+'] },
        { key: 'frequency', label: 'How often?', type: 'select', required: false, options: ['Weekly', 'Bi-weekly', 'Monthly'] },
        { key: 'notes', label: 'Tell us about your fleet', type: 'textarea', required: false },
      ],
      submitLabel: 'Request fleet pricing', successMessage: 'Thanks — our fleet manager will contact you within one business day.',
    },
    {
      shop: S, name: 'Window tint estimate', slug: 'tint', title: 'Ceramic window tint estimate',
      description: 'Pick a shade and get an instant estimate.',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'phone', label: 'Mobile', type: 'phone', required: true },
        { key: 'email', label: 'Email', type: 'email', required: false },
        { key: 'vehicle', label: 'Vehicle', type: 'vehicle', required: true },
        { key: 'shade', label: 'Shade', type: 'select', required: true, options: ['70% (clear)', '50%', '35%', '20%', '5% (limo)'] },
        { key: 'windshield', label: 'Add windshield heat film?', type: 'checkbox', required: false },
      ],
      submitLabel: 'Get my estimate', successMessage: 'Got it! We will text your estimate in a few minutes.',
    },
  ]);
  const ppfServices = [svc('Full Front PPF'), svc('Ceramic Coating — 5 Year'), svc('Ceramic Window Tint')];
  let submissions = 0;
  for (const form of forms) {
    const count = form.slug === 'fleet' ? 3 : int(4, 6);
    for (let i = 0; i < count; i++) {
      const customer = pick(customers);
      const chosen = form.slug === 'tint' ? [ppfServices[2]] : form.slug === 'fleet' ? [svc('Maintenance Wash')] : shuffle([...ppfServices.slice(0, 2)]).slice(0, int(1, 2));
      const created = await createJob(
        S,
        {
          customer: customer._id,
          vehicle: vehicleOf.get(String(customer._id)),
          title: form.slug === 'fleet' ? 'Fleet program inquiry' : chosen.map((s) => s.name).join(' + '),
          stage: weighted([['lead', 6], ['quoted', 3], ['scheduled', 1]] as const),
          lineItems: chosen.map((s) => ({ service: s._id, name: s.name, description: s.description, category: s.category, qty: 1, unitPrice: s.basePrice, durationMinutes: s.durationMinutes })),
          notes: `Submitted via "${form.name}" form`,
          tags: ['lead-form', form.slug],
          leadForm: form._id,
        },
        { source: 'form', message: `Lead captured from the "${form.name}" form`, silent: true },
      );
      await Job.updateOne({ _id: created._id }, { $set: { createdAt: new Date(Date.now() - int(0, 20) * DAY - int(0, 600) * 60_000) } }, { timestamps: false });
      submissions++;
    }
    await LeadForm.updateOne({ _id: form._id }, { $set: { submissions: count + int(8, 40) } });
  }

  /* ---------- reviews ---------- */
  const completed = await Job.find({ shop: S, stage: 'completed' }).select('customer completedAt').sort({ completedAt: -1 }).limit(150).lean();
  const shopDoc = await Shop.findById(S).select('name').lean();
  const reviewDocs: Record<string, unknown>[] = [];
  const requestDocs: Record<string, unknown>[] = [];
  for (let i = 0; i < 62; i++) {
    const job = completed[i % completed.length];
    const customer = customers.find((c) => String(c._id) === String(job.customer))!;
    const rating = weighted([[5, 86], [4, 9], [3, 2.5], [2, 1.2], [1, 1.3]] as const);
    const source = weighted([['google', 50], ['lustra', 25], ['facebook', 15], ['yelp', 10]] as const);
    const comment = pick(REVIEW_COMMENTS[rating]);
    const createdAt = new Date((job.completedAt ?? new Date()).getTime() + int(2, 48) * 3_600_000);
    const replied = chance(rating <= 3 ? 0.9 : 0.6) && Date.now() - createdAt.getTime() > 2 * DAY;
    reviewDocs.push({
      shop: S, customer: customer._id, job: job._id, source, rating, comment,
      author: `${customer.firstName} ${customer.lastName[0]}.`,
      reply: replied ? reviewReplySuggestions({ rating, comment, firstName: customer.firstName, shopName: shopDoc?.name ?? 'Apex Auto Spa' })[0] : '',
      repliedAt: replied ? new Date(createdAt.getTime() + int(2, 30) * 3_600_000) : undefined,
      status: replied ? 'replied' : 'new',
      createdAt,
    });
    if (source === 'lustra') requestDocs.push({ shop: S, customer: customer._id, job: job._id, token: nanoid(24), sentAt: new Date(createdAt.getTime() - 3_600_000), completedAt: createdAt, rating });
  }
  for (const job of completed.slice(0, 5)) requestDocs.push({ shop: S, customer: job.customer, job: job._id, token: nanoid(24), sentAt: new Date(Date.now() - int(1, 48) * 3_600_000) });
  await Review.insertMany(reviewDocs);
  await ReviewRequest.insertMany(requestDocs);

  /* ---------- campaigns ---------- */
  await Campaign.insertMany([
    {
      shop: S, name: 'Spring coating refresh', channel: 'sms', segment: { type: 'due_maintenance' },
      body: 'Hi {{customer.firstName}}! Spring is here 🌸 Your coating is due for a decon + topper. Book this week and get 15% off with code CERAMIC15: {{bookingLink}}',
      status: 'sent', sentAt: new Date(Date.now() - 24 * DAY), stats: { recipients: 38, delivered: 37, booked: 6, revenue: 2140 },
    },
    {
      shop: S, name: 'VIP early access — PPF week', channel: 'email', segment: { type: 'vip' },
      subject: 'Early access for our VIPs, {{customer.firstName}}',
      body: 'Hi {{customer.firstName}},\n\nAs one of our favorite customers, you get first pick of our PPF install week slots — plus a complimentary ceramic topper.\n\nReserve: {{bookingLink}}\n\n— The {{shop.name}} team',
      status: 'sent', sentAt: new Date(Date.now() - 9 * DAY), stats: { recipients: 9, delivered: 9, booked: 3, revenue: 5400 },
    },
    {
      shop: S, name: 'Coating anniversary check-up', channel: 'sms', segment: { type: 'coating_anniversary' },
      body: 'Happy coating anniversary {{customer.firstName}}! 🎉 Your free annual inspection keeps the warranty valid — grab a time: {{bookingLink}}',
      status: 'draft',
    },
    {
      shop: S, name: 'We miss you', channel: 'sms', segment: { type: 'lapsed' },
      body: "Hey {{customer.firstName}}, it's been a while! Your next maintenance wash is on us with any detail this month: {{bookingLink}}",
      status: 'draft',
    },
  ]);

  /* ---------- integrations, API key, webhook ---------- */
  await Integration.insertMany([
    { shop: S, provider: 'stripe', status: 'connected', connectedAt: new Date(Date.now() - 200 * DAY), account: 'acct_1PqApexAutoSpa', lastSyncAt: new Date(Date.now() - 2 * 3_600_000), log: [{ at: new Date(Date.now() - 2 * 3_600_000), message: 'Reconciled 14 card payments' }] },
    { shop: S, provider: 'quickbooks', status: 'connected', connectedAt: new Date(Date.now() - 120 * DAY), account: 'Apex Auto Spa LLC', lastSyncAt: new Date(Date.now() - 26 * 3_600_000), log: [{ at: new Date(Date.now() - 26 * 3_600_000), message: 'Pushed 21 invoices and 6 customers to QuickBooks' }] },
    { shop: S, provider: 'google', status: 'disconnected' },
  ]);
  const plaintext = `lx_live_${randomBytes(20).toString('hex')}`;
  await ApiKey.create({ shop: S, name: 'Zapier production', prefix: plaintext.slice(0, 12), hash: hashApiKey(plaintext), createdBy: owner, lastUsedAt: new Date(Date.now() - 20 * 3_600_000) });
  await Webhook.create({
    shop: S,
    url: 'https://example.com/webhooks/lustra',
    events: ['job.completed', 'invoice.paid', 'booking.created'],
    secret: newWebhookSecret(),
    deliveries: [
      { at: new Date(Date.now() - 50 * 3_600_000), event: 'job.completed', status: 'success', code: 200, durationMs: 182 },
      { at: new Date(Date.now() - 30 * 3_600_000), event: 'invoice.paid', status: 'success', code: 200, durationMs: 141 },
      { at: new Date(Date.now() - 6 * 3_600_000), event: 'booking.created', status: 'failed', code: 503, durationMs: 5004 },
      { at: new Date(Date.now() - 5 * 3_600_000), event: 'booking.created', status: 'success', code: 200, durationMs: 166 },
    ],
  });

  /* ---------- supply orders ---------- */
  const products = await MarketplaceProduct.find({}).lean();
  const bySku = (sku: string) => products.find((p) => p.sku === sku)!;
  const orderSpecs: [string[], number[], 'placed' | 'shipped' | 'delivered', number][] = [
    [['NSL-QG9H-50', 'PLL-EMT-10', 'PWW-PP-32'], [6, 4, 6], 'delivered', 21],
    [['CLA-SH60-50G', 'PLL-STC-1'], [1, 2], 'shipped', 3],
    [['BRW-HCC-32', 'CTR-FP55', 'HLF-NC35-40'], [2, 2, 1], 'placed', 0],
  ];
  let credits = 0;
  for (const [i, [skus, qtys, status, daysAgo]] of orderSpecs.entries()) {
    const items = skus.map((sku, k) => {
      const p = bySku(sku);
      return { product: p._id, sku: p.sku, name: p.name, qty: qtys[k], price: p.memberPrice };
    });
    const subtotal = round2(items.reduce((s, x) => s + x.price * x.qty, 0));
    const credit = round2(subtotal * 0.02);
    credits += credit;
    const placedAt = new Date(Date.now() - (daysAgo + 4) * DAY);
    await SupplyOrder.create({ shop: S, number: 5001 + i, items, subtotal, credit, total: subtotal, status, placedBy: owner, deliveredAt: status === 'delivered' ? new Date(Date.now() - daysAgo * DAY) : undefined, createdAt: placedAt });
    if (status === 'delivered') {
      for (const item of items) {
        await InventoryItem.updateOne(
          { shop: S, sku: item.sku },
          {
            $setOnInsert: { name: item.name, category: 'Coatings', unit: 'unit', reorderLevel: 2, supplier: 'Lustra Marketplace' },
            $set: { cost: item.price },
            $inc: { quantity: item.qty },
            $push: { adjustments: { delta: item.qty, reason: `Received supply order #${5001 + i}`, at: new Date(Date.now() - daysAgo * DAY), by: owner } },
          },
          { upsert: true },
        );
      }
    }
  }
  await Counter.updateOne({ shop: S, key: 'order' }, { $set: { seq: orderSpecs.length } }, { upsert: true });
  await Shop.updateOne({ _id: S }, { $set: { credits: round2(credits + 12.4) } });

  /* ---------- documents (real files so links work) ---------- */
  const docDir = path.join(uploadRoot, String(S), 'documents');
  await fs.mkdir(docDir, { recursive: true });
  const docCustomer = customers[0];
  const docJob = await Job.findOne({ shop: S, customer: docCustomer._id }).select('_id').lean();
  const files: { file: string; name: string; mime: string; category: 'waiver' | 'contract' | 'photo' | 'warranty'; content: string | Buffer; customer?: Types.ObjectId; job?: Types.ObjectId }[] = [
    {
      file: `${nanoid(12)}.txt`, name: 'Liability waiver — paint correction.txt', mime: 'text/plain', category: 'waiver', customer: docCustomer._id, job: docJob?._id,
      content: [
        'APEX AUTO SPA — PAINT CORRECTION LIABILITY WAIVER',
        '',
        'Paint correction removes a thin layer of clear coat. Previously repaired, thin or failing paint may be',
        'further exposed. The customer acknowledges pre-existing defects documented in the vehicle inspection.',
        '',
        `Customer: ${docCustomer.firstName} ${docCustomer.lastName}`,
        'Signed electronically via the Lustra customer portal.',
      ].join('\n'),
    },
    {
      file: `${nanoid(12)}.pdf`, name: 'Service agreement — Full Front PPF.pdf', mime: 'application/pdf', category: 'contract', customer: docCustomer._id, job: docJob?._id,
      content: MINIMAL_PDF('Apex Auto Spa - Service Agreement', [
        'Service: Full Front Paint Protection Film (hood, fenders, bumper, mirrors).',
        'Film: ClearArmor Self-Healing 8-mil, 10-year manufacturer warranty.',
        'Deposit: 30% due at booking, balance due at pickup.',
        'Aftercare: no pressure washing edges for 7 days.',
        `Customer: ${docCustomer.firstName} ${docCustomer.lastName}`,
      ]),
    },
    {
      file: `${nanoid(12)}.txt`, name: 'Ceramic coating warranty terms.txt', mime: 'text/plain', category: 'warranty',
      content: 'CERAMIC COATING WARRANTY\n\nCoverage requires an annual inspection and maintenance washes with pH-neutral soap.\nWarranty is void if abrasive polishing is performed by a third party.\n',
    },
  ];
  const photo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web/public/images/paint-correction.webp');
  try {
    files.push({ file: `${nanoid(12)}.webp`, name: 'Before photo — hood swirls.webp', mime: 'image/webp', category: 'photo', content: await fs.readFile(photo), customer: docCustomer._id, job: docJob?._id });
  } catch {
    /* web assets not present — skip the sample photo */
  }
  for (const f of files) {
    const full = path.join(docDir, f.file);
    await fs.writeFile(full, f.content);
    const { size } = await fs.stat(full);
    await DocumentFile.create({ shop: S, customer: f.customer, job: f.job, name: f.name, url: `/uploads/${String(S)}/documents/${f.file}`, mime: f.mime, size, category: f.category, uploadedBy: owner });
  }

  return { mobileJobs: mobileCreated, leadSubmissions: submissions, reviews: reviewDocs.length, giftCards: giftCards.length, documents: files.length, apiKeyPrefix: plaintext.slice(0, 12) };
}

