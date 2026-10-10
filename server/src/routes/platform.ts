import { Router } from 'express';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { ApiKey, Integration, PROVIDERS, Webhook, type Provider } from '../models/growth.js';
import { Shop } from '../models/Shop.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { InventoryItem } from '../models/misc.js';
import { CUSTOMER_SOURCES } from '../models/common.js';
import { API_KEY_PREFIX, ctx, hashApiKey, requireRole } from '../lib/auth.js';
import { hasFeature, planRequiredError, requireFeature, type Feature } from '../lib/plans.js';
import { emailField, patchSchema } from '../lib/validate.js';
import { defined, findOwned } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { WEBHOOK_EVENTS, deliver, newWebhookSecret } from '../lib/webhooks.js';
import { logActivity } from '../lib/activity.js';
import { toCsv } from '../lib/csv.js';

export const integrationsRouter = Router();
export const apiKeysRouter = Router();
export const webhooksRouter = Router();
export const exportRouter = Router();
export const importRouter = Router();

/* ---------------- Integrations ---------------- */

const CATALOG: Record<Provider, { name: string; description: string; category: string; feature?: Feature }> = {
  quickbooks: { name: 'QuickBooks Online', description: 'Sync invoices, payments and customers to your books automatically.', category: 'Accounting', feature: 'quickbooks' },
  stripe: { name: 'Stripe', description: 'Accept cards, Apple Pay, Google Pay and payouts with card readers.', category: 'Payments' },
  square: { name: 'Square', description: 'Take payments with Square terminals and sync transactions.', category: 'Payments' },
  zapier: { name: 'Zapier', description: 'Connect Lustra to 6,000+ apps with no-code automations.', category: 'Automation', feature: 'api_access' },
  google: { name: 'Google Business Profile', description: 'Pull in Google reviews and send review requests to your profile.', category: 'Reputation' },
  twilio: { name: 'Twilio SMS', description: 'Send texts from your own local business number.', category: 'Messaging' },
  carfax: { name: 'CARFAX', description: 'Report completed services to vehicle history reports.', category: 'Vehicle data' },
  mailchimp: { name: 'Mailchimp', description: 'Sync customers and segments to email audiences.', category: 'Marketing' },
};

const PLAN_OF: Partial<Record<Feature, 'pro' | 'enterprise'>> = { quickbooks: 'pro', api_access: 'enterprise' };

function assertProvider(value: string): Provider {
  if (!(PROVIDERS as readonly string[]).includes(value)) throw notFound('Integration');
  return value as Provider;
}

integrationsRouter.get('/', async (req, res) => {
  const { shop } = ctx(req);
  const rows = await Integration.find({ shop }).lean();
  res.json(
    PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      const meta = CATALOG[provider];
      return {
        provider,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        status: row?.status ?? 'disconnected',
        connectedAt: row?.connectedAt ?? null,
        account: row?.account ?? '',
        lastSyncAt: row?.lastSyncAt ?? null,
        ...(meta.feature ? { requiredPlan: PLAN_OF[meta.feature] } : {}),
        log: (row?.log ?? []).slice(-5).reverse(),
      };
    }),
  );
});

