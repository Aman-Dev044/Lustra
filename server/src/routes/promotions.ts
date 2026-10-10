import { Router } from 'express';
import { z } from 'zod';
import { Coupon, GiftCard } from '../models/growth.js';
import { Customer } from '../models/Customer.js';
import { SERVICE_CATEGORIES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, dateLike, emailField, listQuery, objectId, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS } from '../lib/http.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { checkCoupon } from '../lib/coupons.js';
import { newGiftCardCode } from '../lib/giftcards.js';
import { round2 } from '../lib/money.js';
import { logActivity } from '../lib/activity.js';
import { sendMessage } from '../lib/messaging.js';

export const couponsRouter = Router();
export const giftCardsRouter = Router();

/* ---------------- Coupons ---------------- */

const couponBody = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _').transform((v) => v.toUpperCase()),
  description: z.string().max(300).default(''),
  type: z.enum(['percent', 'fixed']).default('percent'),
  value: z.number().positive().max(100_000),
  minSpend: z.number().min(0).default(0),
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: dateLike,
  active: z.boolean().default(true),
  categories: z.array(z.enum(SERVICE_CATEGORIES)).default([]),
});

couponsRouter.post('/validate', async (req, res) => {
  const body = z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().min(0), categories: z.array(z.string()).optional() }).parse(req.body);
  const check = await checkCoupon(ctx(req).shop, body.code, { subtotal: body.subtotal, categories: body.categories });
  res.json({ valid: check.valid, amount: check.amount, ...(check.coupon ? { coupon: check.coupon.toJSON() } : {}), ...(check.reason ? { reason: check.reason } : {}) });
});

couponsRouter.get('/', async (req, res) => {
  const q = listQuery.extend({ active: z.enum(['true', 'false']).optional() }).parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ code: rx }, { description: rx }];
  if (q.active) filter.active = q.active === 'true';
  const sort = parseSort(q.sort, ['createdAt', 'code', 'uses', 'expiresAt'], { createdAt: -1 });
  const [items, total] = await Promise.all([Coupon.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize), Coupon.countDocuments(filter)]);
  res.json(paged(items, total, q));
});

couponsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Coupon, ctx(req).shop, req.params.id, 'Coupon'));
});

couponsRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = couponBody.parse(req.body);
  if (body.type === 'percent' && body.value > 100) throw badRequest('Percent coupons cannot exceed 100%');
  const { shop } = ctx(req);
  if (await Coupon.exists({ shop, code: body.code })) throw conflict(`Coupon ${body.code} already exists`);
  res.status(201).json(await Coupon.create({ ...body, maxUses: body.maxUses ?? undefined, shop }));
});

couponsRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(couponBody).parse(req.body);
  const { shop } = ctx(req);
  const coupon = await findOwned(Coupon, shop, req.params.id, 'Coupon');
  if (body.code && body.code !== coupon.code && (await Coupon.exists({ shop, code: body.code }))) throw conflict(`Coupon ${body.code} already exists`);
  coupon.set(defined(body));
  if (body.maxUses === null) coupon.set('maxUses', undefined);
  if (coupon.type === 'percent' && coupon.value > 100) throw badRequest('Percent coupons cannot exceed 100%');
  await coupon.save();
  res.json(coupon);
});

couponsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const coupon = await findOwned(Coupon, ctx(req).shop, req.params.id, 'Coupon');
  await coupon.deleteOne();
  res.json({ ok: true });
});

/* ---------------- Gift cards ---------------- */

const giftCardBody = z.object({
  initialBalance: z.number().positive().max(100_000),
  recipientName: z.string().trim().min(1).max(120),
  recipientEmail: z.union([emailField, z.literal('')]).optional(),
  message: z.string().max(1000).default(''),
  customer: objectId.optional().nullable(),
  expiresAt: dateLike,
  sendEmail: z.boolean().default(false),
});

giftCardsRouter.get('/lookup/:code', async (req, res) => {
  const card = await GiftCard.findOne({ shop: ctx(req).shop, code: String(req.params.code).trim().toUpperCase() }).populate('customer', CUSTOMER_FIELDS);
  if (!card) throw notFound('Gift card');
  res.json(card);
});

