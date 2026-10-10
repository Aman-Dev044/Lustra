import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Types } from 'mongoose';
import { Shop, type ShopAttrs } from '../models/Shop.js';
import { Service } from '../models/Service.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Job } from '../models/Job.js';
import { Quote, type QuoteDoc } from '../models/Quote.js';
import { Invoice, type InvoiceDoc } from '../models/Invoice.js';
import { Inspection } from '../models/Inspection.js';
import { Certificate, Lead } from '../models/misc.js';
import { VEHICLE_TYPES, type VehicleSize } from '../models/common.js';
import { emailField, escapeRegex, objectId } from '../lib/validate.js';
import { AppError, badRequest, conflict, notFound } from '../lib/errors.js';
import { hasFeature, planRequiredError } from '../lib/plans.js';
import { computeSlots } from '../lib/availability.js';
import { createJob, broadcastJob } from '../lib/jobs.js';
import { approveQuote } from '../lib/quotes.js';
import { recordPayment } from '../lib/invoices.js';
import { logActivity, notify } from '../lib/activity.js';
import { fire } from '../lib/automations.js';
import { emitToShop } from '../lib/realtime.js';
import { round2 } from '../lib/money.js';
import { CalendarBlock, LeadForm, Review, ReviewRequest } from '../models/growth.js';
import { checkCoupon, consumeCoupon } from '../lib/coupons.js';
import { config } from '../config.js';

export const publicRouter = Router();

type ShopLike = ShopAttrs & { _id: Types.ObjectId };

function publicShop(shop: ShopLike) {
  return {
    _id: shop._id,
    name: shop.name,
    slug: shop.slug,
    industry: shop.industry,
    phone: shop.phone,
    email: shop.email,
    website: shop.website,
    address: shop.address,
    timezone: shop.timezone,
    currency: shop.currency,
    brandColor: shop.brandColor,
    logoUrl: shop.logoUrl,
    booking: {
      enabled: shop.booking?.enabled,
      headline: shop.booking?.headline,
      slotMinutes: shop.booking?.slotMinutes,
      leadTimeHours: shop.booking?.leadTimeHours,
      requireDeposit: shop.booking?.requireDeposit,
      depositPercent: shop.booking?.depositPercent,
      workingHours: shop.booking?.workingHours,
    },
  };
}

async function bookableShop(slug: string) {
  const shop = await Shop.findOne({ slug: slug.toLowerCase() }).lean();
  if (!shop) throw notFound('Shop');
  return shop as ShopLike;
}

function assertBookingOpen(shop: ShopLike) {
  if (!hasFeature(shop, 'online_booking')) throw planRequiredError('online_booking');
  if (!shop.booking?.enabled) throw new AppError(403, 'FORBIDDEN', 'Online booking is currently turned off for this shop');
}

const SIZE_BY_TYPE: Record<string, VehicleSize> = { car: 'medium', suv: 'large', truck: 'large', van: 'xl', rv: 'xl', boat: 'large', motorcycle: 'small', other: 'medium' };

/**
 * Everything occupying a bay: in-shop jobs plus shop-wide calendar blocks (a block without a bay closes
 * every bay; personal time off doesn't). Mobile jobs happen on-site, so they don't consume a bay.
 */
async function busyBlocks(shop: Types.ObjectId, from: Date, to: Date, bays = 1) {
  const [jobs, blocks] = await Promise.all([
    Job.find({ shop, mobile: { $ne: true }, stage: { $nin: ['cancelled', 'lead'] }, scheduledStart: { $lt: to }, scheduledEnd: { $gt: from } })
      .select('scheduledStart scheduledEnd bay')
      .lean(),
    CalendarBlock.find({ shop, user: null, kind: { $ne: 'time_off' }, start: { $lt: to }, end: { $gt: from } }).lean(),
  ]);
  const busy: { start: Date; end: Date; bay?: number }[] = jobs.map((j) => ({ start: j.scheduledStart!, end: j.scheduledEnd!, bay: j.bay ?? undefined }));
  for (const b of blocks) {
    if (b.bay) busy.push({ start: b.start, end: b.end, bay: b.bay });
    else for (let bay = 1; bay <= bays; bay++) busy.push({ start: b.start, end: b.end, bay });
  }
  return busy;
}

/* ---------------- Shop & booking ---------------- */