integrationsRouter.post('/:provider/connect', requireRole('admin'), async (req, res) => {
  const provider = assertProvider(String(req.params.provider));
  const { account } = z.object({ account: z.string().trim().max(160).optional() }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const feature = CATALOG[provider].feature;
  if (feature) {
    const shopDoc = await Shop.findById(shop).select('plan addOns').lean();
    if (!shopDoc || !hasFeature(shopDoc, feature)) throw planRequiredError(feature);
  }
  const shopDoc = await Shop.findById(shop).select('email name').lean();
  const integration = await Integration.findOneAndUpdate(
    { shop, provider },
    {
      $set: { status: 'connected', connectedAt: new Date(), account: account || shopDoc?.email || shopDoc?.name || 'Connected account' },
      $push: { log: { $each: [{ at: new Date(), message: 'Connected' }], $slice: -50 } },
    },
    { upsert: true, returnDocument: 'after' },
  );
  await logActivity({ shop, actor: user, action: 'integration.connected', entityType: 'integration', entityId: integration._id, summary: `${CATALOG[provider].name} connected` });
  res.json(integration);
});

integrationsRouter.post('/:provider/disconnect', requireRole('admin'), async (req, res) => {
  const provider = assertProvider(String(req.params.provider));
  const { shop, user } = ctx(req);
  const integration = await Integration.findOneAndUpdate(
    { shop, provider },
    { $set: { status: 'disconnected' }, $push: { log: { $each: [{ at: new Date(), message: 'Disconnected' }], $slice: -50 } } },
    { upsert: true, returnDocument: 'after' },
  );
  await logActivity({ shop, actor: user, action: 'integration.disconnected', entityType: 'integration', entityId: integration._id, summary: `${CATALOG[provider].name} disconnected` });
  res.json(integration);
});

/** Simulated sync: counts the records that would be pushed since the last sync. */
integrationsRouter.post('/:provider/sync', requireRole('manager'), async (req, res) => {
  const provider = assertProvider(String(req.params.provider));
  const { shop } = ctx(req);
  const integration = await Integration.findOne({ shop, provider });
  if (!integration || integration.status !== 'connected') throw badRequest(`${CATALOG[provider].name} is not connected`);
  const since = integration.lastSyncAt ?? new Date(0);
  const log: string[] = [];
  let synced = 0;
  if (provider === 'quickbooks') {
    const [invoices, customers] = await Promise.all([Invoice.countDocuments({ shop, updatedAt: { $gt: since } }), Customer.countDocuments({ shop, updatedAt: { $gt: since } })]);
    synced = invoices + customers;
    log.push(`Pushed ${invoices} invoices and ${customers} customers to QuickBooks`);
  } else if (provider === 'stripe' || provider === 'square') {
    const [row] = await Invoice.aggregate([{ $match: { shop } }, { $unwind: '$payments' }, { $match: { 'payments.at': { $gt: since }, 'payments.method': 'card' } }, { $count: 'n' }]);
    synced = row?.n ?? 0;
    log.push(`Reconciled ${synced} card payments`);
  } else if (provider === 'mailchimp') {
    synced = await Customer.countDocuments({ shop, marketingOptIn: true, email: { $ne: '' } });
    log.push(`Synced ${synced} opted-in contacts to your audience`);
  } else if (provider === 'carfax') {
    synced = await Job.countDocuments({ shop, stage: 'completed', completedAt: { $gt: since } });
    log.push(`Reported ${synced} completed services`);
  } else {
    log.push('Connection verified');
  }
  integration.lastSyncAt = new Date();
  integration.log.push(...log.map((message) => ({ at: new Date(), message })));
  if (integration.log.length > 50) integration.log.splice(0, integration.log.length - 50);
  await integration.save();
  res.json({ ok: true, synced, log });
});

/* ---------------- API keys ---------------- */

apiKeysRouter.use(requireFeature('api_access'), requireRole('admin'));
const randomKey = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 40);

apiKeysRouter.get('/', async (req, res) => {
  const keys = await ApiKey.find({ shop: ctx(req).shop }).sort({ createdAt: -1 }).populate('createdBy', 'name');
  res.json(keys);
});

apiKeysRouter.post('/', async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(req.body);
  const { shop, user } = ctx(req);
  const apiKey = `${API_KEY_PREFIX}${randomKey()}`;
  const key = await ApiKey.create({ shop, name, prefix: apiKey.slice(0, API_KEY_PREFIX.length + 4), hash: hashApiKey(apiKey), createdBy: user });
  await logActivity({ shop, actor: user, action: 'apikey.created', entityType: 'apikey', entityId: key._id, summary: `API key "${name}" created` });
  res.status(201).json({ apiKey, key: key.toJSON() });
});

apiKeysRouter.delete('/:id', async (req, res) => {
  const { shop, user } = ctx(req);
  const key = await findOwned(ApiKey, shop, req.params.id, 'API key');
  if (!key.revokedAt) {
    key.revokedAt = new Date();
    await key.save();
    await logActivity({ shop, actor: user, action: 'apikey.revoked', entityType: 'apikey', entityId: key._id, summary: `API key "${key.name}" revoked` });
  }
  res.json(key);
});

/* ---------------- Webhooks ---------------- */

webhooksRouter.use(requireFeature('api_access'), requireRole('admin'));

const webhookBody = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => {
      try {
        return ['http:', 'https:'].includes(new URL(u).protocol);
      } catch {
        return false;
      }
    }, 'Enter a valid http(s) URL'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  active: z.boolean().default(true),
});

webhooksRouter.get('/', async (req, res) => {
  res.json(await Webhook.find({ shop: ctx(req).shop }).sort({ createdAt: -1 }));
});

