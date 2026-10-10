import { Router } from 'express';
import { z } from 'zod';
import { Automation } from '../models/misc.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { Quote } from '../models/Quote.js';
import { Customer } from '../models/Customer.js';
import { Inspection } from '../models/Inspection.js';
import { ACTION_TYPES, TRIGGERS, type Trigger } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { patchSchema } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { testAutomation, type AutomationPayload } from '../lib/automations.js';
import { AUTOMATION_TEMPLATES } from '../seed/defaults.js';
import type { Types } from 'mongoose';

export const automationsRouter = Router();
automationsRouter.use(requireFeature('automations'));

const automationBody = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(500).default(''),
  enabled: z.boolean().default(true),
  trigger: z.enum(TRIGGERS),
  conditions: z
    .array(z.object({ field: z.string().trim().min(1).max(80), op: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']).default('eq'), value: z.union([z.string(), z.number(), z.boolean()]) }))
    .max(10)
    .default([]),
  actions: z
    .array(z.object({ type: z.enum(ACTION_TYPES), config: z.record(z.string(), z.unknown()).default({}) }))
    .min(1)
    .max(20),
  templateKey: z.string().max(60).optional(),
});

automationsRouter.get('/templates', (_req, res) => {
  res.json(AUTOMATION_TEMPLATES);
});

automationsRouter.get('/', async (req, res) => {
  const items = await Automation.find({ shop: ctx(req).shop }).sort({ createdAt: 1 });
  res.json({ items, total: items.length, page: 1, pageSize: items.length });
});

automationsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Automation, ctx(req).shop, req.params.id, 'Automation'));
});

automationsRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = automationBody.parse(req.body);
  res.status(201).json(await Automation.create({ ...body, shop: ctx(req).shop }));
});

automationsRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(automationBody).parse(req.body);
  const automation = await findOwned(Automation, ctx(req).shop, req.params.id, 'Automation');
  automation.set(body);
  await automation.save();
  res.json(automation);
});

automationsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const automation = await findOwned(Automation, ctx(req).shop, req.params.id, 'Automation');
  await automation.deleteOne();
  res.json({ ok: true });
});

/** Build a realistic payload for a test run from the shop's most recent matching records. */
async function samplePayload(shop: Types.ObjectId, trigger: Trigger): Promise<AutomationPayload> {
  if (trigger.startsWith('invoice.')) {
    const invoice = await Invoice.findOne({ shop }).sort({ createdAt: -1 }).lean();
    return invoice ? { invoiceId: invoice._id, customerId: invoice.customer, jobId: invoice.job ?? undefined } : {};
  }
  if (trigger.startsWith('quote.')) {
    const quote = await Quote.findOne({ shop }).sort({ createdAt: -1 }).lean();
    return quote ? { quoteId: quote._id, customerId: quote.customer, jobId: quote.job ?? undefined } : {};
  }
  if (trigger === 'customer.created') {
    const customer = await Customer.findOne({ shop }).sort({ createdAt: -1 }).lean();
    return customer ? { customerId: customer._id } : {};
  }
  if (trigger === 'inspection.signed') {
    const inspection = await Inspection.findOne({ shop }).sort({ createdAt: -1 }).lean();
    return inspection ? { inspectionId: inspection._id, customerId: inspection.customer, jobId: inspection.job ?? undefined } : {};
  }
  const job = await Job.findOne({ shop }).sort({ updatedAt: -1 }).lean();
  return job ? { jobId: job._id, customerId: job.customer, stage: job.stage } : {};
}

automationsRouter.post('/:id/test', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const automation = await findOwned(Automation, shop, req.params.id, 'Automation');
  const payload = await samplePayload(shop, automation.trigger as Trigger);
  if (!Object.keys(payload).length) return res.json({ ok: false, log: ['No sample records found for this trigger yet'] });
  // Test runs ignore conditions on stage-specific triggers by supplying the condition value when possible.
  const stageCondition = automation.conditions?.find((c) => c.field === 'stage');
  if (stageCondition) payload.stage = String(stageCondition.value);
  const log = await testAutomation(automation.toObject() as never, payload);
  res.json({ ok: true, log });
});