publicRouter.get('/shops/:slug', async (req, res) => {
  const shop = await bookableShop(req.params.slug);
  const services = await Service.find({ shop: shop._id, active: true, bookable: true })
    .sort({ category: 1, basePrice: 1 })
    .select('name category description basePrice durationMinutes sizeMultipliers color');
  res.json({
    shop: publicShop(shop),
    services,
    bookingAvailable: hasFeature(shop, 'online_booking') && Boolean(shop.booking?.enabled),
  });
});

publicRouter.get('/shops/:slug/availability', async (req, res) => {
  const q = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
      services: z.string().optional().transform((v) => (v ? v.split(',').filter(Boolean) : [])),
    })
    .parse(req.query);
  const shop = await bookableShop(req.params.slug);
  assertBookingOpen(shop);
  const services = q.services.length ? await Service.find({ shop: shop._id, _id: { $in: q.services.filter((id) => objectId.safeParse(id).success) } }).lean() : [];
  const durationMinutes = services.reduce((s, x) => s + (x.durationMinutes ?? 0), 0) || (shop.booking?.slotMinutes ?? 60);
  const dayStart = new Date(`${q.date}T00:00:00Z`);
  const busy = await busyBlocks(shop._id, new Date(dayStart.getTime() - 86_400_000), new Date(dayStart.getTime() + 2 * 86_400_000), shop.booking?.bays ?? 1);
  const slots = computeSlots({ date: q.date, timeZone: shop.timezone ?? 'UTC', booking: shop.booking ?? {}, durationMinutes, busy });
  res.json({ date: q.date, durationMinutes, slots });
});

const bookingBody = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).default(''),
  email: emailField,
  phone: z.string().trim().min(7).max(40),
  vehicle: z.object({
    year: z.coerce.number().int().min(1900).max(2100).optional(),
    make: z.string().trim().max(60).default(''),
    model: z.string().trim().max(60).default(''),
    type: z.enum(VEHICLE_TYPES).default('car'),
    color: z.string().trim().max(40).default(''),
  }),
  services: z.array(objectId).min(1).max(10),
  start: z.coerce.date(),
  notes: z.string().max(2000).default(''),
  couponCode: z.string().trim().max(40).optional(),
});

