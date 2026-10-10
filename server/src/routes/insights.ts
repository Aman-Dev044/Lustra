import { Router } from 'express';
import { z } from 'zod';
import type { Types } from 'mongoose';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { Quote } from '../models/Quote.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Shop } from '../models/Shop.js';
import { ActivityLog, Notification } from '../models/misc.js';
import { ctx } from '../lib/auth.js';
import { dateLike, escapeRegex } from '../lib/validate.js';
import { requireFeature } from '../lib/plans.js';
import { round2 } from '../lib/money.js';
import { JOB_POPULATE } from '../lib/jobs.js';
import { zonedTime } from '../lib/availability.js';

export const analyticsRouter = Router();
export const searchRouter = Router();
export const notificationsRouter = Router();
export const activityRouter = Router();

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 } as const;
const OPEN_STAGES = ['lead', 'quoted', 'scheduled', 'in_progress', 'quality_check'] as const;

const pctChange = (now: number, before: number) => (before === 0 ? (now > 0 ? 100 : 0) : round2(((now - before) / before) * 100));

async function paymentsTotal(shop: Types.ObjectId, from: Date, to: Date): Promise<number> {
  const [row] = await Invoice.aggregate([
    { $match: { shop, status: { $ne: 'void' } } },
    { $unwind: '$payments' },
    { $match: { 'payments.at': { $gte: from, $lt: to } } },
    { $group: { _id: null, total: { $sum: '$payments.amount' } } },
  ]);
  return round2(row?.total ?? 0);
}