webhooksRouter.get('/events', (_req, res) => {
  res.json(WEBHOOK_EVENTS);
});

webhooksRouter.post('/', async (req, res) => {
  const body = webhookBody.parse(req.body);
  res.status(201).json(await Webhook.create({ ...body, shop: ctx(req).shop, secret: newWebhookSecret() }));
});

webhooksRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(webhookBody).extend({ rotateSecret: z.boolean().optional() }).parse(req.body);
  const hook = await findOwned(Webhook, ctx(req).shop, req.params.id, 'Webhook');
  const { rotateSecret, ...rest } = body;
  hook.set(defined(rest));
  if (rotateSecret) hook.secret = newWebhookSecret();
  await hook.save();
  res.json(hook);
});

webhooksRouter.delete('/:id', async (req, res) => {
  const hook = await findOwned(Webhook, ctx(req).shop, req.params.id, 'Webhook');
  await hook.deleteOne();
  res.json({ ok: true });
});

webhooksRouter.post('/:id/test', async (req, res) => {
  const { shop } = ctx(req);
  const hook = await findOwned(Webhook, shop, req.params.id, 'Webhook');
  const shopDoc = await Shop.findById(shop).select('name slug').lean();
  const result = await deliver(hook, 'webhook.test', { message: 'This is a test delivery from Lustra', shop: shopDoc });
  res.json(result);
});

/* ---------------- CSV export ---------------- */

const fmtDate = (d?: Date | null) => (d ? new Date(d).toISOString() : '');
const name = (c: unknown) => {
  const x = c as { firstName?: string; lastName?: string } | null;
  return x ? `${x.firstName ?? ''} ${x.lastName ?? ''}`.trim() : '';
};

exportRouter.get('/:entity', requireRole('manager'), async (req, res) => {
  const entity = z.enum(['customers', 'vehicles', 'jobs', 'invoices', 'inventory', 'payments']).parse(req.params.entity);
  const { shop } = ctx(req);
  const LIMIT = 20_000;
  let headers: string[] = [];
  let rows: unknown[][] = [];

  if (entity === 'customers') {
    headers = ['First name', 'Last name', 'Email', 'Phone', 'Address', 'Company', 'Tags', 'Source', 'Lifetime value', 'Visits', 'Loyalty points', 'Last visit', 'Marketing opt-in', 'Created'];
    const list = await Customer.find({ shop }).sort({ createdAt: 1 }).limit(LIMIT).lean();
    rows = list.map((c) => [c.firstName, c.lastName, c.email, c.phone, c.address, c.company, (c.tags ?? []).join('; '), c.source, c.lifetimeValue, c.visits, c.loyaltyPoints, fmtDate(c.lastVisitAt), c.marketingOptIn ? 'yes' : 'no', fmtDate(c.createdAt)]);
  } else if (entity === 'vehicles') {
    headers = ['Customer', 'Year', 'Make', 'Model', 'Trim', 'Color', 'Type', 'Size', 'VIN', 'Plate'];
    const list = await Vehicle.find({ shop }).limit(LIMIT).populate('customer', 'firstName lastName').lean();
    rows = list.map((v) => [name(v.customer), v.year, v.make, v.model, v.trim, v.color, v.type, v.size, v.vin, v.plate]);
  } else if (entity === 'jobs') {
    headers = ['Number', 'Title', 'Stage', 'Customer', 'Vehicle', 'Scheduled start', 'Scheduled end', 'Completed', 'Subtotal', 'Discount', 'Tax', 'Total', 'Mobile', 'Service address', 'Tags'];
    const list = await Job.find({ shop }).sort({ number: 1 }).limit(LIMIT).populate('customer', 'firstName lastName').populate('vehicle', 'year make model').lean();
    rows = list.map((j) => {
      const v = j.vehicle as unknown as { year?: number; make?: string; model?: string } | null;
      return [j.number, j.title, j.stage, name(j.customer), v ? [v.year, v.make, v.model].filter(Boolean).join(' ') : '', fmtDate(j.scheduledStart), fmtDate(j.scheduledEnd), fmtDate(j.completedAt), j.totals?.subtotal, j.totals?.discount, j.totals?.tax, j.totals?.total, j.mobile ? 'yes' : 'no', j.serviceAddress, (j.tags ?? []).join('; ')];
    });
  } else if (entity === 'invoices') {
    headers = ['Number', 'Customer', 'Status', 'Created', 'Due', 'Subtotal', 'Discount', 'Coupon', 'Tax', 'Total', 'Tips', 'Paid', 'Balance'];
    const list = await Invoice.find({ shop }).sort({ number: 1 }).limit(LIMIT).populate('customer', 'firstName lastName').lean();
    rows = list.map((i) => [i.number, name(i.customer), i.status, fmtDate(i.createdAt), fmtDate(i.dueDate), i.totals?.subtotal, i.totals?.discount, i.coupon?.code ?? '', i.totals?.tax, i.totals?.total, i.totals?.tips, i.totals?.paid, i.totals?.balance]);
  } else if (entity === 'inventory') {
    headers = ['Name', 'SKU', 'Category', 'Unit', 'Quantity', 'Reorder level', 'Cost', 'Stock value', 'Supplier', 'Location'];
    const list = await InventoryItem.find({ shop }).sort({ category: 1, name: 1 }).limit(LIMIT).lean();
    rows = list.map((i) => [i.name, i.sku, i.category, i.unit, i.quantity, i.reorderLevel, i.cost, Math.round(i.quantity * i.cost * 100) / 100, i.supplier, i.location]);
  } else {
    headers = ['Date', 'Invoice', 'Customer', 'Method', 'Amount', 'Tip', 'Reference', 'Gift card'];
    const list = await Invoice.aggregate([
      { $match: { shop } },
      { $unwind: '$payments' },
      { $sort: { 'payments.at': 1 } },
      { $limit: LIMIT },
      { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'c', pipeline: [{ $project: { firstName: 1, lastName: 1 } }] } },
    ]);
    rows = list.map((r) => [fmtDate(r.payments.at), r.number, name(r.c?.[0]), r.payments.method, r.payments.amount, r.payments.tip ?? 0, r.payments.reference ?? '', r.payments.giftCard ?? '']);
  }

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="lustra-${entity}-${date}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(toCsv(headers, rows));
});