publicRouter.post('/shops/:slug/bookings', async (req, res) => {
  const body = bookingBody.parse(req.body);
  const shop = await bookableShop(req.params.slug);
  assertBookingOpen(shop);

  const services = await Service.find({ shop: shop._id, _id: { $in: body.services }, active: true, bookable: true }).lean();
  if (services.length !== new Set(body.services).size) throw badRequest('One or more selected services are unavailable');
  const durationMinutes = services.reduce((s, x) => s + (x.durationMinutes ?? 0), 0);

  // Re-validate the slot server-side.
  const tz = shop.timezone ?? 'UTC';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(body.start);
  const busy = await busyBlocks(shop._id, new Date(body.start.getTime() - 86_400_000), new Date(body.start.getTime() + 2 * 86_400_000), shop.booking?.bays ?? 1);
  const slots = computeSlots({ date, timeZone: tz, booking: shop.booking ?? {}, durationMinutes, busy });
  const slot = slots.find((s) => new Date(s.start).getTime() === body.start.getTime());
  if (!slot?.available) throw conflict('That time is no longer available — please pick another slot');

  // Find or create the customer.
  let customer = await Customer.findOne({ shop: shop._id, email: body.email });
  const isNewCustomer = !customer;
  if (!customer) {
    customer = await Customer.create({ shop: shop._id, firstName: body.firstName, lastName: body.lastName, email: body.email, phone: body.phone, source: 'booking', tags: ['online-booking'] });
  } else if (!customer.phone) {
    customer.phone = body.phone;
    await customer.save();
  }

  const size = SIZE_BY_TYPE[body.vehicle.type] ?? 'medium';
  let vehicle = await Vehicle.findOne({ shop: shop._id, customer: customer._id, make: new RegExp(`^${escapeRegex(body.vehicle.make)}$`, 'i'), model: new RegExp(`^${escapeRegex(body.vehicle.model)}$`, 'i') });
  if (!vehicle || !body.vehicle.make) {
    vehicle = await Vehicle.create({ shop: shop._id, customer: customer._id, ...body.vehicle, size });
  }

  const end = new Date(body.start.getTime() + Math.max(durationMinutes, 30) * 60_000);
  const bays = shop.booking?.bays ?? 1;
  const taken = new Set(busy.filter((b) => b.start < end && b.end > body.start).map((b) => b.bay));
  const bay = Array.from({ length: bays }, (_, i) => i + 1).find((b) => !taken.has(b)) ?? 1;

  const lineItems = services.map((s) => ({
    service: s._id,
    name: s.name,
    description: s.description,
    category: s.category,
    qty: 1,
    unitPrice: Math.round((s.basePrice * (s.sizeMultipliers?.[size] ?? 1)) / 5) * 5,
    discount: 0,
    durationMinutes: s.durationMinutes,
  }));

  // Optional coupon: validated against the priced basket, then spread across eligible lines as line discounts.
  let couponApplied: { code: string; amount: number } | undefined;
  if (body.couponCode) {
    const lines = lineItems.map((l) => ({ category: l.category, amount: l.unitPrice }));
    const check = await checkCoupon(shop._id, body.couponCode, { subtotal: lines.reduce((s, l) => s + l.amount, 0), lines });
    if (!check.valid || !check.coupon) throw badRequest(check.reason ?? 'Invalid coupon');
    if (!(await consumeCoupon(check.coupon._id))) throw conflict('This coupon has reached its usage limit');
    const restricted = check.coupon.categories?.length ? new Set<string>(check.coupon.categories) : null;
    const eligible = lineItems.filter((l) => !restricted || restricted.has(l.category));
    const eligibleTotal = eligible.reduce((s, l) => s + l.unitPrice, 0);
    let remaining = check.amount;
    eligible.forEach((l, i) => {
      const share = i === eligible.length - 1 ? remaining : round2((check.amount * l.unitPrice) / eligibleTotal);
      l.discount = Math.min(l.unitPrice, share);
      remaining = round2(remaining - l.discount);
    });
    couponApplied = { code: check.coupon.code, amount: check.amount };
  }

  const job = await createJob(
    shop._id,
    {
      customer: customer._id,
      vehicle: vehicle._id,
      stage: 'scheduled',
      lineItems,
      scheduledStart: body.start,
      scheduledEnd: end,
      bay,
      notes: body.notes,
      tags: ['online-booking', ...(couponApplied ? [`coupon:${couponApplied.code}`] : [])],
    },
    { source: 'booking', message: `Booked online by the customer${couponApplied ? ` with coupon ${couponApplied.code} (−$${couponApplied.amount.toFixed(2)})` : ''}`, silent: true },
  );

  await logActivity({ shop: shop._id, action: 'booking.created', entityType: 'job', entityId: job._id, summary: `${customer.firstName} booked job #${job.number} online` });
  await notify({
    shop: shop._id,
    title: `New booking: ${customer.firstName} ${customer.lastName}`.trim(),
    body: `${lineItems.map((l) => l.name).join(', ')} · ${body.start.toLocaleString('en-US', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' })}`,
    link: `/app/jobs/${job._id}`,
    kind: 'booking',
  });
  await broadcastJob(shop._id, job._id, 'booking:created');
  await broadcastJob(shop._id, job._id, 'job:created');
  if (isNewCustomer) fire(shop._id, 'customer.created', { customerId: customer._id });
  fire(shop._id, 'job.created', { jobId: job._id, customerId: customer._id });
  fire(shop._id, 'booking.created', { jobId: job._id, customerId: customer._id });

  res.status(201).json({ job: { _id: job._id, number: job.number, portalToken: job.portalToken, scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd, total: job.totals?.total } });
});

/* ---------------- Customer portal ---------------- */

const PUBLIC_TIMELINE = new Set(['created', 'stage', 'payment', 'inspection', 'quote', 'message']);

function publicQuote(q: QuoteDoc | null) {
  if (!q) return null;
  return {
    _id: q._id,
    number: q.number,
    title: q.title,
    status: q.status,
    items: q.items.map((i) => ({ _id: i._id, name: i.name, description: i.description, category: i.category, qty: i.qty, unitPrice: i.unitPrice, discount: i.discount, optional: i.optional, selected: i.selected })),
    discount: q.discount,
    taxRate: q.taxRate,
    totals: q.totals,
    validUntil: q.validUntil,
    notes: q.notes,
    publicToken: q.publicToken,
    approvedAt: q.approvedAt,
    signatureName: q.signatureName,
    createdAt: (q as unknown as { createdAt: Date }).createdAt,
  };
}

