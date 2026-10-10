import { Router } from 'express';
import { z } from 'zod';
import { Service } from '../models/Service.js';
import { SERVICE_CATEGORIES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { listQuery, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';

export const servicesRouter = Router();

const serviceBody = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.enum(SERVICE_CATEGORIES).default('other'),
  description: z.string().max(2000).default(''),
  basePrice: z.number().min(0).max(1_000_000),
  durationMinutes: z.number().int().min(0).max(20_000).default(60),
  sizeMultipliers: z
    .object({ small: z.number().min(0), medium: z.number().min(0), large: z.number().min(0), xl: z.number().min(0) })
    .partial()
    .optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
  active: z.boolean().default(true),
  bookable: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7c5cff'),
});

const filters = listQuery.extend({
  category: z.enum(SERVICE_CATEGORIES).optional(),
  active: z.enum(['true', 'false']).optional(),
});

servicesRouter.get('/', async (req, res) => {
  const q = filters.parse({ pageSize: 200, ...req.query });
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ name: rx }, { description: rx }, { keywords: rx }];
  if (q.category) filter.category = q.category;
  if (q.active) filter.active = q.active === 'true';
  const sort = parseSort(q.sort, ['name', 'basePrice', 'category', 'createdAt'], { category: 1, basePrice: 1 });
  const [items, total] = await Promise.all([
    Service.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize),
    Service.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

servicesRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Service, ctx(req).shop, req.params.id, 'Service'));
});

servicesRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = serviceBody.parse(req.body);
  const service = await Service.create({ ...body, shop: ctx(req).shop });
  res.status(201).json(service);
});

servicesRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(serviceBody).parse(req.body);
  const service = await findOwned(Service, ctx(req).shop, req.params.id, 'Service');
  const { sizeMultipliers, ...rest } = body;
  service.set(rest);
  if (sizeMultipliers) service.set('sizeMultipliers', { ...service.toObject().sizeMultipliers, ...sizeMultipliers });
  await service.save();
  res.json(service);
});

servicesRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const service = await findOwned(Service, ctx(req).shop, req.params.id, 'Service');
  await service.deleteOne();
  res.json({ ok: true });
});
