import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Job } from '../models/Job.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { User } from '../models/User.js';
import { JOB_STAGES, SERVICE_CATEGORIES, type JobStage } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, dateLike, escapeRegex, geoInput, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { findOwned, defined } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { JOB_POPULATE, broadcastJob, changeStage, createJob, loadJobForClient, recurrenceInterval } from '../lib/jobs.js';
import { RECURRENCE_FREQUENCIES } from '../models/Job.js';
import { Shop } from '../models/Shop.js';
import { portalLink, sendMessage } from '../lib/messaging.js';
import { emitToShop } from '../lib/realtime.js';
import { logActivity } from '../lib/activity.js';
import { requireFeature } from '../lib/plans.js';

export const jobsRouter = Router();

export const lineItemInput = z.object({
  _id: objectId.optional(),
  service: objectId.optional().nullable(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(''),
  category: z.enum(SERVICE_CATEGORIES).default('other'),
  qty: z.number().min(0).max(10_000).default(1),
  unitPrice: z.number().min(0).max(10_000_000).default(0),
  discount: z.number().min(0).default(0),
  durationMinutes: z.number().int().min(0).max(20_000).default(60),
  assignee: objectId.optional().nullable(),
  scheduledStart: dateLike,
  scheduledEnd: dateLike,
  status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
  optional: z.boolean().default(false),
  selected: z.boolean().default(true),
});

const jobBody = z.object({
  customer: objectId,
  vehicle: objectId.optional().nullable(),
  title: z.string().trim().max(200).default(''),
  stage: z.enum(JOB_STAGES).optional(),
  priority: z.enum(['low', 'normal', 'high', 'rush']).default('normal'),
  lineItems: z.array(lineItemInput).max(100).default([]),
  scheduledStart: dateLike,
  scheduledEnd: dateLike,
  bay: z.number().int().min(1).max(50).optional().nullable(),
  location: objectId.optional().nullable(),
  assignees: z.array(objectId).max(30).default([]),
  notes: z.string().max(5000).default(''),
  internalNotes: z.string().max(5000).default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  source: z.string().max(40).optional(),
  mobile: z.boolean().default(false),
  serviceAddress: z.string().trim().max(300).default(''),
  geo: geoInput.optional().nullable(),
  recurrence: z
    .object({
      frequency: z.enum(RECURRENCE_FREQUENCIES),
      intervalDays: z.number().int().min(1).max(730).optional(),
      endsAt: dateLike,
    })
    .optional()
    .nullable(),
});

type RecurrenceInput = { frequency: string; intervalDays?: number; endsAt?: Date } | null | undefined;

function normalizeRecurrence(rec: RecurrenceInput, parent?: unknown) {
  if (!rec) return undefined;
  return { ...rec, intervalDays: recurrenceInterval(rec.frequency, rec.intervalDays), generatedNext: false, ...(parent ? { parent } : {}) };
}

/** Mobile jobs without coordinates inherit the customer's geocoded location. */
async function customerGeo(shop: Types.ObjectId, customer: unknown) {
  const c = await Customer.findOne({ _id: customer, shop }).select('geo').lean();
  return c?.geo?.lat != null ? { lat: c.geo.lat, lng: c.geo.lng } : undefined;
}

async function assertRefs(shop: Types.ObjectId, body: { customer?: string; vehicle?: string | null; assignees?: string[] }) {
  if (body.customer && !(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  if (body.vehicle && !(await Vehicle.exists({ _id: body.vehicle, shop }))) throw notFound('Vehicle');
  if (body.assignees?.length) {
    const count = await User.countDocuments({ _id: { $in: body.assignees }, shop });
    if (count !== new Set(body.assignees).size) throw badRequest('Unknown team member in assignees');
  }
}

/** Default end = start + total line-item duration. */
function withDefaultEnd<T extends { scheduledStart?: Date; scheduledEnd?: Date; lineItems?: { durationMinutes: number }[] }>(body: T): T {
  if (body.scheduledStart && !body.scheduledEnd) {
    const minutes = (body.lineItems ?? []).reduce((s, i) => s + (i.durationMinutes || 0), 0) || 120;
    body.scheduledEnd = new Date(body.scheduledStart.getTime() + minutes * 60_000);
  }
  return body;
}

const filters = listQuery.extend({
  stage: csv,
  from: dateLike,
  to: dateLike,
  assignee: objectId.optional(),
  customer: objectId.optional(),
});

jobsRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.stage?.length) filter.stage = { $in: q.stage.filter((s) => (JOB_STAGES as readonly string[]).includes(s)) };
  if (q.from || q.to) {
    filter.scheduledStart = defined({ $gte: q.from, $lte: q.to });
  }
  if (q.assignee) filter.$and = [{ $or: [{ assignees: q.assignee }, { 'lineItems.assignee': q.assignee }] }];
  if (q.customer) filter.customer = q.customer;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const customerIds = await Customer.find({ shop, $or: [{ firstName: rx }, { lastName: rx }, { phone: rx }, { email: rx }] }).distinct('_id');
    const or: Record<string, unknown>[] = [{ title: rx }, { tags: rx }, { customer: { $in: customerIds } }];
    if (/^\d+$/.test(q.q)) or.push({ number: Number(q.q) });
    filter.$or = or;
  }
  const sort = parseSort(q.sort, ['createdAt', 'scheduledStart', 'number', 'updatedAt'], q.from || q.to ? { scheduledStart: 1 } : { createdAt: -1 });
  const [items, total] = await Promise.all([
    Job.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(JOB_POPULATE),
    Job.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

jobsRouter.get('/board', async (req, res) => {
  const { shop } = ctx(req);
  const since = new Date(Date.now() - 14 * 86_400_000);
  const jobs = await Job.find({
    shop,
    $or: [
      { stage: { $in: ['lead', 'quoted', 'scheduled', 'in_progress', 'quality_check'] } },
      { stage: 'completed', $or: [{ completedAt: { $gte: since } }, { completedAt: null, updatedAt: { $gte: since } }] },
    ],
  })
    .sort({ priority: -1, scheduledStart: 1, createdAt: -1 })
    .limit(500)
    .populate(JOB_POPULATE);
  const columns = Object.fromEntries(
    JOB_STAGES.filter((s) => s !== 'cancelled').map((stage) => [stage, jobs.filter((j) => j.stage === stage)]),
  );
  res.json({ columns });
});

jobsRouter.get('/:id', async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, shop: ctx(req).shop })
    .populate(JOB_POPULATE)
    .populate('timeline.by', 'name avatarColor')
    .populate('quote', 'number status totals publicToken')
    .populate('invoice', 'number status totals publicToken');
  if (!job) throw notFound('Job');
  res.json(job);
});