function publicInvoice(i: InvoiceDoc | null) {
  if (!i) return null;
  return {
    _id: i._id,
    number: i.number,
    status: i.status,
    items: i.items,
    discount: i.discount,
    taxRate: i.taxRate,
    totals: i.totals,
    dueDate: i.dueDate,
    notes: i.notes,
    publicToken: i.publicToken,
    payments: i.payments.map((p) => ({ amount: p.amount, tip: p.tip, method: p.method, at: p.at })),
    paidAt: i.paidAt,
    createdAt: (i as unknown as { createdAt: Date }).createdAt,
  };
}

function publicCertificate(c: Record<string, unknown> & { expiresAt?: Date | null; status?: string }) {
  const expired = c.status === 'active' && c.expiresAt && new Date(c.expiresAt) < new Date();
  return { ...c, status: expired ? 'expired' : c.status };
}

publicRouter.get('/portal/:token', async (req, res) => {
  const token = String(req.params.token);
  let job = await Job.findOne({ portalToken: token });
  let quote = job ? null : await Quote.findOne({ publicToken: token });
  let invoice = job || quote ? null : await Invoice.findOne({ publicToken: token });
  let inspection = job || quote || invoice ? null : await Inspection.findOne({ publicToken: token });
  if (!job && !quote && !invoice && !inspection) throw notFound('Portal link');

  const jobId = job?._id ?? quote?.job ?? invoice?.job ?? inspection?.job;
  if (!job && jobId) job = await Job.findById(jobId);
  const shopId = (job ?? quote ?? invoice ?? inspection)!.shop;
  const shop = await Shop.findById(shopId).lean();
  if (!shop) throw notFound('Shop');

  if (job) {
    quote ??= job.quote ? await Quote.findById(job.quote) : await Quote.findOne({ job: job._id }).sort({ createdAt: -1 });
    invoice ??= job.invoice ? await Invoice.findById(job.invoice) : await Invoice.findOne({ job: job._id, status: { $ne: 'void' } }).sort({ createdAt: -1 });
    inspection ??= await Inspection.findOne({ job: job._id }).sort({ createdAt: -1 });
  }
  if (quote && quote.status === 'sent') {
    quote.status = 'viewed';
    await quote.save();
    emitToShop(shop._id, 'quote:updated', quote.toJSON());
  }

  const customerId = (job ?? quote ?? invoice ?? inspection)!.customer;
  const vehicleId = job?.vehicle ?? quote?.vehicle ?? inspection?.vehicle;
  const [customer, vehicle, certificates] = await Promise.all([
    Customer.findById(customerId).select('firstName lastName loyaltyPoints').lean(),
    vehicleId ? Vehicle.findById(vehicleId).select('year make model trim color type').lean() : null,
    Certificate.find({ shop: shop._id, ...(job ? { $or: [{ job: job._id }, ...(vehicleId ? [{ vehicle: vehicleId }] : [])] } : vehicleId ? { vehicle: vehicleId } : { _id: null }) })
      .select('code product coverage installedAt expiresAt status')
      .lean(),
  ]);

  const checklist = job?.checklist ?? [];
  res.json({
    shop: publicShop(shop as ShopLike),
    job: job
      ? {
          _id: job._id,
          number: job.number,
          title: job.title,
          stage: job.stage,
          scheduledStart: job.scheduledStart,
          scheduledEnd: job.scheduledEnd,
          completedAt: job.completedAt,
          lineItems: job.lineItems.map((i) => ({ _id: i._id, name: i.name, category: i.category, qty: i.qty, unitPrice: i.unitPrice, status: i.status })),
          totals: job.totals,
          notes: job.notes,
          timeline: job.timeline.filter((t) => PUBLIC_TIMELINE.has(t.type)).map((t) => ({ _id: t._id, at: t.at, type: t.type, message: t.message })),
          progress: checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0,
          portalToken: job.portalToken,
        }
      : null,
    customer: customer ? { firstName: customer.firstName, loyaltyPoints: customer.loyaltyPoints } : null,
    vehicle,
    quote: publicQuote(quote),
    invoice: publicInvoice(invoice),
    inspection: inspection
      ? { _id: inspection._id, type: inspection.type, status: inspection.status, markers: inspection.markers, media: inspection.media, notes: inspection.notes, signature: inspection.signature, publicToken: inspection.publicToken }
      : null,
    certificates: certificates.map((c) => publicCertificate(c as never)),
  });
});

