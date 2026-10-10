import { Router } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { Quote } from '../models/Quote.js';
import { Certificate, Membership, Message } from '../models/misc.js';
import { CUSTOMER_SOURCES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { emailField, geoInput, listQuery, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { logActivity } from '../lib/activity.js';
import { fire } from '../lib/automations.js';
import { conflict } from '../lib/errors.js';

export const customersRouter = Router();

export const customerBody = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).default(''),
  email: z.union([emailField, z.literal('')]).default(''),
  phone: z.string().trim().max(40).default(''),
  address: z.string().max(300).default(''),
  company: z.string().max(120).default(''),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  source: z.enum(CUSTOMER_SOURCES).default('other'),
  notes: z.string().max(5000).default(''),
  marketingOptIn: z.boolean().default(true),
  geo: geoInput.optional(),
});

const filters = listQuery.extend({ tag: z.string().max(40).optional(), source: z.enum(CUSTOMER_SOURCES).optional() });

customersRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }, { company: rx }, { tags: rx }];
  if (q.tag) filter.tags = q.tag;
  if (q.source) filter.source = q.source;
  const sort = parseSort(q.sort, ['createdAt', 'firstName', 'lastName', 'lifetimeValue', 'lastVisitAt', 'visits'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize),
    Customer.countDocuments(filter),
  ]);
  res.json(paged(items.map((c) => c.toJSON()), total, q));
});

customersRouter.get('/:id/overview', async (req, res) => {
  const { shop } = ctx(req);
  const customer = await findOwned(Customer, shop, req.params.id, 'Customer');
  const by = { shop, customer: customer._id };
  const [vehicles, jobs, invoices, quotes, messages, certificates, memberships] = await Promise.all([
    Vehicle.find(by).sort({ createdAt: -1 }),
    Job.find(by).sort({ createdAt: -1 }).limit(100).populate('vehicle', 'year make model color'),
    Invoice.find(by).sort({ createdAt: -1 }).limit(100),
    Quote.find(by).sort({ createdAt: -1 }).limit(100),
    Message.find(by).sort({ createdAt: -1 }).limit(50),
    Certificate.find(by).sort({ createdAt: -1 }).populate('vehicle', 'year make model'),
    Membership.find(by).sort({ createdAt: -1 }).populate('plan'),
  ]);
  res.json({ customer: customer.toJSON(), vehicles, jobs, invoices, quotes, messages, certificates, memberships });
});

customersRouter.get('/:id', async (req, res) => {
  const customer = await findOwned(Customer, ctx(req).shop, req.params.id, 'Customer');
  res.json(customer.toJSON());
});

customersRouter.post('/', async (req, res) => {
  const body = customerBody.parse(req.body);
  const { shop, user } = ctx(req);
  if (body.email && (await Customer.exists({ shop, email: body.email }))) {
    throw conflict('A customer with that email already exists');
  }
  const customer = await Customer.create({ ...body, shop });
  await logActivity({ shop, actor: user, action: 'customer.created', entityType: 'customer', entityId: customer._id, summary: `Added customer ${customer.firstName} ${customer.lastName}`.trim() });
  fire(shop, 'customer.created', { customerId: customer._id });
  res.status(201).json(customer.toJSON());
});

customersRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(customerBody).extend({ loyaltyPoints: z.number().min(0).optional() }).parse(req.body);
  const customer = await findOwned(Customer, ctx(req).shop, req.params.id, 'Customer');
  customer.set(body);
  await customer.save();
  res.json(customer.toJSON());
});

customersRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const { shop, user } = ctx(req);
  const customer = await findOwned(Customer, shop, req.params.id, 'Customer');
  if (await Job.exists({ shop, customer: customer._id, stage: { $nin: ['completed', 'cancelled'] } })) {
    throw conflict('This customer has open jobs. Complete or cancel them first.');
  }
  await Promise.all([Vehicle.deleteMany({ shop, customer: customer._id }), customer.deleteOne()]);
  await logActivity({ shop, actor: user, action: 'customer.deleted', entityType: 'customer', entityId: customer._id, summary: `Deleted customer ${customer.firstName} ${customer.lastName}`.trim() });
  res.json({ ok: true });
});