jobsRouter.post('/', async (req, res) => {
  const body = withDefaultEnd(jobBody.parse(req.body));
  const { shop, user } = ctx(req);
  await assertRefs(shop, body);
  const geo = body.geo ?? (body.mobile ? await customerGeo(shop, body.customer) : undefined);
  const job = await createJob(
    shop,
    { ...body, geo, recurrence: normalizeRecurrence(body.recurrence), stage: body.stage ?? (body.scheduledStart ? 'scheduled' : 'lead') },
    { actor: user, source: body.source ?? 'manual' },
  );
  res.status(201).json(await loadJobForClient(shop, job._id));
});

jobsRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(jobBody).parse(req.body);
  const { shop, user } = ctx(req);
  await assertRefs(shop, body);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  const { stage, recurrence, geo, ...rest } = body;
  job.set(defined(rest));
  if (geo !== undefined) job.set('geo', geo ?? undefined);
  if (recurrence !== undefined) job.set('recurrence', normalizeRecurrence(recurrence, job.recurrence?.parent));
  if (job.mobile && !job.geo) job.set('geo', await customerGeo(shop, job.customer));
  if (rest.scheduledStart && !rest.scheduledEnd) {
    const minutes = job.lineItems.reduce((sum, i) => sum + (i.durationMinutes || 0), 0) || 120;
    job.scheduledEnd = new Date(rest.scheduledStart.getTime() + minutes * 60_000);
  }
  if (rest.scheduledStart && job.stage === 'lead') job.stage = 'scheduled';
  await job.save();
  if (stage && stage !== job.stage) await changeStage(job, stage as JobStage, user);
  else await broadcastJob(shop, job._id);
  res.json(await loadJobForClient(shop, job._id));
});