/* ---------------- Quotes ---------------- */

async function quoteByToken(token: string) {
  const quote = await Quote.findOne({ publicToken: token });
  if (!quote) throw notFound('Quote');
  return quote;
}

publicRouter.get('/quotes/:token', async (req, res) => {
  const quote = await quoteByToken(String(req.params.token));
  const shop = await Shop.findById(quote.shop).lean();
  res.json({ shop: shop ? publicShop(shop as ShopLike) : null, quote: publicQuote(quote) });
});

publicRouter.post('/quotes/:token/approve', async (req, res) => {
  const body = z.object({ signatureName: z.string().trim().min(2).max(120), selectedItemIds: z.array(z.string()).max(100).optional() }).parse(req.body);
  const quote = await quoteByToken(String(req.params.token));
  if (quote.status === 'approved') throw conflict('This quote has already been approved');
  if (['declined', 'expired'].includes(quote.status)) throw conflict(`This quote is ${quote.status}`);
  if (quote.validUntil && quote.validUntil < new Date()) {
    quote.status = 'expired';
    await quote.save();
    throw conflict('This quote has expired — please contact the shop for an updated quote');
  }
  const jobId = await approveQuote(quote, body.signatureName, body.selectedItemIds);
  const job = await Job.findById(jobId).select('portalToken number').lean();
  res.json({ quote: publicQuote(quote), job: job ? { number: job.number, portalToken: job.portalToken } : null });
});

publicRouter.post('/quotes/:token/decline', async (req, res) => {
  const { reason } = z.object({ reason: z.string().max(1000).optional() }).parse(req.body ?? {});
  const quote = await quoteByToken(String(req.params.token));
  if (quote.status === 'approved') throw conflict('This quote has already been approved');
  quote.status = 'declined';
  quote.declinedAt = new Date();
  if (reason) quote.notes = `${quote.notes ? `${quote.notes}\n\n` : ''}Customer declined: ${reason}`;
  await quote.save();
  await notify({ shop: quote.shop, title: `Quote #${quote.number} declined`, body: reason ?? '', link: `/app/quotes/${quote._id}`, kind: 'warning' });
  emitToShop(quote.shop, 'quote:updated', quote.toJSON());
  res.json({ quote: publicQuote(quote) });
});

/* ---------------- Invoices ---------------- */

async function invoiceByToken(token: string) {
  const invoice = await Invoice.findOne({ publicToken: token });
  if (!invoice) throw notFound('Invoice');
  return invoice;
}

publicRouter.get('/invoices/:token', async (req, res) => {
  const invoice = await invoiceByToken(String(req.params.token));
  const shop = await Shop.findById(invoice.shop).lean();
  res.json({ shop: shop ? publicShop(shop as ShopLike) : null, invoice: publicInvoice(invoice) });
});

/** Simulated card checkout. Swap for a Stripe PaymentIntent confirmation to go live. */
publicRouter.post('/invoices/:token/pay', async (req, res) => {
  const body = z.object({ amount: z.number().positive().max(10_000_000), tip: z.number().min(0).max(100_000).default(0) }).parse(req.body);
  const invoice = await invoiceByToken(String(req.params.token));
  if (invoice.status === 'void') throw conflict('This invoice is void');
  const balance = invoice.totals?.balance ?? 0;
  if (balance <= 0) throw conflict('This invoice is already paid');
  if (body.amount > balance + 0.005) throw badRequest(`Amount exceeds the balance of $${balance.toFixed(2)}`);
  await recordPayment(invoice, { amount: round2(body.amount), tip: round2(body.tip), method: 'card', reference: `SIM-${nanoid(10).toUpperCase()}` }, { viaPortal: true });
  res.json({ invoice: publicInvoice(invoice) });
});

/* ---------------- Inspections ---------------- */

publicRouter.get('/inspections/:token', async (req, res) => {
  const inspection = await Inspection.findOne({ publicToken: String(req.params.token) }).populate('vehicle', 'year make model color');
  if (!inspection) throw notFound('Inspection');
  const shop = await Shop.findById(inspection.shop).lean();
  res.json({
    shop: shop ? publicShop(shop as ShopLike) : null,
    inspection: { _id: inspection._id, type: inspection.type, status: inspection.status, markers: inspection.markers, media: inspection.media, notes: inspection.notes, signature: inspection.signature, vehicle: inspection.vehicle },
  });
});

