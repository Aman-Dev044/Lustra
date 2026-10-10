import { Router } from 'express';
import { z } from 'zod';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { Shop } from '../models/Shop.js';
import { PAYMENT_METHODS } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, dateLike, escapeRegex, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS } from '../lib/http.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { nextNumber } from '../lib/counters.js';
import { round2 } from '../lib/money.js';
import { checkCoupon, consumeCoupon, releaseCoupon } from '../lib/coupons.js';
import { redeemGiftCard } from '../lib/giftcards.js';
import { dispatchWebhooks } from '../lib/webhooks.js';
import { invoiceFromJob, recordPayment } from '../lib/invoices.js';
import { portalLink, sendMessage } from '../lib/messaging.js';
import { logActivity } from '../lib/activity.js';
import { emitToShop } from '../lib/realtime.js';

export const invoicesRouter = Router();

const itemInput = z.object({
  _id: objectId.optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(''),
  qty: z.number().min(0).max(10_000).default(1),
  unitPrice: z.number().min(0).max(10_000_000).default(0),
});

const invoiceBody = z.object({
  customer: objectId,
  job: objectId.optional().nullable(),
  items: z.array(itemInput).max(200).default([]),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(50).optional(),
  dueDate: dateLike,
  notes: z.string().max(5000).default(''),
});

const POPULATE = [
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'job', select: 'number title stage vehicle portalToken', populate: { path: 'vehicle', select: 'year make model color' } },
  { path: 'payments.by', select: 'name' },
];

const filters = listQuery.extend({ status: csv, customer: objectId.optional(), from: dateLike, to: dateLike });

invoicesRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.customer) filter.customer = q.customer;
  if (q.from || q.to) filter.createdAt = defined({ $gte: q.from, $lte: q.to });
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const customerIds = await Customer.find({ shop, $or: [{ firstName: rx }, { lastName: rx }, { email: rx }] }).distinct('_id');
    const or: Record<string, unknown>[] = [{ customer: { $in: customerIds } }, { 'items.name': rx }];
    if (/^\d+$/.test(q.q)) or.push({ number: Number(q.q) });
    filter.$or = or;
  }
  const sort = parseSort(q.sort, ['createdAt', 'number', 'dueDate', 'totals.total', 'totals.balance'], { createdAt: -1 });
  const [items, total, summary] = await Promise.all([
    Invoice.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    Invoice.countDocuments(filter),
    Invoice.aggregate([
      { $match: { shop, status: { $ne: 'void' } } },
      { $group: { _id: null, outstanding: { $sum: '$totals.balance' }, collected: { $sum: '$totals.paid' } } },
    ]),
  ]);
  res.json({ ...paged(items, total, q), summary: { outstanding: round2(summary[0]?.outstanding ?? 0), collected: round2(summary[0]?.collected ?? 0) } });
});

invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await findOwned(Invoice, ctx(req).shop, req.params.id, 'Invoice');
  await invoice.populate(POPULATE);
  res.json(invoice);
});

invoicesRouter.post('/from-job/:jobId', async (req, res) => {
  const { shop, user } = ctx(req);
  const job = await findOwned(Job, shop, req.params.jobId, 'Job');
  if (!job.lineItems.length) throw badRequest('This job has no line items to invoice');
  const invoice = await invoiceFromJob(job, user);
  await invoice.populate(POPULATE);
  res.status(201).json(invoice);
});

invoicesRouter.post('/', async (req, res) => {
  const body = invoiceBody.parse(req.body);
  const { shop, user } = ctx(req);
  if (!(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  if (body.job && !(await Job.exists({ _id: body.job, shop }))) throw notFound('Job');
  const shopDoc = await Shop.findById(shop).select('taxRate').lean();
  const invoice = await Invoice.create({
    ...body,
    taxRate: body.taxRate ?? shopDoc?.taxRate ?? 0,
    dueDate: body.dueDate ?? new Date(Date.now() + 7 * 86_400_000),
    shop,
    number: await nextNumber(shop, 'invoice'),
  });
  if (body.job) await Job.updateOne({ _id: body.job, shop }, { $set: { invoice: invoice._id } });
  await logActivity({ shop, actor: user, action: 'invoice.created', entityType: 'invoice', entityId: invoice._id, summary: `Invoice #${invoice.number} created` });
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  void dispatchWebhooks(shop, 'invoice.created', { data: invoice.toJSON() });
  res.status(201).json(invoice);
});

invoicesRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(invoiceBody).parse(req.body);
  const { shop } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.status === 'void') throw conflict('Void invoices cannot be edited');
  if (body.customer && !(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  invoice.set(defined(body));
  await invoice.save();
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  res.json(invoice);
});

invoicesRouter.post('/:id/payments', async (req, res) => {
  const body = z
    .object({
      amount: z.number().positive().max(10_000_000),
      tip: z.number().min(0).max(100_000).default(0),
      method: z.enum(PAYMENT_METHODS).default('card'),
      reference: z.string().max(200).optional(),
      giftCardCode: z.string().trim().max(40).optional(),
    })
    .parse(req.body);
  const { shop, user } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.status === 'void') throw conflict('Cannot record a payment on a void invoice');
  if (body.amount > (invoice.totals?.balance ?? 0) + 0.005) throw badRequest(`Payment exceeds the balance of $${invoice.totals?.balance?.toFixed(2)}`);
  const { giftCardCode, ...payment } = body;
  if (body.method === 'gift_card') {
    if (!giftCardCode) throw badRequest('giftCardCode is required for gift card payments');
    const code = await redeemGiftCard(shop, giftCardCode, round2(body.amount), invoice._id, `Payment on invoice #${invoice.number}`);
    await recordPayment(invoice, { ...payment, giftCard: code, reference: payment.reference ?? code }, { actor: user });
  } else {
    await recordPayment(invoice, payment, { actor: user });
  }
  await invoice.populate(POPULATE);
  res.status(201).json(invoice);
});

