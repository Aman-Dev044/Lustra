import { Router } from 'express';
import { z } from 'zod';
import type { Types } from 'mongoose';
import { Quote } from '../models/Quote.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Service } from '../models/Service.js';
import { Shop } from '../models/Shop.js';
import { Job } from '../models/Job.js';
import { VEHICLE_SIZES, VEHICLE_TYPES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, dateLike, escapeRegex, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS, VEHICLE_FIELDS } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { nextNumber } from '../lib/counters.js';
import { requireFeature } from '../lib/plans.js';
import { runCopilot } from '../lib/copilot.js';
import { logActivity } from '../lib/activity.js';
import { fire } from '../lib/automations.js';
import { portalLink, sendMessage } from '../lib/messaging.js';
import { emitToShop } from '../lib/realtime.js';
import { quoteToJob } from '../lib/quotes.js';
import { lineItemInput } from './jobs.js';
import { loadJobForClient } from '../lib/jobs.js';

export const quotesRouter = Router();

const quoteBody = z.object({
  customer: objectId,
  vehicle: objectId.optional().nullable(),
  job: objectId.optional().nullable(),
  title: z.string().trim().max(200).default(''),
  items: z.array(lineItemInput).max(100).default([]),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(50).optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'approved', 'declined', 'expired']).optional(),
  validUntil: dateLike,
  notes: z.string().max(5000).default(''),
  aiGenerated: z.boolean().default(false),
  copilotPrompt: z.string().max(4000).default(''),
});

const POPULATE = [
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'vehicle', select: VEHICLE_FIELDS },
  { path: 'job', select: 'number stage portalToken' },
];

const filters = listQuery.extend({ status: csv, customer: objectId.optional() });

quotesRouter.post('/copilot', requireFeature('quote_copilot'), async (req, res) => {
  const body = z
    .object({
      prompt: z.string().trim().min(3).max(4000),
      vehicleSize: z.enum(VEHICLE_SIZES).optional(),
      vehicleType: z.enum(VEHICLE_TYPES).optional(),
    })
    .parse(req.body);
  const services = await Service.find({ shop: ctx(req).shop, active: true }).lean();
  res.json(runCopilot(body.prompt, services, { vehicleSize: body.vehicleSize, vehicleType: body.vehicleType }));
});

quotesRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.customer) filter.customer = q.customer;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const customerIds = await Customer.find({ shop, $or: [{ firstName: rx }, { lastName: rx }, { email: rx }] }).distinct('_id');
    const or: Record<string, unknown>[] = [{ title: rx }, { customer: { $in: customerIds } }];
    if (/^\d+$/.test(q.q)) or.push({ number: Number(q.q) });
    filter.$or = or;
  }
  const sort = parseSort(q.sort, ['createdAt', 'number', 'totals.total', 'validUntil'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    Quote.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    Quote.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

quotesRouter.get('/:id', async (req, res) => {
  const quote = await findOwned(Quote, ctx(req).shop, req.params.id, 'Quote');
  await quote.populate(POPULATE);
  res.json(quote);
});

async function assertRefs(shop: Types.ObjectId, body: { customer?: string; vehicle?: string | null; job?: string | null }) {
  if (body.customer && !(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  if (body.vehicle && !(await Vehicle.exists({ _id: body.vehicle, shop }))) throw notFound('Vehicle');
  if (body.job && !(await Job.exists({ _id: body.job, shop }))) throw notFound('Job');
}

quotesRouter.post('/', async (req, res) => {
  const body = quoteBody.parse(req.body);
  const { shop, user } = ctx(req);
  await assertRefs(shop, body);
  const shopDoc = await Shop.findById(shop).select('taxRate').lean();
  const quote = await Quote.create({
    ...body,
    status: body.status === 'draft' || !body.status ? 'draft' : body.status,
    taxRate: body.taxRate ?? shopDoc?.taxRate ?? 0,
    validUntil: body.validUntil ?? new Date(Date.now() + 30 * 86_400_000),
    shop,
    number: await nextNumber(shop, 'quote'),
  });
  if (body.job) {
    await Job.updateOne({ _id: body.job, shop }, { $set: { quote: quote._id }, $push: { timeline: { type: 'quote', message: `Quote #${quote.number} created`, by: user } } });
  }
  await logActivity({ shop, actor: user, action: 'quote.created', entityType: 'quote', entityId: quote._id, summary: `Quote #${quote.number} created${body.aiGenerated ? ' with Copilot' : ''}` });
  await quote.populate(POPULATE);
  res.status(201).json(quote);
});

quotesRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(quoteBody).parse(req.body);
  const { shop } = ctx(req);
  await assertRefs(shop, body);
  const quote = await findOwned(Quote, shop, req.params.id, 'Quote');
  quote.set(defined(body));
  await quote.save();
  await quote.populate(POPULATE);
  emitToShop(shop, 'quote:updated', quote.toJSON());
  res.json(quote);
});

quotesRouter.post('/:id/send', async (req, res) => {
  const body = z.object({ channel: z.enum(['sms', 'email']).default('sms'), message: z.string().max(2000).optional() }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const quote = await findOwned(Quote, shop, req.params.id, 'Quote');
  if (!quote.items.length) throw badRequest('Add at least one item before sending');
  const [customer, shopDoc] = await Promise.all([Customer.findById(quote.customer), Shop.findById(shop).select('name')]);
  if (!customer) throw notFound('Customer');

  quote.status = 'sent';
  quote.sentAt = new Date();
  await quote.save();

  const link = portalLink(quote.publicToken);
  await sendMessage({
    shop,
    customer,
    job: quote.job,
    channel: body.channel,
    subject: `Your quote from ${shopDoc?.name ?? 'us'}`,
    body: body.message ?? `Hi ${customer.firstName}, your quote #${quote.number} for $${quote.totals?.total?.toFixed(2)} is ready. Review & approve: ${link}`,
    by: user,
  });
  if (quote.job) {
    await Job.updateOne({ _id: quote.job, shop, stage: 'lead' }, { $set: { stage: 'quoted' } });
  }
  await logActivity({ shop, actor: user, action: 'quote.sent', entityType: 'quote', entityId: quote._id, summary: `Quote #${quote.number} sent to ${customer.firstName}` });
  fire(shop, 'quote.sent', { quoteId: quote._id, customerId: quote.customer, jobId: quote.job ?? undefined });
  await quote.populate(POPULATE);
  emitToShop(shop, 'quote:updated', quote.toJSON());
  res.json(quote);
});

quotesRouter.post('/:id/convert', async (req, res) => {
  const body = z.object({ scheduledStart: dateLike }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const quote = await findOwned(Quote, shop, req.params.id, 'Quote');
  if (!quote.items.length) throw badRequest('This quote has no items');
  if (['draft', 'sent', 'viewed'].includes(quote.status)) {
    quote.status = 'approved';
    quote.approvedAt = new Date();
  }
  const jobId = await quoteToJob(quote, { actor: user, scheduledStart: body.scheduledStart });
  await logActivity({ shop, actor: user, action: 'quote.converted', entityType: 'quote', entityId: quote._id, summary: `Quote #${quote.number} converted to a job` });
  res.status(201).json(await loadJobForClient(shop, jobId));
});

quotesRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const quote = await findOwned(Quote, shop, req.params.id, 'Quote');
  await quote.deleteOne();
  if (quote.job) await Job.updateOne({ _id: quote.job, shop }, { $unset: { quote: 1 } });
  res.json({ ok: true });
});