publicRouter.post('/inspections/:token/sign', async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(120) }).parse(req.body);
  const inspection = await Inspection.findOne({ publicToken: String(req.params.token) });
  if (!inspection) throw notFound('Inspection');
  if (inspection.status === 'signed') throw conflict('This inspection has already been signed');
  inspection.status = 'signed';
  inspection.signature = { name, signedAt: new Date() };
  await inspection.save();
  if (inspection.job) {
    await Job.updateOne({ _id: inspection.job }, { $push: { timeline: { type: 'inspection', message: `Inspection signed by ${name}` } } });
    await broadcastJob(inspection.shop, inspection.job);
  }
  await logActivity({ shop: inspection.shop, action: 'inspection.signed', entityType: 'inspection', entityId: inspection._id, summary: `Inspection signed by ${name}` });
  fire(inspection.shop, 'inspection.signed', { inspectionId: inspection._id, customerId: inspection.customer, jobId: inspection.job ?? undefined });
  res.json({ ok: true, status: inspection.status, signature: inspection.signature });
});

/* ---------------- Certificates & leads ---------------- */

publicRouter.get('/certificates/:code', async (req, res) => {
  const cert = await Certificate.findOne({ code: String(req.params.code).toUpperCase() })
    .populate('vehicle', 'year make model color vin')
    .populate('customer', 'firstName lastName')
    .populate('installer', 'name')
    .lean();
  if (!cert) throw notFound('Certificate');
  const shop = await Shop.findById(cert.shop).lean();
  const vehicle = cert.vehicle as unknown as { year?: number; make?: string; model?: string; color?: string; vin?: string } | null;
  const customer = cert.customer as unknown as { firstName?: string; lastName?: string } | null;
  res.json({
    code: cert.code,
    product: cert.product,
    coverage: cert.coverage,
    installedAt: cert.installedAt,
    expiresAt: cert.expiresAt,
    status: publicCertificate(cert as never).status,
    vehicle: vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, color: vehicle.color, vinLast6: vehicle.vin ? vehicle.vin.slice(-6) : '' } : null,
    owner: customer ? `${customer.firstName ?? ''} ${(customer.lastName ?? '').slice(0, 1)}${customer.lastName ? '.' : ''}`.trim() : '',
    installer: (cert.installer as unknown as { name?: string } | null)?.name ?? '',
    shop: shop ? publicShop(shop as ShopLike) : null,
  });
});

const leadBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailField,
  phone: z.string().trim().max(40).default(''),
  company: z.string().trim().max(120).default(''),
  message: z.string().trim().max(5000).default(''),
  source: z.enum(['contact', 'demo', 'visualizer', 'newsletter']).default('contact'),
  shop: z.string().max(80).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

publicRouter.post('/leads', async (req, res) => {
  const body = leadBody.parse(req.body);
  const shop = body.shop ? await Shop.findOne({ slug: body.shop.toLowerCase() }).select('_id').lean() : null;
  const lead = await Lead.create({ ...body, shop: shop?._id, meta: body.meta ?? {} });
  if (shop) await notify({ shop: shop._id, title: `New ${body.source} lead: ${body.name}`, body: body.message.slice(0, 140), kind: 'info' });
  res.status(201).json({ ok: true, id: lead._id });
});

/* ---------------- Lead forms ---------------- */

async function activeForm(shopSlug: string, formSlug: string) {
  const shop = await bookableShop(shopSlug);
  if (!hasFeature(shop, 'lead_forms')) throw planRequiredError('lead_forms');
  const form = await LeadForm.findOne({ shop: shop._id, slug: formSlug.toLowerCase(), active: true });
  if (!form) throw notFound('Form');
  return { shop, form };
}

publicRouter.get('/forms/:shopSlug/:formSlug', async (req, res) => {
  const { shop, form } = await activeForm(String(req.params.shopSlug), String(req.params.formSlug));
  const services = form.fields.some((f) => f.type === 'services')
    ? await Service.find({ shop: shop._id, active: true, bookable: true }).sort({ category: 1, basePrice: 1 }).select('name category basePrice description')
    : [];
  res.json({
    shop: publicShop(shop),
    form: { _id: form._id, name: form.name, slug: form.slug, title: form.title, description: form.description, fields: form.fields, submitLabel: form.submitLabel, successMessage: form.successMessage },
    services,
  });
});

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || v === false;

