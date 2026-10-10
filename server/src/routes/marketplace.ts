import { Router } from 'express';
import { z } from 'zod';
import { MARKETPLACE_CATEGORIES, MarketplaceProduct, SupplyOrder } from '../models/growth.js';
import { InventoryItem } from '../models/misc.js';
import { Shop } from '../models/Shop.js';
import { ctx, requireRole } from '../lib/auth.js';
import { hasFeature, requireFeature } from '../lib/plans.js';
import { listQuery, objectId, paged, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { badRequest, conflict } from '../lib/errors.js';
import { nextNumber } from '../lib/counters.js';
import { round2 } from '../lib/money.js';
import { logActivity, notify } from '../lib/activity.js';
import { ensureMarketplaceCatalog } from '../seed/marketplace.js';

export const marketplaceRouter = Router();

const CASHBACK = 0.02;

marketplaceRouter.get('/products', async (req, res) => {
  const q = z.object({ category: z.enum(MARKETPLACE_CATEGORIES).optional(), q: z.string().trim().max(100).optional() }).parse(req.query);
  await ensureMarketplaceCatalog();
  const filter: Record<string, unknown> = {};
  if (q.category) filter.category = q.category;
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ name: rx }, { vendor: rx }, { sku: rx }, { description: rx }];
  const [items, shop] = await Promise.all([
    MarketplaceProduct.find(filter).sort({ category: 1, rating: -1, name: 1 }),
    Shop.findById(ctx(req).shop).select('plan addOns credits').lean(),
  ]);
  res.json({ items, credits: round2(shop?.credits ?? 0), memberPricing: shop ? hasFeature(shop, 'marketplace') : false });
});

marketplaceRouter.get('/orders', async (req, res) => {
  const q = listQuery.parse(req.query);
  const { shop } = ctx(req);
  const [items, total] = await Promise.all([
    SupplyOrder.find({ shop }).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate('placedBy', 'name'),
    SupplyOrder.countDocuments({ shop }),
  ]);
  res.json(paged(items, total, q));
});

marketplaceRouter.post('/orders', requireFeature('marketplace'), requireRole('manager'), async (req, res) => {
  const body = z.object({ items: z.array(z.object({ product: objectId, qty: z.number().int().min(1).max(500) })).min(1).max(50) }).parse(req.body);
  const { shop, user } = ctx(req);
  const products = await MarketplaceProduct.find({ _id: { $in: body.items.map((i) => i.product) } }).lean();
  const items = body.items.map((line) => {
    const p = products.find((x) => String(x._id) === line.product);
    if (!p) throw badRequest('One or more products are no longer available');
    return { product: p._id, sku: p.sku, name: p.name, qty: line.qty, price: p.memberPrice };
  });
  const subtotal = round2(items.reduce((s, i) => s + i.price * i.qty, 0));
  const credit = round2(subtotal * CASHBACK);
  const order = await SupplyOrder.create({ shop, number: await nextNumber(shop, 'order'), items, subtotal, credit, total: subtotal, status: 'placed', placedBy: user });
  await Shop.updateOne({ _id: shop }, { $inc: { credits: credit } });
  await logActivity({ shop, actor: user, action: 'marketplace.order', entityType: 'order', entityId: order._id, summary: `Supply order #${order.number} placed ($${subtotal.toFixed(2)})` });
  res.status(201).json(order);
});

marketplaceRouter.post('/orders/:id/receive', requireRole('manager'), async (req, res) => {
  const { shop, user } = ctx(req);
  const order = await findOwned(SupplyOrder, shop, req.params.id, 'Order');
  if (order.status === 'delivered') throw conflict('This order was already received');
  for (const line of order.items) {
    const existing = line.sku ? await InventoryItem.findOne({ shop, sku: line.sku }) : null;
    const adjustment = { delta: line.qty ?? 0, reason: `Received supply order #${order.number}`, by: user, at: new Date() };
    if (existing) {
      existing.quantity = (existing.quantity ?? 0) + (line.qty ?? 0);
      existing.cost = line.price ?? existing.cost;
      existing.adjustments.push(adjustment);
      await existing.save();
    } else {
      const product = await MarketplaceProduct.findById(line.product).select('category vendor unit').lean();
      await InventoryItem.create({
        shop,
        name: line.name ?? 'Supply item',
        sku: line.sku ?? '',
        category: product?.category ? product.category[0].toUpperCase() + product.category.slice(1) : 'Supplies',
        unit: product?.unit ?? 'unit',
        quantity: line.qty ?? 0,
        reorderLevel: 1,
        cost: line.price ?? 0,
        supplier: product?.vendor ?? 'Lustra Marketplace',
        adjustments: [adjustment],
      });
    }
  }
  order.status = 'delivered';
  order.deliveredAt = new Date();
  await order.save();
  await notify({ shop, title: `Supply order #${order.number} received`, body: `${order.items.length} item(s) added to inventory`, link: '/app/inventory', kind: 'success' });
  res.json(order);
});