jobsRouter.patch('/:id/stage', async (req, res) => {
  const { stage } = z.object({ stage: z.enum(JOB_STAGES) }).parse(req.body);
  const { shop, user } = ctx(req);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  await changeStage(job, stage, user);
  res.json(await loadJobForClient(shop, job._id));
});

jobsRouter.post('/:id/notes', async (req, res) => {
  const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(req.body);
  const { shop, user } = ctx(req);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  job.timeline.push({ type: 'note', message, by: user, at: new Date() });
  await job.save();
  const updated = await broadcastJob(shop, job._id);
  res.status(201).json(updated);
});

jobsRouter.patch('/:id/checklist', async (req, res) => {
  const { checklist } = z
    .object({ checklist: z.array(z.object({ _id: objectId.optional(), label: z.string().trim().min(1).max(200), done: z.boolean().default(false) })).max(50) })
    .parse(req.body);
  const { shop } = ctx(req);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  job.set('checklist', checklist);
  await job.save();
  res.json(await broadcastJob(shop, job._id));
});

jobsRouter.patch('/:id/line-items/:itemId', requireFeature('line_item_scheduling'), async (req, res) => {
  const body = z
    .object({
      assignee: objectId.optional().nullable(),
      scheduledStart: dateLike,
      scheduledEnd: dateLike,
      status: z.enum(['pending', 'in_progress', 'done']).optional(),
    })
    .parse(req.body);
  const { shop, user } = ctx(req);
  await assertRefs(shop, { assignees: body.assignee ? [body.assignee] : [] });
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  const item = job.lineItems.id(String(req.params.itemId));
  if (!item) throw notFound('Line item');
  if (body.assignee !== undefined) item.set('assignee', body.assignee ?? undefined);
  if (body.scheduledStart) item.scheduledStart = body.scheduledStart;
  if (body.scheduledEnd) item.scheduledEnd = body.scheduledEnd;
  if (body.status && body.status !== item.status) {
    item.status = body.status;
    job.timeline.push({ type: 'system', message: `"${item.name}" marked ${body.status.replace('_', ' ')}`, by: user, at: new Date() });
  }
  await job.save();
  res.json(await broadcastJob(shop, job._id));
});

jobsRouter.post('/:id/on-my-way', async (req, res) => {
  const { etaMinutes } = z.object({ etaMinutes: z.number().int().min(1).max(600) }).parse(req.body);
  const { shop, user } = ctx(req);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  const [customer, shopDoc, me] = await Promise.all([
    Customer.findById(job.customer),
    Shop.findById(shop).select('name timezone').lean(),
    User.findById(user).select('name').lean(),
  ]);
  if (!customer) throw notFound('Customer');
  const eta = new Date(Date.now() + etaMinutes * 60_000);
  const time = eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: shopDoc?.timezone ?? 'UTC' });
  job.eta = eta;
  job.timeline.push({ type: 'system', message: `${me?.name ?? 'Technician'} is on the way — ETA ${time} (${etaMinutes} min)`, by: user, at: new Date() });
  await job.save();
  await sendMessage({
    shop,
    customer,
    job: job._id,
    channel: 'sms',
    body: `Hi ${customer.firstName}! ${me?.name?.split(' ')[0] ?? 'Your technician'} from ${shopDoc?.name ?? 'our team'} is on the way and should arrive around ${time} (~${etaMinutes} min). Track live: ${portalLink(job.portalToken)}`,
    by: user,
  });
  res.json(await broadcastJob(shop, job._id));
});

jobsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const { shop, user } = ctx(req);
  const job = await findOwned(Job, shop, req.params.id, 'Job');
  await job.deleteOne();
  await logActivity({ shop, actor: user, action: 'job.deleted', entityType: 'job', entityId: job._id, summary: `Job #${job.number} deleted` });
  emitToShop(shop, 'job:deleted', { _id: job._id });
  res.json({ ok: true });
});