publicRouter.post('/forms/:shopSlug/:formSlug', async (req, res) => {
  const { answers } = z.object({ answers: z.record(z.string(), z.unknown()) }).parse(req.body);
  const { shop, form } = await activeForm(String(req.params.shopSlug), String(req.params.formSlug));

  const missing = form.fields.filter((f) => f.required && isEmpty(answers[f.key])).map((f) => f.label);
  if (missing.length) throw badRequest(`Please fill in: ${missing.join(', ')}`);

  const byType = (type: string) => form.fields.find((f) => f.type === type);
  const str = (v: unknown, max = 300) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');
  const emailRaw = str(answers[byType('email')?.key ?? 'email']).toLowerCase();
  const email = emailField.safeParse(emailRaw).success ? emailRaw : '';
  const phone = str(answers[byType('phone')?.key ?? 'phone'], 40);
  if (!email && !phone) throw badRequest('Please provide an email address or phone number');

  const nameField = form.fields.find((f) => /^(name|full_?name)$/i.test(f.key)) ?? form.fields.find((f) => f.type === 'text' && /name/i.test(f.label));
  const fullName = str(answers[nameField?.key ?? 'name'], 160) || `${str(answers.firstName, 80)} ${str(answers.lastName, 80)}`.trim();
  const [firstName, ...rest] = (fullName || email.split('@')[0] || 'Website lead').split(/\s+/);

  let customer = email ? await Customer.findOne({ shop: shop._id, email }) : null;
  customer ??= phone ? await Customer.findOne({ shop: shop._id, phone }) : null;
  const isNewCustomer = !customer;
  if (!customer) {
    customer = await Customer.create({ shop: shop._id, firstName, lastName: rest.join(' '), email, phone, source: 'website', tags: ['lead-form'] });
  } else if ((!customer.phone && phone) || (!customer.email && email)) {
    customer.phone ||= phone;
    customer.email ||= email;
    await customer.save();
  }

  // Vehicle field value: { year, make, model, type? }
  const vehicleField = byType('vehicle');
  const vehicleValue = (vehicleField ? answers[vehicleField.key] : undefined) as Record<string, unknown> | undefined;
  let vehicleId: Types.ObjectId | undefined;
  if (vehicleValue && typeof vehicleValue === 'object' && (str(vehicleValue.make) || str(vehicleValue.model))) {
    const year = Number(vehicleValue.year);
    const rawType = str(vehicleValue.type);
    const type = (VEHICLE_TYPES as readonly string[]).includes(rawType) ? (rawType as (typeof VEHICLE_TYPES)[number]) : 'car';
    const vehicle = await Vehicle.create({
      shop: shop._id,
      customer: customer._id,
      year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined,
      make: str(vehicleValue.make, 60),
      model: str(vehicleValue.model, 60),
      type,
      size: SIZE_BY_TYPE[type] ?? 'medium',
    });
    vehicleId = vehicle._id;
  }

  // Services field value: array of service ids
  const servicesField = byType('services');
  const rawServices = servicesField ? answers[servicesField.key] : undefined;
  const serviceIds = Array.isArray(rawServices) ? rawServices.map(String).filter((id) => objectId.safeParse(id).success) : [];
  const services = serviceIds.length ? await Service.find({ shop: shop._id, _id: { $in: serviceIds.slice(0, 20) } }).lean() : [];

  // Human-readable answers for the job notes.
  const lines = form.fields.map((f) => {
    const v = answers[f.key];
    let shown = '';
    if (f.type === 'vehicle' && v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      shown = [str(o.year), str(o.make), str(o.model)].filter(Boolean).join(' ');
    } else if (f.type === 'services') shown = services.map((s) => s.name).join(', ');
    else if (f.type === 'checkbox') shown = v ? 'Yes' : 'No';
    else if (Array.isArray(v)) shown = v.map((x) => str(x)).join(', ');
    else shown = str(v, 2000);
    return `${f.label}: ${shown || '—'}`;
  });

  let jobId: Types.ObjectId | undefined;
  if (form.createJob) {
    const job = await createJob(
      shop._id,
      {
        customer: customer._id,
        vehicle: vehicleId,
        title: services.length ? services.map((s) => s.name).slice(0, 2).join(' + ') : `${form.name} request`,
        stage: 'lead',
        lineItems: services.map((s) => ({ service: s._id, name: s.name, description: s.description, category: s.category, qty: 1, unitPrice: s.basePrice, durationMinutes: s.durationMinutes })),
        notes: `Submitted via "${form.name}" form\n\n${lines.join('\n')}`,
        tags: ['lead-form', form.slug],
        leadForm: form._id,
      },
      { source: 'form', message: `Lead captured from the "${form.name}" form`, silent: true },
    );
    jobId = job._id;
    await broadcastJob(shop._id, job._id, 'job:created');
  }
  const leadName = `${customer.firstName} ${customer.lastName ?? ''}`.trim();
  await LeadForm.updateOne({ _id: form._id }, { $inc: { submissions: 1 } });
  await logActivity({ shop: shop._id, action: 'lead.created', entityType: jobId ? 'job' : 'customer', entityId: jobId ?? customer._id, summary: `New lead from "${form.name}": ${leadName}` });
  await notify({
    shop: shop._id,
    title: `New lead: ${leadName}`,
    body: `via ${form.name}${services.length ? ` · ${services.map((s) => s.name).join(', ')}` : ''}`,
    link: jobId ? `/app/jobs/${jobId}` : `/app/customers/${customer._id}`,
    kind: 'info',
  });
  if (isNewCustomer) fire(shop._id, 'customer.created', { customerId: customer._id });
  fire(shop._id, 'lead.created', { jobId, customerId: customer._id });
  res.status(201).json({ ok: true, message: form.successMessage });
});

