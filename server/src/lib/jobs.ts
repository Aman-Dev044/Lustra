import type { Types } from 'mongoose';
import { Job, type JobDoc } from '../models/Job.js';
import { Shop } from '../models/Shop.js';
import type { JobStage } from '../models/common.js';
import { nextNumber } from './counters.js';
import { emitToShop } from './realtime.js';
import { logActivity } from './activity.js';
import { fire } from './automations.js';
import { dispatchWebhooks } from './webhooks.js';
import { CUSTOMER_FIELDS, USER_FIELDS, VEHICLE_FIELDS } from './http.js';

type Id = Types.ObjectId | string;

export const STAGE_LABELS: Record<JobStage, string> = {
  lead: 'Lead',
  quoted: 'Quoted',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  quality_check: 'Quality check',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const DEFAULT_CHECKLIST = [
  'Walk-around inspection with customer',
  'Pre-work photos captured',
  'Work completed to spec',
  'Final quality check under lights',
  'After photos uploaded',
];

export const JOB_POPULATE = [
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'vehicle', select: VEHICLE_FIELDS },
  { path: 'assignees', select: USER_FIELDS },
  { path: 'lineItems.assignee', select: USER_FIELDS },
];

export async function loadJobForClient(shop: Id, id: Id) {
  return Job.findOne({ _id: id, shop }).populate(JOB_POPULATE);
}

/** Emit the populated version of a job to everyone in the shop. */
export async function broadcastJob(shop: Id, id: Id, event: 'job:created' | 'job:updated' | 'booking:created' = 'job:updated') {
  const job = await loadJobForClient(shop, id);
  if (job) {
    emitToShop(shop, event, job.toJSON());
    if (event === 'job:updated') void dispatchWebhooks(shop, 'job.updated', { data: job.toJSON() });
  }
  return job;
}

export async function createJob(
  shop: Id,
  data: Record<string, unknown> & { customer: Id },
  opts: { actor?: Id | null; source?: string; message?: string; silent?: boolean } = {},
): Promise<JobDoc> {
  const shopDoc = await Shop.findById(shop).select('taxRate').lean();
  const number = await nextNumber(shop, 'job');
  const job = new Job({
    checklist: DEFAULT_CHECKLIST.map((label) => ({ label, done: false })),
    taxRate: shopDoc?.taxRate ?? 0,
    source: opts.source ?? 'manual',
    ...data,
    shop,
    number,
    timeline: [{ type: 'created', message: opts.message ?? 'Job created', by: opts.actor ?? undefined }],
  });
  if (!job.title) job.title = job.lineItems.map((i) => i.name).slice(0, 2).join(' + ') || 'New job';
  await job.save();

  if (!opts.silent) {
    await logActivity({ shop, actor: opts.actor, action: 'job.created', entityType: 'job', entityId: job._id, summary: `Job #${number} created` });
    await broadcastJob(shop, job._id, 'job:created');
    fire(shop, 'job.created', { jobId: job._id, customerId: job.customer });
  }
  return job;
}

/** Change stage with timeline, activity, realtime and automation triggers. */
export async function changeStage(job: JobDoc, stage: JobStage, actor?: Id | null): Promise<JobDoc> {
  const previous = job.stage as JobStage;
  if (previous === stage) return job;
  job.stage = stage;
  if (stage === 'completed') job.completedAt = new Date();
  job.timeline.push({ type: 'stage', message: `${STAGE_LABELS[previous]} → ${STAGE_LABELS[stage]}`, by: actor ?? undefined, at: new Date() });
  await job.save();

  await logActivity({ shop: job.shop, actor, action: 'job.stage_changed', entityType: 'job', entityId: job._id, summary: `Job #${job.number} moved to ${STAGE_LABELS[stage]}` });
  await broadcastJob(job.shop, job._id);
  fire(job.shop, 'job.stage_changed', { jobId: job._id, stage, previousStage: previous });
  if (stage === 'completed') {
    fire(job.shop, 'job.completed', { jobId: job._id, stage, previousStage: previous });
    await generateNextOccurrence(job, actor);
  }
  return job;
}

export const FREQUENCY_DAYS = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 91 } as const;

/** Resolve intervalDays from a frequency (custom keeps the supplied interval). */
export function recurrenceInterval(frequency: string, intervalDays?: number): number {
  return frequency in FREQUENCY_DAYS ? FREQUENCY_DAYS[frequency as keyof typeof FREQUENCY_DAYS] : Math.max(1, intervalDays ?? 30);
}

/**
 * When a recurring job is completed, schedule the next occurrence (same customer, vehicle and line items,
 * start + intervalDays) unless the series has ended. Idempotent via `recurrence.generatedNext`.
 */
export async function generateNextOccurrence(job: JobDoc, actor?: Id | null): Promise<JobDoc | null> {
  const rec = job.recurrence;
  if (!rec || rec.generatedNext) return null;
  const interval = rec.intervalDays || recurrenceInterval(rec.frequency);
  const anchor = job.scheduledStart ?? job.completedAt ?? new Date();
  const start = new Date(anchor.getTime() + interval * 86_400_000);
  if (rec.endsAt && start > rec.endsAt) return null;

  // Claim the generation atomically so double completions can't create duplicates.
  const claimed = await Job.updateOne({ _id: job._id, 'recurrence.generatedNext': { $ne: true } }, { $set: { 'recurrence.generatedNext': true } });
  if (!claimed.modifiedCount) return null;
  job.set('recurrence.generatedNext', true);

  const span = job.scheduledStart && job.scheduledEnd ? job.scheduledEnd.getTime() - job.scheduledStart.getTime() : 2 * 3_600_000;
  const next = await createJob(
    job.shop,
    {
      customer: job.customer,
      vehicle: job.vehicle ?? undefined,
      title: job.title,
      stage: 'scheduled',
      priority: job.priority,
      lineItems: job.lineItems.map((i) => ({
        service: i.service, name: i.name, description: i.description, category: i.category, qty: i.qty,
        unitPrice: i.unitPrice, discount: i.discount, durationMinutes: i.durationMinutes, assignee: i.assignee,
      })),
      scheduledStart: start,
      scheduledEnd: new Date(start.getTime() + span),
      bay: job.bay ?? undefined,
      location: job.location ?? undefined,
      assignees: job.assignees,
      notes: job.notes,
      tags: job.tags,
      mobile: job.mobile,
      serviceAddress: job.serviceAddress,
      geo: job.geo ? { lat: job.geo.lat, lng: job.geo.lng } : undefined,
      recurrence: { frequency: rec.frequency, intervalDays: interval, endsAt: rec.endsAt, parent: rec.parent ?? job._id, generatedNext: false },
    },
    { actor, source: 'recurring', message: `Recurring ${rec.frequency} visit (follows job #${job.number})` },
  );
  await Job.updateOne({ _id: job._id }, { $push: { timeline: { type: 'system', message: `Next ${rec.frequency} visit scheduled as job #${next.number}` } } });
  return next;
}
