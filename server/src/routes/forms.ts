import { Router } from 'express';
import { z } from 'zod';
import type { Types } from 'mongoose';
import { LeadForm, FORM_FIELD_TYPES } from '../models/growth.js';
import { Job } from '../models/Job.js';
import { ctx, requireRole } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { listQuery, paged, patchSchema, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { conflict } from '../lib/errors.js';
import { slugify } from '../lib/provision.js';
import { JOB_POPULATE } from '../lib/jobs.js';

export const formsRouter = Router();
formsRouter.use(requireFeature('lead_forms'));

const fieldInput = z.object({
  _id: z.string().optional(),
  key: z.string().trim().min(1).max(40).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Keys must start with a letter and use letters, numbers or _'),
  label: z.string().trim().min(1).max(160),
  type: z.enum(FORM_FIELD_TYPES).default('text'),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
});

const formBody = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(60).optional(),
  title: z.string().trim().max(200).default(''),
  description: z.string().max(2000).default(''),
  fields: z
    .array(fieldInput)
    .min(1)
    .max(40)
    .refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length, 'Field keys must be unique'),
  submitLabel: z.string().trim().max(60).default('Request a quote'),
  successMessage: z.string().max(500).default('Thanks! We will be in touch shortly with your quote.'),
  createJob: z.boolean().default(true),
  active: z.boolean().default(true),
});

/** Sensible starter fields for a quote-request form. */
export const DEFAULT_FORM_FIELDS = [
  { key: 'name', label: 'Full name', type: 'text', required: true, options: [] },
  { key: 'email', label: 'Email', type: 'email', required: true, options: [] },
  { key: 'phone', label: 'Mobile number', type: 'phone', required: true, options: [] },
  { key: 'vehicle', label: 'Vehicle', type: 'vehicle', required: true, options: [] },
  { key: 'services', label: 'Services you are interested in', type: 'services', required: false, options: [] },
  { key: 'date', label: 'Preferred date', type: 'date', required: false, options: [] },
  { key: 'notes', label: 'Anything else we should know?', type: 'textarea', required: false, options: [] },
] as const;

async function uniqueSlug(shop: Types.ObjectId, base: string, exceptId?: Types.ObjectId) {
  const root = slugify(base) || 'form';
  let slug = root;
  for (let i = 2; await LeadForm.exists({ shop, slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }); i++) slug = `${root}-${i}`;
  return slug;
}

formsRouter.get('/', async (req, res) => {
  const q = listQuery.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ name: rx }, { title: rx }];
  const [items, total] = await Promise.all([
    LeadForm.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize),
    LeadForm.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

formsRouter.get('/:id/submissions', async (req, res) => {
  const q = listQuery.parse(req.query);
  const { shop } = ctx(req);
  const form = await findOwned(LeadForm, shop, req.params.id, 'Form');
  const filter = { shop, leadForm: form._id };
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(JOB_POPULATE),
    Job.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

formsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(LeadForm, ctx(req).shop, req.params.id, 'Form'));
});

formsRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = formBody.parse(req.body);
  const { shop } = ctx(req);
  const slug = await uniqueSlug(shop, body.slug || body.name);
  if (body.slug && slugify(body.slug) !== slug) throw conflict(`The URL "${body.slug}" is already used by another form`);
  res.status(201).json(await LeadForm.create({ ...body, slug, shop }));
});

formsRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(formBody).parse(req.body);
  const { shop } = ctx(req);
  const form = await findOwned(LeadForm, shop, req.params.id, 'Form');
  const { slug, ...rest } = body;
  form.set(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
  if (slug !== undefined && slugify(slug) !== form.slug) {
    const next = await uniqueSlug(shop, slug, form._id);
    if (next !== slugify(slug)) throw conflict(`The URL "${slug}" is already used by another form`);
    form.slug = next;
  }
  await form.save();
  res.json(form);
});

formsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const form = await findOwned(LeadForm, ctx(req).shop, req.params.id, 'Form');
  await form.deleteOne();
  res.json({ ok: true });
});