/* ---------------- Review requests ---------------- */

async function reviewRequest(token: string) {
  const request = await ReviewRequest.findOne({ token });
  if (!request) throw notFound('Review link');
  return request;
}

function googleReviewUrl(shop: { name: string; address?: string | null; googleReviewUrl?: string | null }) {
  return shop.googleReviewUrl || `https://www.google.com/search?q=${encodeURIComponent(`${shop.name} ${shop.address ?? ''} reviews`.trim())}`;
}

publicRouter.get('/reviews/:token', async (req, res) => {
  const request = await reviewRequest(String(req.params.token));
  const [shop, customer, job] = await Promise.all([
    Shop.findById(request.shop).lean(),
    Customer.findById(request.customer).select('firstName').lean(),
    request.job ? Job.findById(request.job).select('number title vehicle').populate('vehicle', 'year make model').lean() : null,
  ]);
  if (!shop) throw notFound('Shop');
  res.json({
    shop: publicShop(shop as ShopLike),
    customerFirstName: customer?.firstName ?? '',
    job: job ? { number: job.number, title: job.title, vehicle: job.vehicle } : null,
    completed: Boolean(request.completedAt),
    rating: request.rating ?? null,
  });
});

publicRouter.post('/reviews/:token', async (req, res) => {
  const body = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(5000).default('') }).parse(req.body);
  const request = await reviewRequest(String(req.params.token));
  if (request.completedAt) throw conflict('Thanks — you have already left feedback for this visit');
  const [shop, customer] = await Promise.all([Shop.findById(request.shop).lean(), Customer.findById(request.customer).select('firstName lastName').lean()]);
  if (!shop) throw notFound('Shop');
  const author = customer ? `${customer.firstName} ${customer.lastName ? `${customer.lastName[0]}.` : ''}`.trim() : 'Customer';
  // Every rating is stored — there is no review gating.
  await Review.create({ shop: shop._id, customer: request.customer, job: request.job, source: 'lustra', rating: body.rating, comment: body.comment, author });
  request.completedAt = new Date();
  request.rating = body.rating;
  await request.save();
  await notify({
    shop: shop._id,
    title: `${'★'.repeat(body.rating)}${'☆'.repeat(5 - body.rating)} review from ${author}`,
    body: body.comment.slice(0, 140),
    link: '/app/reviews',
    kind: body.rating >= 4 ? 'success' : 'warning',
  });
  // Everyone is offered the public Google review link, regardless of rating.
  res.json({ ok: true, redirect: googleReviewUrl(shop) });
});
