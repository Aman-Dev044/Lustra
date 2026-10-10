import { Router } from 'express';
import { z } from 'zod';
import { InventoryItem } from '../models/misc.js';
import { ctx, requireRole } from '../lib/auth.js';
import { listQuery, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { notify } from '../lib/activity.js';

export const inventoryRouter = Router();

const itemBody = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().max(60).default(''),
  category: z.string().trim().max(60).default('Supplies'),
  unit: z.string().trim().max(30).default('unit'),
  quantity: z.number().min(-100_000).max(1_000_000).default(0),
  reorderLevel: z.number().min(0).max(1_000_000).default(0),
  cost: z.number().min(0).max(1_000_000).default(0),
  supplier: z.string().max(120).default(''),
  location: z.string().max(120).default(''),
});

const filters = listQuery.extend({ category: z.string().max(60).optional(), lowStock: z.enum(['true', 'false']).optional() });

inventoryRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ name: rx }, { sku: rx }, { supplier: rx }, { category: rx }];
  if (q.category) filter.category = q.category;
  if (q.lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$reorderLevel'] };
  const sort = parseSort(q.sort, ['name', 'quantity', 'category', 'cost', 'updatedAt'], { category: 1, name: 1 });
  const [items, total, stats] = await Promise.all([
    InventoryItem.find(filter).select('-adjustments').sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize),
    InventoryItem.countDocuments(filter),
    InventoryItem.aggregate([
      { $match: { shop } },
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ['$quantity', '$cost'] } },
          lowStock: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } },
        },
      },
    ]),
  ]);
  res.json({ ...paged(items, total, q), summary: { stockValue: Math.round((stats[0]?.value ?? 0) * 100) / 100, lowStock: stats[0]?.lowStock ?? 0 } });
});

inventoryRouter.get('/:id', async (req, res) => {
  const item = await findOwned(InventoryItem, ctx(req).shop, req.params.id, 'Inventory item');
  await item.populate('adjustments.by', 'name');
  res.json(item);
});

inventoryRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = itemBody.parse(req.body);
  res.status(201).json(await InventoryItem.create({ ...body, shop: ctx(req).shop }));
});

inventoryRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(itemBody).parse(req.body);
  const item = await findOwned(InventoryItem, ctx(req).shop, req.params.id, 'Inventory item');
  item.set(body);
  await item.save();
  res.json(item);
});

inventoryRouter.post('/:id/adjust', async (req, res) => {
  const body = z.object({ delta: z.number().refine((n) => n !== 0, 'delta cannot be 0'), reason: z.string().max(200).default('') }).parse(req.body);
  const { shop, user } = ctx(req);
  const item = await findOwned(InventoryItem, shop, req.params.id, 'Inventory item');
  const wasLow = item.quantity <= item.reorderLevel;
  item.quantity = Math.round((item.quantity + body.delta) * 1000) / 1000;
  item.adjustments.push({ delta: body.delta, reason: body.reason, by: user, at: new Date() });
  if (item.adjustments.length > 200) item.adjustments.splice(0, item.adjustments.length - 200);
  await item.save();
  if (!wasLow && item.quantity <= item.reorderLevel) {
    await notify({ shop, title: `Low stock: ${item.name}`, body: `${item.quantity} ${item.unit} left (reorder at ${item.reorderLevel})`, link: '/app/inventory', kind: 'warning' });
  }
  res.json(item);
});

inventoryRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const item = await findOwned(InventoryItem, ctx(req).shop, req.params.id, 'Inventory item');
  await item.deleteOne();
  res.json({ ok: true });
});
