import { Router } from 'express';
import { z } from 'zod';
import { Membership, MembershipPlan } from '../models/misc.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { ctx, requireRole } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { csv, dateLike, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS, VEHICLE_FIELDS } from '../lib/http.js';
import { notFound } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';

export const membershipsRouter = Router();
membershipsRouter.use(requireFeature('memberships'));

/* ---------- Plans ---------- */
const planBody = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().min(0).max(100_000),
  interval: z.enum(['month', 'year']).default('month'),
  perks: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  discountPercent: z.number().min(0).max(100).default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7c5cff'),
  active: z.boolean().default(true),
});

membershipsRouter.get('/plans', async (req, res) => {
  const { shop } = ctx(req);
  const [plans, counts] = await Promise.all([
    MembershipPlan.find({ shop }).sort({ price: 1 }),
    Membership.aggregate([{ $match: { shop, status: 'active' } }, { $group: { _id: '$plan', members: { $sum: 1 } } }]),
  ]);
  const byPlan = new Map(counts.map((c) => [String(c._id), c.members as number]));
  res.json(plans.map((p) => ({ ...p.toJSON(), members: byPlan.get(String(p._id)) ?? 0 })));
});

membershipsRouter.post('/plans', requireRole('manager'), async (req, res) => {
  const body = planBody.parse(req.body);
  res.status(201).json(await MembershipPlan.create({ ...body, shop: ctx(req).shop }));
});

membershipsRouter.patch('/plans/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(planBody).parse(req.body);
  const plan = await findOwned(MembershipPlan, ctx(req).shop, req.params.id, 'Membership plan');
  plan.set(body);
  await plan.save();
  res.json(plan);
});

membershipsRouter.delete('/plans/:id', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const plan = await findOwned(MembershipPlan, shop, req.params.id, 'Membership plan');
  if (await Membership.exists({ shop, plan: plan._id, status: 'active' })) {
    plan.active = false;
    await plan.save();
    return res.json(plan);
  }
  await plan.deleteOne();
  res.json({ ok: true });
});

/* ---------- Members ---------- */
const memberBody = z.object({
  plan: objectId,
  customer: objectId,
  vehicle: objectId.optional().nullable(),
  status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  startedAt: dateLike,
  nextBillingAt: dateLike,
  washesUsed: z.number().int().min(0).default(0),
});

const POPULATE = [
  { path: 'plan' },
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'vehicle', select: VEHICLE_FIELDS },
];

const filters = listQuery.extend({ status: csv, plan: objectId.optional(), customer: objectId.optional() });

membershipsRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.plan) filter.plan = q.plan;
  if (q.customer) filter.customer = q.customer;
  const sort = parseSort(q.sort, ['createdAt', 'nextBillingAt', 'startedAt'], { createdAt: -1 });
  const [items, total, mrrAgg] = await Promise.all([
    Membership.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    Membership.countDocuments(filter),
    Membership.aggregate([
      { $match: { shop, status: 'active' } },
      { $lookup: { from: 'membershipplans', localField: 'plan', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { _id: null, mrr: { $sum: { $cond: [{ $eq: ['$p.interval', 'year'] }, { $divide: ['$p.price', 12] }, '$p.price'] } }, active: { $sum: 1 } } },
    ]),
  ]);
  res.json({ ...paged(items, total, q), summary: { mrr: Math.round((mrrAgg[0]?.mrr ?? 0) * 100) / 100, active: mrrAgg[0]?.active ?? 0 } });
});

function addInterval(date: Date, interval: string): Date {
  const next = new Date(date);
  if (interval === 'year') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

membershipsRouter.post('/', async (req, res) => {
  const body = memberBody.parse(req.body);
  const { shop, user } = ctx(req);
  const plan = await MembershipPlan.findOne({ _id: body.plan, shop });
  if (!plan) throw notFound('Membership plan');
  const customer = await Customer.findOne({ _id: body.customer, shop });
  if (!customer) throw notFound('Customer');
  if (body.vehicle && !(await Vehicle.exists({ _id: body.vehicle, shop }))) throw notFound('Vehicle');
  const startedAt = body.startedAt ?? new Date();
  const membership = await Membership.create({ ...body, shop, startedAt, nextBillingAt: body.nextBillingAt ?? addInterval(startedAt, plan.interval) });
  await Customer.updateOne({ _id: customer._id }, { $addToSet: { tags: 'member' } });
  await logActivity({ shop, actor: user, action: 'membership.created', entityType: 'membership', entityId: membership._id, summary: `${customer.firstName} joined ${plan.name}` });
  await membership.populate(POPULATE);
  res.status(201).json(membership);
});

membershipsRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(memberBody.omit({ customer: true })).parse(req.body);
  const { shop } = ctx(req);
  if (body.plan && !(await MembershipPlan.exists({ _id: body.plan, shop }))) throw notFound('Membership plan');
  const membership = await findOwned(Membership, shop, req.params.id, 'Membership');
  membership.set(defined(body));
  await membership.save();
  await membership.populate(POPULATE);
  res.json(membership);
});

membershipsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const membership = await findOwned(Membership, ctx(req).shop, req.params.id, 'Membership');
  await membership.deleteOne();
  res.json({ ok: true });
});
