import { Types } from 'mongoose';
import { Automation, ScheduledAction, type AutomationAttrs } from '../models/misc.js';
import { Shop } from '../models/Shop.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { Quote } from '../models/Quote.js';
import { JOB_STAGES, type JobStage, type Trigger } from '../models/common.js';
import { bookingLink, portalLink, renderTemplate, sendMessage } from './messaging.js';
import { notify } from './activity.js';
import { emitToShop } from './realtime.js';
import { dispatchWebhooks } from './webhooks.js';

type Id = Types.ObjectId | string;

export interface AutomationPayload {
  jobId?: Id;
  customerId?: Id;
  invoiceId?: Id;
  quoteId?: Id;
  inspectionId?: Id;
  stage?: string;
  previousStage?: string;
}

type AutomationLike = Pick<AutomationAttrs, 'name' | 'conditions' | 'actions'> & { _id: Types.ObjectId; shop: Types.ObjectId };

/** Load everything a template or condition might reference. */
async function buildContext(shopId: Id, payload: AutomationPayload) {
  const shop = await Shop.findById(shopId).lean();
  const job = payload.jobId ? await Job.findOne({ _id: payload.jobId, shop: shopId }).lean() : null;
  const invoice = payload.invoiceId ? await Invoice.findOne({ _id: payload.invoiceId, shop: shopId }).lean() : null;
  const quote = payload.quoteId ? await Quote.findOne({ _id: payload.quoteId, shop: shopId }).lean() : null;
  const customerId = payload.customerId ?? job?.customer ?? invoice?.customer ?? quote?.customer;
  const customer = customerId ? await Customer.findOne({ _id: customerId, shop: shopId }).lean() : null;
  const vehicleId = job?.vehicle ?? quote?.vehicle;
  const vehicle = vehicleId ? await Vehicle.findById(vehicleId).lean() : null;
  const token = job?.portalToken ?? quote?.publicToken ?? invoice?.publicToken;

  return {
    shop,
    customer,
    vehicle: vehicle ? { ...vehicle, label: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') } : null,
    job: job ? { ...job, total: job.totals?.total } : null,
    invoice: invoice ? { ...invoice, total: invoice.totals?.total, balance: invoice.totals?.balance } : null,
    quote: quote ? { ...quote, total: quote.totals?.total } : null,
    stage: payload.stage,
    previousStage: payload.previousStage,
    portalLink: token ? portalLink(token) : '',
    bookingLink: shop ? bookingLink(shop.slug) : '',
  };
}
type Context = Awaited<ReturnType<typeof buildContext>>;

function readPath(context: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, context);
}

export function evaluateConditions(
  conditions: { field: string; op?: string | null; value?: unknown }[] | undefined,
  context: Record<string, unknown>,
): boolean {
  return (conditions ?? []).every(({ field, op, value }) => {
    const actual = readPath(context, field);
    switch (op ?? 'eq') {
      case 'eq':
        return String(actual) === String(value);
      case 'neq':
        return String(actual) !== String(value);
      case 'gt':
        return Number(actual) > Number(value);
      case 'lt':
        return Number(actual) < Number(value);
      case 'contains':
        if (Array.isArray(actual)) return actual.map(String).includes(String(value));
        return String(actual ?? '').toLowerCase().includes(String(value).toLowerCase());
      default:
        return false;
    }
  });
}

function waitMs(config: Record<string, unknown>): number {
  const minutes = Number(config.minutes ?? 0) + Number(config.hours ?? 0) * 60 + Number(config.days ?? 0) * 1440;
  return Math.max(1, minutes) * 60_000;
}

