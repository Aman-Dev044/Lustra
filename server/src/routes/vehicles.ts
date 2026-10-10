import { Router } from 'express';
import { z } from 'zod';
import { Vehicle } from '../models/Vehicle.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { VEHICLE_SIZES, VEHICLE_TYPES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { listQuery, objectId, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { conflict, notFound } from '../lib/errors.js';
import { decodeVin } from '../lib/vin.js';

export const vehiclesRouter = Router();

export const vehicleBody = z.object({
  customer: objectId,
  type: z.enum(VEHICLE_TYPES).default('car'),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  make: z.string().trim().max(60).default(''),
  model: z.string().trim().max(60).default(''),
  trim: z.string().trim().max(60).default(''),
  color: z.string().trim().max(40).default(''),
  vin: z.string().trim().max(17).default(''),
  plate: z.string().trim().max(20).default(''),
  size: z.enum(VEHICLE_SIZES).default('medium'),
  notes: z.string().max(2000).default(''),
});

const filters = listQuery.extend({ customer: objectId.optional() });

vehiclesRouter.get('/decode-vin/:vin', (req, res) => {
  res.json(decodeVin(req.params.vin));
});

vehiclesRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ make: rx }, { model: rx }, { vin: rx }, { plate: rx }, { color: rx }];
  if (q.customer) filter.customer = q.customer;
  const sort = parseSort(q.sort, ['createdAt', 'year', 'make'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    Vehicle.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate('customer', 'firstName lastName phone email'),
    Vehicle.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

vehiclesRouter.get('/:id', async (req, res) => {
  const vehicle = await findOwned(Vehicle, ctx(req).shop, req.params.id, 'Vehicle');
  await vehicle.populate('customer', 'firstName lastName phone email');
  res.json(vehicle);
});

vehiclesRouter.post('/', async (req, res) => {
  const body = vehicleBody.parse(req.body);
  const { shop } = ctx(req);
  if (!(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  const vehicle = await Vehicle.create({ ...body, shop });
  res.status(201).json(vehicle);
});

vehiclesRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(vehicleBody).parse(req.body);
  const { shop } = ctx(req);
  if (body.customer && !(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  const vehicle = await findOwned(Vehicle, shop, req.params.id, 'Vehicle');
  vehicle.set(body);
  await vehicle.save();
  res.json(vehicle);
});

vehiclesRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const vehicle = await findOwned(Vehicle, shop, req.params.id, 'Vehicle');
  if (await Job.exists({ shop, vehicle: vehicle._id, stage: { $nin: ['completed', 'cancelled'] } })) {
    throw conflict('This vehicle has open jobs');
  }
  await vehicle.deleteOne();
  res.json({ ok: true });
});