giftCardsRouter.get('/', async (req, res) => {
  const q = listQuery.extend({ status: csv }).parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ code: rx }, { recipientName: rx }, { recipientEmail: rx }];
  if (q.status?.length) filter.status = { $in: q.status };
  const sort = parseSort(q.sort, ['createdAt', 'balance', 'expiresAt'], { createdAt: -1 });
  const [items, total, summary] = await Promise.all([
    GiftCard.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate('customer', CUSTOMER_FIELDS),
    GiftCard.countDocuments(filter),
    GiftCard.aggregate([{ $match: { shop, status: { $ne: 'void' } } }, { $group: { _id: null, sold: { $sum: '$initialBalance' }, outstanding: { $sum: '$balance' } } }]),
  ]);
  res.json({ ...paged(items, total, q), summary: { sold: round2(summary[0]?.sold ?? 0), outstanding: round2(summary[0]?.outstanding ?? 0) } });
});

giftCardsRouter.get('/:id', async (req, res) => {
  const card = await findOwned(GiftCard, ctx(req).shop, req.params.id, 'Gift card');
  await card.populate([{ path: 'customer', select: CUSTOMER_FIELDS }, { path: 'transactions.invoice', select: 'number' }]);
  res.json(card);
});

giftCardsRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = giftCardBody.parse(req.body);
  const { shop, user } = ctx(req);
  const customer = body.customer ? await Customer.findOne({ _id: body.customer, shop }) : null;
  if (body.customer && !customer) throw notFound('Customer');
  const amount = round2(body.initialBalance);
  let card;
  for (let attempt = 0; ; attempt++) {
    try {
      card = await GiftCard.create({
        shop,
        code: newGiftCardCode(),
        initialBalance: amount,
        balance: amount,
        customer: customer?._id,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail ?? '',
        message: body.message,
        expiresAt: body.expiresAt,
        transactions: [{ amount, note: 'Card issued' }],
      });
      break;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000 || attempt > 4) throw err;
    }
  }
  if (body.sendEmail && customer) {
    await sendMessage({ shop, customer, channel: 'email', subject: `You received a $${amount.toFixed(2)} gift card!`, body: `Hi ${body.recipientName}, ${body.message ? `${body.message}\n\n` : ''}Your gift card code is ${card.code} for $${amount.toFixed(2)}.`, by: user });
  }
  await logActivity({ shop, actor: user, action: 'giftcard.issued', entityType: 'giftcard', entityId: card._id, summary: `Gift card ${card.code} issued for $${amount.toFixed(2)}` });
  res.status(201).json(card);
});

giftCardsRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = z
    .object({ recipientName: z.string().trim().min(1).max(120), recipientEmail: z.union([emailField, z.literal('')]), message: z.string().max(1000), expiresAt: dateLike, status: z.enum(['active', 'void']) })
    .partial()
    .parse(req.body);
  const card = await findOwned(GiftCard, ctx(req).shop, req.params.id, 'Gift card');
  card.set(defined(body));
  if (body.status === 'active' && card.balance <= 0) card.status = 'depleted';
  await card.save();
  res.json(card);
});

giftCardsRouter.post('/:id/adjust', requireRole('manager'), async (req, res) => {
  const body = z.object({ amount: z.number().refine((n) => n !== 0, 'amount cannot be 0').refine((n) => Math.abs(n) <= 100_000), note: z.string().trim().min(1).max(300) }).parse(req.body);
  const { shop, user } = ctx(req);
  const card = await findOwned(GiftCard, shop, req.params.id, 'Gift card');
  if (card.status === 'void') throw conflict('This gift card is void');
  const amount = round2(body.amount);
  if (card.balance + amount < -0.005) throw badRequest(`Adjustment exceeds the balance of $${card.balance.toFixed(2)}`);
  card.balance = round2(Math.max(0, card.balance + amount));
  card.transactions.push({ amount, note: body.note, at: new Date() });
  card.status = card.balance > 0 ? 'active' : 'depleted';
  await card.save();
  await logActivity({ shop, actor: user, action: 'giftcard.adjusted', entityType: 'giftcard', entityId: card._id, summary: `Gift card ${card.code} adjusted by $${amount.toFixed(2)}` });
  res.json(card);
});

giftCardsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const card = await findOwned(GiftCard, ctx(req).shop, req.params.id, 'Gift card');
  if (card.transactions.some((t) => t.amount < 0)) {
    card.status = 'void';
    await card.save();
    return res.json(card);
  }
  await card.deleteOne();
  res.json({ ok: true });
});