/** Execute actions starting at `fromIndex`. A `wait` action schedules the remainder and stops. */
async function executeActions(
  automation: AutomationLike,
  context: Context,
  payload: AutomationPayload,
  fromIndex: number,
  log: string[],
  opts: { skipWaits?: boolean } = {},
) {
  const shopId = automation.shop;
  const actions = automation.actions ?? [];
  for (let i = fromIndex; i < actions.length; i++) {
    const action = actions[i];
    const config = (action.config ?? {}) as Record<string, unknown>;
    const render = (t: unknown) => renderTemplate(String(t ?? ''), context as unknown as Record<string, unknown>);

    switch (action.type) {
      case 'wait': {
        if (opts.skipWaits) {
          log.push(`Test run: skipping wait of ${Math.round(waitMs(config) / 60_000)} min`);
          break;
        }
        const runAt = new Date(Date.now() + waitMs(config));
        await ScheduledAction.create({ shop: shopId, automation: automation._id, actionIndex: i + 1, payload, runAt });
        log.push(`Waiting until ${runAt.toISOString()} before continuing`);
        return;
      }
      case 'send_sms':
      case 'send_email': {
        if (!context.customer) {
          log.push(`Skipped ${action.type}: no customer in context`);
          break;
        }
        if (context.customer.marketingOptIn === false && config.marketing === true) {
          log.push(`Skipped ${action.type}: customer opted out of marketing`);
          break;
        }
        const channel = action.type === 'send_sms' ? 'sms' : 'email';
        const body = render(config.template);
        await sendMessage({
          shop: shopId,
          customer: context.customer,
          job: context.job?._id,
          channel,
          subject: channel === 'email' ? render(config.subject ?? `Update from {{shop.name}}`) : undefined,
          body,
          automation: automation._id,
        });
        log.push(`Sent ${channel} to ${context.customer.firstName}: "${body.slice(0, 80)}"`);
        break;
      }
      case 'notify_team': {
        const title = render(config.title ?? automation.name);
        await notify({
          shop: shopId,
          title,
          body: render(config.body ?? ''),
          link: context.job ? `/app/jobs/${context.job._id}` : '',
          kind: 'info',
        });
        log.push(`Notified team: ${title}`);
        break;
      }
      case 'add_tag': {
        const tag = String(config.tag ?? '').trim();
        if (context.customer && tag) {
          await Customer.updateOne({ _id: context.customer._id }, { $addToSet: { tags: tag } });
          log.push(`Tagged customer with "${tag}"`);
        }
        break;
      }
      case 'update_stage': {
        const stage = String(config.stage ?? '') as JobStage;
        if (context.job && (JOB_STAGES as readonly string[]).includes(stage) && context.job.stage !== stage) {
          // Applied directly (without re-firing triggers) so automations cannot loop.
          const job = await Job.findOneAndUpdate(
            { _id: context.job._id, shop: shopId },
            {
              $set: { stage, ...(stage === 'completed' ? { completedAt: new Date() } : {}) },
              $push: { timeline: { type: 'stage', message: `Stage set to ${stage} by automation "${automation.name}"` } },
            },
            { returnDocument: 'after' },
          );
          if (job) emitToShop(shopId, 'job:updated', job.toJSON());
          log.push(`Moved job #${context.job.number} to ${stage}`);
        }
        break;
      }
    }
  }
}

async function runOne(automation: AutomationLike, payload: AutomationPayload, opts: { skipWaits?: boolean } = {}): Promise<string[]> {
  const log: string[] = [];
  const context = await buildContext(automation.shop, payload);
  if (!evaluateConditions(automation.conditions, context as unknown as Record<string, unknown>)) {
    log.push('Conditions not met — skipped');
    return log;
  }
  await executeActions(automation, context, payload, 0, log, opts);
  await Automation.updateOne({ _id: automation._id }, { $inc: { runs: 1 }, $set: { lastRunAt: new Date() } });
  return log;
}

/** Fire a trigger for a shop. Never throws: automation failures must not break the request that caused them. */
export async function runAutomations(shopId: Id, trigger: Trigger, payload: AutomationPayload): Promise<void> {
  try {
    const automations = await Automation.find({ shop: shopId, trigger, enabled: true }).lean();
    for (const automation of automations) {
      await runOne(automation as unknown as AutomationLike, payload).catch((err) =>
        console.error(`automation ${automation.name} failed`, err),
      );
    }
  } catch (err) {
    console.error('runAutomations failed', err);
  }
}

/** Fire-and-forget helper for routes. */
export function fire(shopId: Id, trigger: Trigger, payload: AutomationPayload): void {
  void runAutomations(shopId, trigger, payload);
  void dispatchWebhooks(shopId, trigger, { payload });
}

/** Dry-run used by POST /automations/:id/test — runs actions against the most recent matching record. */
export async function testAutomation(automation: AutomationLike, payload: AutomationPayload): Promise<string[]> {
  return runOne(automation, payload, { skipWaits: true });
}

/** Process due `wait` continuations. */
export async function processScheduledActions(): Promise<number> {
  const due = await ScheduledAction.find({ status: 'pending', runAt: { $lte: new Date() } }).limit(50);
  for (const item of due) {
    item.status = 'done';
    await item.save();
    try {
      const automation = await Automation.findById(item.automation).lean();
      if (!automation || !automation.enabled) continue;
      const payload = (item.payload ?? {}) as AutomationPayload;
      const context = await buildContext(automation.shop, payload);
      await executeActions(automation as unknown as AutomationLike, context, payload, item.actionIndex, []);
    } catch (err) {
      item.status = 'failed';
      await item.save();
      console.error('scheduled action failed', err);
    }
  }
  return due.length;
}

let timer: NodeJS.Timeout | null = null;
export function startScheduler(intervalMs = 30_000): void {
  if (timer) return;
  timer = setInterval(() => void processScheduledActions().catch((e) => console.error(e)), intervalMs);
  timer.unref();
}
export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Find overdue invoices once in a while and fire invoice.overdue (marks them overdue first). */
export async function sweepOverdueInvoices(): Promise<void> {
  const overdue = await Invoice.find({
    status: { $in: ['sent', 'partial'] },
    dueDate: { $lt: new Date() },
    'totals.balance': { $gt: 0 },
  }).limit(100);
  for (const invoice of overdue) {
    invoice.status = 'overdue';
    await invoice.save();
    fire(invoice.shop, 'invoice.overdue', { invoiceId: invoice._id, customerId: invoice.customer });
  }
}