analyticsRouter.get('/overview', async (req, res) => {
  const { range } = z.object({ range: z.enum(['7d', '30d', '90d', '365d']).default('30d') }).parse(req.query);
  const { shop } = ctx(req);
  const shopDoc = await Shop.findById(shop).select('timezone').lean();
  const timezone = shopDoc?.timezone ?? 'UTC';
  const days = RANGE_DAYS[range];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const prevFrom = new Date(from.getTime() - days * 86_400_000);
  const bucketFormat = range === '365d' ? '%Y-%m' : '%Y-%m-%d';
  const completedInRange = { shop, stage: 'completed' as const, completedAt: { $gte: from, $lt: to } };

  const [
    revenue, prevRevenue, jobsCompleted, prevJobs, ticketAgg, quoteAgg, outstandingAgg, newCustomers,
    paymentSeries, jobSeries, byCategory, topServices, sources, technicians, pipeline, upcoming,
  ] = await Promise.all([
    paymentsTotal(shop, from, to),
    paymentsTotal(shop, prevFrom, from),
    Job.countDocuments(completedInRange),
    Job.countDocuments({ shop, stage: 'completed', completedAt: { $gte: prevFrom, $lt: from } }),
    Job.aggregate([{ $match: completedInRange }, { $group: { _id: null, avg: { $avg: '$totals.total' } } }]),
    Quote.aggregate([
      { $match: { shop, createdAt: { $gte: from, $lt: to }, status: { $ne: 'draft' } } },
      { $group: { _id: null, sent: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
    ]),
    Invoice.aggregate([{ $match: { shop, status: { $nin: ['void', 'draft'] } } }, { $group: { _id: null, total: { $sum: '$totals.balance' } } }]),
    Customer.countDocuments({ shop, createdAt: { $gte: from, $lt: to } }),
    Invoice.aggregate([
      { $match: { shop, status: { $ne: 'void' } } },
      { $unwind: '$payments' },
      { $match: { 'payments.at': { $gte: from, $lt: to } } },
      { $group: { _id: { $dateToString: { format: bucketFormat, date: '$payments.at', timezone } }, revenue: { $sum: '$payments.amount' } } },
    ]),
    Job.aggregate([
      { $match: completedInRange },
      { $group: { _id: { $dateToString: { format: bucketFormat, date: '$completedAt', timezone } }, jobs: { $sum: 1 } } },
    ]),
    Job.aggregate([
      { $match: completedInRange },
      { $unwind: '$lineItems' },
      { $group: { _id: '$lineItems.category', revenue: { $sum: { $multiply: ['$lineItems.qty', '$lineItems.unitPrice'] } } } },
      { $sort: { revenue: -1 } },
    ]),
    Job.aggregate([
      { $match: completedInRange },
      { $unwind: '$lineItems' },
      { $group: { _id: '$lineItems.name', count: { $sum: '$lineItems.qty' }, revenue: { $sum: { $multiply: ['$lineItems.qty', '$lineItems.unitPrice'] } } } },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Customer.aggregate([{ $match: { shop } }, { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Job.aggregate([
      { $match: completedInRange },
      { $unwind: '$assignees' },
      { $group: { _id: '$assignees', jobs: { $sum: 1 }, revenue: { $sum: '$totals.total' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user', pipeline: [{ $project: { name: 1, avatarColor: 1, role: 1 } }] } },
      { $unwind: '$user' },
    ]),
    Job.aggregate([
      { $match: { shop, stage: { $in: OPEN_STAGES } } },
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$totals.total' } } },
    ]),
    Job.find({ shop, stage: { $in: ['scheduled', 'in_progress'] }, scheduledStart: { $gte: new Date(to.getTime() - 2 * 3_600_000) } })
      .sort({ scheduledStart: 1 })
      .limit(8)
      .populate(JOB_POPULATE),
  ]);

  // Fill empty buckets so charts render continuous axes.
  const revenueByKey = new Map(paymentSeries.map((r) => [r._id as string, r.revenue as number]));
  const jobsByKey = new Map(jobSeries.map((r) => [r._id as string, r.jobs as number]));
  const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const keys: string[] = [];
  if (range === '365d') {
    const cursor = new Date(from);
    cursor.setDate(1);
    while (cursor <= to) {
      keys.push(keyFmt.format(cursor).slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    for (let t = from.getTime() + 86_400_000; t <= to.getTime() + 1; t += 86_400_000) keys.push(keyFmt.format(new Date(t)));
  }
  const revenueSeries = [...new Set(keys)].map((date) => ({
    date: range === '365d' ? `${date}-01` : date,
    revenue: round2(revenueByKey.get(date) ?? 0),
    jobs: jobsByKey.get(date) ?? 0,
  }));

  const pipelineMap = new Map(pipeline.map((p) => [p._id as string, p]));
  res.json({
    range,
    kpis: {
      revenue,
      revenueChange: pctChange(revenue, prevRevenue),
      jobsCompleted,
      jobsChange: pctChange(jobsCompleted, prevJobs),
      avgTicket: round2(ticketAgg[0]?.avg ?? 0),
      conversionRate: quoteAgg[0]?.sent ? round2((quoteAgg[0].approved / quoteAgg[0].sent) * 100) : 0,
      outstanding: round2(outstandingAgg[0]?.total ?? 0),
      newCustomers,
    },
    revenueSeries,
    byCategory: byCategory.map((c) => ({ category: c._id ?? 'other', revenue: round2(c.revenue) })),
    topServices: topServices.map((s) => ({ name: s._id, count: s.count, revenue: round2(s.revenue) })),
    sources: sources.map((s) => ({ source: s._id ?? 'other', count: s.count })),
    technicians: technicians.map((t) => ({ user: t.user, jobs: t.jobs, revenue: round2(t.revenue) })),
    pipeline: OPEN_STAGES.map((stage) => ({ stage, count: pipelineMap.get(stage)?.count ?? 0, value: round2(pipelineMap.get(stage)?.value ?? 0) })),
    upcoming,
  });
});

analyticsRouter.get('/capacity', requireFeature('capacity_planner'), async (req, res) => {
  const q = z.object({ from: dateLike, to: dateLike }).parse(req.query);
  const { shop } = ctx(req);
  const shopDoc = await Shop.findById(shop).select('timezone booking').lean();
  const tz = shopDoc?.timezone ?? 'UTC';
  const bays = shopDoc?.booking?.bays ?? 1;
  const from = q.from ?? new Date();
  const to = q.to ?? new Date(from.getTime() + 7 * 86_400_000);
  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });

  const dates: string[] = [];
  for (let t = from.getTime(); t <= to.getTime() && dates.length < 31; t += 86_400_000) {
    const d = dayFmt.format(new Date(t));
    if (!dates.includes(d)) dates.push(d);
  }
  const rangeStart = zonedTime(dates[0], '00:00', tz);
  const rangeEnd = new Date(zonedTime(dates[dates.length - 1], '00:00', tz).getTime() + 86_400_000);
  const jobs = await Job.find({
    shop,
    stage: { $nin: ['cancelled', 'lead'] },
    scheduledStart: { $lt: rangeEnd },
    scheduledEnd: { $gt: rangeStart },
  })
    .select('scheduledStart scheduledEnd')
    .lean();

  const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm
  const daysOut = dates.map((date) => ({
    date,
    hours: HOURS.map((hour) => {
      const start = zonedTime(date, `${String(hour).padStart(2, '0')}:00`, tz);
      const end = new Date(start.getTime() + 3_600_000);
      const booked = jobs.filter((j) => j.scheduledStart! < end && j.scheduledEnd! > start).length;
      return { hour, booked: Math.min(booked, bays), overbooked: booked > bays };
    }),
  }));
  res.json({ bays, days: daysOut });
});

searchRouter.get('/', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(1).max(100) }).parse(req.query);
  const { shop } = ctx(req);
  const rx = new RegExp(escapeRegex(q), 'i');
  const num = /^\d+$/.test(q) ? Number(q) : null;
  const customers = await Customer.find({ shop, $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }, { company: rx }] })
    .limit(5)
    .select('firstName lastName email phone');
  const customerIds = customers.map((c) => c._id);
  const [vehicles, jobs, invoices, quotes] = await Promise.all([
    Vehicle.find({ shop, $or: [{ make: rx }, { model: rx }, { vin: rx }, { plate: rx }] }).limit(5).populate('customer', 'firstName lastName'),
    Job.find({ shop, $or: [{ title: rx }, { customer: { $in: customerIds } }, ...(num ? [{ number: num }] : [])] })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('number title stage scheduledStart customer totals')
      .populate('customer', 'firstName lastName'),
    Invoice.find({ shop, $or: [{ customer: { $in: customerIds } }, ...(num ? [{ number: num }] : [])] })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('number status totals customer')
      .populate('customer', 'firstName lastName'),
    Quote.find({ shop, $or: [{ title: rx }, { customer: { $in: customerIds } }, ...(num ? [{ number: num }] : [])] })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('number title status totals customer')
      .populate('customer', 'firstName lastName'),
  ]);
  res.json({ customers, vehicles, jobs, invoices, quotes });
});

notificationsRouter.get('/', async (req, res) => {
  const { shop, user } = ctx(req);
  const items = await Notification.find({ shop, $or: [{ user: null }, { user }] }).sort({ createdAt: -1 }).limit(50).lean();
  res.json(
    items.map(({ readBy, __v: _v, ...n }) => ({ ...n, read: (readBy ?? []).some((id) => String(id) === String(user)) })),
  );
});

notificationsRouter.post('/read-all', async (req, res) => {
  const { shop, user } = ctx(req);
  const result = await Notification.updateMany({ shop, $or: [{ user: null }, { user }], readBy: { $ne: user } }, { $addToSet: { readBy: user } });
  res.json({ ok: true, updated: result.modifiedCount });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const { shop, user } = ctx(req);
  await Notification.updateOne({ _id: String(req.params.id), shop }, { $addToSet: { readBy: user } });
  res.json({ ok: true });
});

activityRouter.get('/', async (req, res) => {
  const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).default(30) }).parse(req.query);
  const items = await ActivityLog.find({ shop: ctx(req).shop }).sort({ createdAt: -1 }).limit(limit).populate('actor', 'name avatarColor');
  res.json(items);
});