/* ---------------- Import ---------------- */

const importRow = z.object({
  firstName: z.string().trim().min(1, 'firstName is required').max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.union([emailField, z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  source: z.enum(CUSTOMER_SOURCES).optional().catch(undefined),
  notes: z.string().max(5000).optional(),
  address: z.string().max(300).optional(),
  company: z.string().max(120).optional(),
});

const normalizePhone = (p?: string) => (p ?? '').replace(/[^\d+]/g, '');

importRouter.post('/customers', requireRole('manager'), async (req, res) => {
  const { rows } = z.object({ rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000) }).parse(req.body);
  const { shop, user } = ctx(req);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  const existing = await Customer.find({ shop }).select('email phone').lean();
  const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email, c._id]));
  const byPhone = new Map(existing.filter((c) => c.phone).map((c) => [normalizePhone(c.phone), c._id]));

  for (const [index, raw] of rows.entries()) {
    const parsed = importRow.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      errors.push({ row: index + 1, message: parsed.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`).join('; ') });
      continue;
    }
    const r = parsed.data;
    const tags = (Array.isArray(r.tags) ? r.tags : (r.tags ?? '').split(/[;,]/)).map((t) => t.trim()).filter(Boolean);
    const phoneKey = normalizePhone(r.phone);
    const matchId = (r.email && byEmail.get(r.email)) || (phoneKey.length >= 7 ? byPhone.get(phoneKey) : undefined);
    const fields = defined({ firstName: r.firstName, lastName: r.lastName, email: r.email || undefined, phone: r.phone || undefined, source: r.source, notes: r.notes, address: r.address, company: r.company });
    try {
      if (matchId) {
        await Customer.updateOne({ _id: matchId, shop }, { $set: fields, ...(tags.length ? { $addToSet: { tags: { $each: tags } } } : {}) });
        updated++;
      } else {
        const c = await Customer.create({ ...fields, tags, source: r.source ?? 'other', shop });
        if (c.email) byEmail.set(c.email, c._id);
        if (phoneKey.length >= 7) byPhone.set(phoneKey, c._id);
        created++;
      }
    } catch (err) {
      skipped++;
      errors.push({ row: index + 1, message: err instanceof Error ? err.message : 'Could not save row' });
    }
  }
  await logActivity({ shop, actor: user, action: 'customers.imported', entityType: 'customer', summary: `Imported customers: ${created} created, ${updated} updated, ${skipped} skipped` });
  res.json({ created, updated, skipped, errors: errors.slice(0, 200) });
});
