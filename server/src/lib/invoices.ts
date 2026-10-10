import type { Types } from 'mongoose';
import { Invoice, type InvoiceDoc } from '../models/Invoice.js';
import { Job, type JobDoc } from '../models/Job.js';
import { Customer } from '../models/Customer.js';
import { Shop } from '../models/Shop.js';
import { PAYMENT_METHODS } from '../models/common.js';
import { nextNumber } from './counters.js';
import { round2 } from './money.js';
import { emitToShop } from './realtime.js';
import { logActivity, notify } from './activity.js';
import { fire } from './automations.js';
import { broadcastJob } from './jobs.js';
import { dispatchWebhooks } from './webhooks.js';

type Id = Types.ObjectId | string;

export async function invoiceFromJob(job: JobDoc, actor?: Id | null): Promise<InvoiceDoc> {
  if (job.invoice) {
    const existing = await Invoice.findOne({ _id: job.invoice, shop: job.shop });
    if (existing && existing.status !== 'void') return existing;
  }
  const items = job.lineItems
    .filter((i) => !i.optional || i.selected)
    .map((i) => ({ name: i.name, description: i.description, qty: i.qty, unitPrice: i.unitPrice }));
  const discount = round2(job.lineItems.reduce((s, i) => s + (i.discount ?? 0), 0));
  const invoice = await Invoice.create({
    shop: job.shop,
    number: await nextNumber(job.shop, 'invoice'),
    customer: job.customer,
    job: job._id,
    items,
    discount,
    taxRate: job.taxRate ?? 0,
    dueDate: new Date(Date.now() + 7 * 86_400_000),
  });
  job.invoice = invoice._id;
  job.timeline.push({ type: 'system', message: `Invoice #${invoice.number} created`, by: actor ?? undefined, at: new Date() });
  await job.save();
  await broadcastJob(job.shop, job._id);
  await logActivity({ shop: job.shop, actor, action: 'invoice.created', entityType: 'invoice', entityId: invoice._id, summary: `Invoice #${invoice.number} created from job #${job.number}` });
  emitToShop(job.shop, 'invoice:updated', invoice.toJSON());
  void dispatchWebhooks(job.shop, 'invoice.created', { data: invoice.toJSON() });
  return invoice;
}

export async function recordPayment(
  invoice: InvoiceDoc,
  payment: { amount: number; tip?: number; method: (typeof PAYMENT_METHODS)[number]; reference?: string; giftCard?: string },
  opts: { actor?: Id | null; viaPortal?: boolean } = {},
): Promise<InvoiceDoc> {
  const wasPaid = invoice.status === 'paid';
  const amount = round2(payment.amount);
  const tip = round2(payment.tip ?? 0);
  invoice.payments.push({ amount, tip, method: payment.method, reference: payment.reference ?? '', giftCard: payment.giftCard, by: opts.actor ?? undefined, at: new Date() });
  await invoice.save();
  const nowPaid = invoice.status === 'paid';

  // Customer value & loyalty
  const shop = await Shop.findById(invoice.shop).select('loyalty name').lean();
  const points = shop?.loyalty?.enabled ? Math.floor(amount * (shop.loyalty.pointsPerDollar ?? 1)) : 0;
  await Customer.updateOne(
    { _id: invoice.customer },
    {
      $inc: { lifetimeValue: amount, loyaltyPoints: points, ...(nowPaid && !wasPaid ? { visits: 1 } : {}) },
      ...(nowPaid && !wasPaid ? { $set: { lastVisitAt: new Date() } } : {}),
    },
  );

  if (invoice.job) {
    await Job.updateOne(
      { _id: invoice.job },
      { $push: { timeline: { type: 'payment', message: `Payment of $${amount.toFixed(2)}${tip ? ` (+$${tip.toFixed(2)} tip)` : ''} received via ${payment.method}${opts.viaPortal ? ' (customer portal)' : ''}`, by: opts.actor ?? undefined } } },
    );
    await broadcastJob(invoice.shop, invoice.job);
  }

  await logActivity({ shop: invoice.shop, actor: opts.actor, action: 'invoice.payment', entityType: 'invoice', entityId: invoice._id, summary: `$${amount.toFixed(2)} received on invoice #${invoice.number}` });
  await notify({
    shop: invoice.shop,
    title: nowPaid ? `Invoice #${invoice.number} paid in full` : `Payment received on #${invoice.number}`,
    body: `$${amount.toFixed(2)}${tip ? ` + $${tip.toFixed(2)} tip` : ''} via ${payment.method.replace('_', ' ')}`,
    link: `/app/invoices/${invoice._id}`,
    kind: 'payment',
  });
  emitToShop(invoice.shop, 'invoice:updated', invoice.toJSON());
  if (nowPaid && !wasPaid) fire(invoice.shop, 'invoice.paid', { invoiceId: invoice._id, customerId: invoice.customer, jobId: invoice.job ?? undefined });
  return invoice;
}
