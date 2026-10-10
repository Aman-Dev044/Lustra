import type { Types } from 'mongoose';
import { Job } from '../models/Job.js';
import type { QuoteDoc } from '../models/Quote.js';
import { createJob, broadcastJob } from './jobs.js';
import { logActivity, notify } from './activity.js';
import { fire } from './automations.js';
import { emitToShop } from './realtime.js';

type Id = Types.ObjectId | string;

function quoteLineItems(quote: QuoteDoc) {
  return quote.items
    .filter((i) => !i.optional || i.selected)
    .map((i) => ({
      service: i.service,
      name: i.name,
      description: i.description,
      category: i.category,
      qty: i.qty,
      unitPrice: i.unitPrice,
      discount: i.discount,
      durationMinutes: i.durationMinutes,
    }));
}

/** Create (or refresh) the job for a quote. Returns the job id. */
export async function quoteToJob(quote: QuoteDoc, opts: { actor?: Id | null; scheduledStart?: Date } = {}) {
  const lineItems = quoteLineItems(quote);
  if (quote.job) {
    const job = await Job.findOne({ _id: quote.job, shop: quote.shop });
    if (job) {
      job.set('lineItems', lineItems);
      if (opts.scheduledStart) {
        job.scheduledStart = opts.scheduledStart;
        const minutes = lineItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0) || 120;
        job.scheduledEnd = new Date(opts.scheduledStart.getTime() + minutes * 60_000);
        if (['lead', 'quoted'].includes(job.stage)) job.stage = 'scheduled';
      }
      job.timeline.push({ type: 'quote', message: `Line items synced from quote #${quote.number}`, by: opts.actor ?? undefined, at: new Date() });
      await job.save();
      await broadcastJob(quote.shop, job._id);
      return job._id;
    }
  }

  const minutes = lineItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0) || 120;
  const job = await createJob(
    quote.shop,
    {
      customer: quote.customer,
      vehicle: quote.vehicle ?? undefined,
      title: quote.title || undefined,
      lineItems,
      quote: quote._id,
      stage: opts.scheduledStart ? 'scheduled' : 'lead',
      scheduledStart: opts.scheduledStart,
      scheduledEnd: opts.scheduledStart ? new Date(opts.scheduledStart.getTime() + minutes * 60_000) : undefined,
      notes: quote.notes,
      tags: quote.status === 'approved' ? ['quote-approved'] : [],
    },
    { actor: opts.actor, source: 'quote', message: `Created from quote #${quote.number}` },
  );
  quote.job = job._id;
  await quote.save();
  return job._id;
}

/** Customer approval (portal) — selects optional items, converts to a job and notifies the team. */
export async function approveQuote(quote: QuoteDoc, signatureName: string, selectedItemIds?: string[]) {
  if (selectedItemIds) {
    const chosen = new Set(selectedItemIds);
    for (const item of quote.items) if (item.optional) item.selected = chosen.has(String(item._id));
  }
  quote.status = 'approved';
  quote.approvedAt = new Date();
  quote.signatureName = signatureName;
  await quote.save();

  const jobId = await quoteToJob(quote);
  await Job.updateOne(
    { _id: jobId },
    { $push: { timeline: { type: 'quote', message: `Quote #${quote.number} approved by ${signatureName}` } }, $addToSet: { tags: 'quote-approved' } },
  );
  await broadcastJob(quote.shop, jobId);
  await logActivity({ shop: quote.shop, action: 'quote.approved', entityType: 'quote', entityId: quote._id, summary: `Quote #${quote.number} approved by ${signatureName}` });
  await notify({
    shop: quote.shop,
    title: `Quote #${quote.number} approved`,
    body: `${signatureName} approved $${quote.totals?.total?.toFixed(2) ?? '0.00'}`,
    link: `/app/jobs/${jobId}`,
    kind: 'success',
  });
  emitToShop(quote.shop, 'quote:updated', quote.toJSON());
  fire(quote.shop, 'quote.approved', { quoteId: quote._id, jobId, customerId: quote.customer });
  return jobId;
}