invoicesRouter.post('/:id/apply-coupon', async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(1).max(40) }).parse(req.body);
  const { shop, user } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (['paid', 'void'].includes(invoice.status)) throw conflict(`Coupons cannot be applied to a ${invoice.status} invoice`);
  const job = invoice.job ? await Job.findById(invoice.job).select('lineItems').lean() : null;
  const subtotal = invoice.items.reduce((s, i) => s + (i.qty ?? 1) * (i.unitPrice ?? 0), 0);
  const lines = job?.lineItems.map((l) => ({ category: l.category, amount: (l.qty ?? 1) * (l.unitPrice ?? 0) }));
  const check = await checkCoupon(shop, code, { subtotal, lines });
  if (!check.valid || !check.coupon) throw badRequest(check.reason ?? 'Invalid coupon');
  if (invoice.coupon?.code === check.coupon.code) throw conflict('That coupon is already applied');
  if (!(await consumeCoupon(check.coupon._id))) throw conflict('This coupon has reached its usage limit');
  if (invoice.coupon) await releaseCoupon(shop, invoice.coupon.code);
  invoice.set('coupon', { code: check.coupon.code, amount: check.amount });
  await invoice.save();
  await logActivity({ shop, actor: user, action: 'invoice.coupon', entityType: 'invoice', entityId: invoice._id, summary: `Coupon ${check.coupon.code} (−$${check.amount.toFixed(2)}) applied to invoice #${invoice.number}` });
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  res.json(invoice);
});

invoicesRouter.delete('/:id/coupon', async (req, res) => {
  const { shop } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.coupon) {
    if (invoice.status === 'paid') throw conflict('Coupons cannot be removed from a paid invoice');
    await releaseCoupon(shop, invoice.coupon.code);
    invoice.set('coupon', undefined);
    await invoice.save();
  }
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  res.json(invoice);
});

invoicesRouter.post('/:id/send', async (req, res) => {
  const body = z.object({ channel: z.enum(['sms', 'email']).default('email') }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.status === 'void') throw conflict('Cannot send a void invoice');
  const customer = await Customer.findById(invoice.customer);
  if (!customer) throw notFound('Customer');
  if (invoice.status === 'draft') invoice.status = 'sent';
  invoice.sentAt = new Date();
  await invoice.save();
  const job = invoice.job ? await Job.findById(invoice.job).select('portalToken').lean() : null;
  const link = portalLink(job?.portalToken ?? invoice.publicToken);
  await sendMessage({
    shop,
    customer,
    job: invoice.job,
    channel: body.channel,
    subject: `Invoice #${invoice.number}`,
    body: `Hi ${customer.firstName}, invoice #${invoice.number} for $${invoice.totals?.total?.toFixed(2)} is ready. View & pay securely: ${link}`,
    by: user,
  });
  await logActivity({ shop, actor: user, action: 'invoice.sent', entityType: 'invoice', entityId: invoice._id, summary: `Invoice #${invoice.number} sent to ${customer.firstName}` });
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  res.json(invoice);
});

invoicesRouter.post('/:id/void', requireRole('manager'), async (req, res) => {
  const { shop, user } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.totals?.paid) throw conflict('Invoices with payments cannot be voided — refund first');
  invoice.status = 'void';
  await invoice.save();
  if (invoice.job) await Job.updateOne({ _id: invoice.job, shop }, { $unset: { invoice: 1 } });
  await logActivity({ shop, actor: user, action: 'invoice.voided', entityType: 'invoice', entityId: invoice._id, summary: `Invoice #${invoice.number} voided` });
  await invoice.populate(POPULATE);
  emitToShop(shop, 'invoice:updated', invoice.toJSON());
  res.json(invoice);
});

invoicesRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const invoice = await findOwned(Invoice, shop, req.params.id, 'Invoice');
  if (invoice.totals?.paid) throw conflict('Invoices with payments cannot be deleted');
  await invoice.deleteOne();
  if (invoice.job) await Job.updateOne({ _id: invoice.job, shop }, { $unset: { invoice: 1 } });
  res.json({ ok: true });
});
