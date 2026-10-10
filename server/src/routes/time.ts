import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { TimeEntry } from '../models/misc.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { ctx, hasRole } from '../lib/auth.js';
import { dateLike, objectId } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { hasFeature } from '../lib/plans.js';
import { round2 } from '../lib/money.js';

export const timeRouter = Router();
export const earningsRouter = Router();

timeRouter.get('/status', async (req, res) => {
  const { shop, user } = ctx(req);
  const active = await TimeEntry.findOne({ shop, user, clockOut: null }).populate('job', 'number title');
  res.json({ active });
});

timeRouter.post('/clock-in', async (req, res) => {
  const { job } = z.object({ job: objectId.optional() }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  if (await TimeEntry.exists({ shop, user, clockOut: null })) throw conflict('You are already clocked in');
  if (job && !(await Job.exists({ _id: job, shop }))) throw notFound('Job');
  const entry = await TimeEntry.create({ shop, user, job, clockIn: new Date() });
  await entry.populate('job', 'number title');
  res.status(201).json(entry);
});

timeRouter.post('/clock-out', async (req, res) => {
  const body = z.object({ tips: z.number().min(0).max(100_000).default(0), note: z.string().max(500).default('') }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const entry = await TimeEntry.findOne({ shop, user, clockOut: null });
  if (!entry) throw conflict('You are not clocked in');
  entry.clockOut = new Date();
  entry.minutes = Math.max(0, Math.round((entry.clockOut.getTime() - entry.clockIn.getTime()) / 60_000));
  entry.tips = body.tips;
  entry.note = body.note;
  await entry.save();
  res.json(entry);
});

timeRouter.get('/', async (req, res) => {
  const q = z.object({ user: objectId.optional(), from: dateLike, to: dateLike, limit: z.coerce.number().int().min(1).max(1000).default(200) }).parse(req.query);
  const { shop, user, role } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  // Technicians only see their own time.
  filter.user = hasRole(role, 'manager') ? q.user : user;
  if (!filter.user) delete filter.user;
  if (q.from || q.to) filter.clockIn = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  const entries = await TimeEntry.find(filter).sort({ clockIn: -1 }).limit(q.limit).populate('user', 'name avatarColor').populate('job', 'number title');
  res.json(entries);
});

/**
 * Payroll summary: hours × hourly rate + tips (time entries & invoice payments on assigned jobs)
 * + commission on revenue from completed jobs the person was assigned to (split evenly).
 */
earningsRouter.get('/', async (req, res) => {
  const q = z.object({ from: dateLike, to: dateLike }).parse(req.query);
  const { shop, user, role } = ctx(req);
  const to = q.to ?? new Date();
  const from = q.from ?? new Date(to.getTime() - 14 * 86_400_000);
  const shopDoc = await Shop.findById(shop).select('plan addOns').lean();
  const commissionsEnabled = shopDoc ? hasFeature(shopDoc, 'commissions') : false;

  const users = await User.find({ shop, active: true, ...(hasRole(role, 'manager') ? {} : { _id: user }) }).lean();
  const [timeAgg, jobs, invoiceTips] = await Promise.all([
    TimeEntry.aggregate([
      { $match: { shop, clockIn: { $gte: from, $lte: to } } },
      { $group: { _id: '$user', minutes: { $sum: '$minutes' }, tips: { $sum: '$tips' } } },
    ]),
    Job.find({ shop, stage: 'completed', completedAt: { $gte: from, $lte: to } }).select('assignees totals lineItems').lean(),
    Invoice.aggregate([
      { $match: { shop } },
      { $unwind: '$payments' },
      { $match: { 'payments.at': { $gte: from, $lte: to }, 'payments.tip': { $gt: 0 } } },
      { $lookup: { from: 'jobs', localField: 'job', foreignField: '_id', as: 'j', pipeline: [{ $project: { assignees: 1 } }] } },
      { $unwind: '$j' },
      { $project: { tip: '$payments.tip', assignees: '$j.assignees' } },
    ]),
  ]);

  const time = new Map(timeAgg.map((t) => [String(t._id), t]));
  const revenue = new Map<string, number>();
  const jobCount = new Map<string, number>();
  for (const job of jobs) {
    const people = new Set<string>((job.assignees ?? []).map(String));
    for (const li of job.lineItems ?? []) if (li.assignee) people.add(String(li.assignee));
    if (!people.size) continue;
    const share = (job.totals?.subtotal ?? 0) - (job.totals?.discount ?? 0);
    for (const id of people) {
      revenue.set(id, (revenue.get(id) ?? 0) + share / people.size);
      jobCount.set(id, (jobCount.get(id) ?? 0) + 1);
    }
  }
  const tipsFromInvoices = new Map<string, number>();
  for (const row of invoiceTips) {
    const people: Types.ObjectId[] = row.assignees ?? [];
    for (const id of people) tipsFromInvoices.set(String(id), (tipsFromInvoices.get(String(id)) ?? 0) + row.tip / people.length);
  }

  const result = users.map((u) => {
    const id = String(u._id);
    const minutes = time.get(id)?.minutes ?? 0;
    const hours = round2(minutes / 60);
    const wages = round2(hours * (u.hourlyRate ?? 0));
    const tips = round2((time.get(id)?.tips ?? 0) + (tipsFromInvoices.get(id) ?? 0));
    const commission = commissionsEnabled ? round2(((revenue.get(id) ?? 0) * (u.commissionPercent ?? 0)) / 100) : 0;
    return {
      user: { _id: u._id, name: u.name, role: u.role, avatarColor: u.avatarColor, hourlyRate: u.hourlyRate, commissionPercent: u.commissionPercent },
      minutes,
      hours,
      wages,
      tips,
      commission,
      revenue: round2(revenue.get(id) ?? 0),
      total: round2(wages + tips + commission),
      jobs: jobCount.get(id) ?? 0,
    };
  });
  res.json(result.sort((a, b) => b.total - a.total));
});
