import { Router } from 'express';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { Certificate } from '../models/misc.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, dateLike, escapeRegex, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS, VEHICLE_FIELDS } from '../lib/http.js';
import { notFound } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { broadcastJob } from '../lib/jobs.js';

export const certificatesRouter = Router();

const code = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);
export const newCertificateCode = () => `LX-${code()}`;

const certBody = z.object({
  customer: objectId,
  vehicle: objectId,
  job: objectId.optional().nullable(),
  product: z.string().trim().min(1).max(160),
  coverage: z.string().trim().max(200).default(''),
  installedAt: dateLike,
  expiresAt: dateLike,
  installer: objectId.optional().nullable(),
  notes: z.string().max(2000).default(''),
  status: z.enum(['active', 'expired', 'void']).default('active'),
});

const POPULATE = [
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'vehicle', select: VEHICLE_FIELDS },
  { path: 'installer', select: 'name' },
  { path: 'job', select: 'number title' },
];

const filters = listQuery.extend({ status: csv, customer: objectId.optional() });

certificatesRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.status?.length) filter.status = { $in: q.status };
  if (q.customer) filter.customer = q.customer;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const customerIds = await Customer.find({ shop, $or: [{ firstName: rx }, { lastName: rx }] }).distinct('_id');
    filter.$or = [{ code: rx }, { product: rx }, { coverage: rx }, { customer: { $in: customerIds } }];
  }
  const sort = parseSort(q.sort, ['createdAt', 'installedAt', 'expiresAt'], { installedAt: -1 });
  const [items, total] = await Promise.all([
    Certificate.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    Certificate.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

certificatesRouter.get('/:id', async (req, res) => {
  const cert = await findOwned(Certificate, ctx(req).shop, req.params.id, 'Certificate');
  await cert.populate(POPULATE);
  res.json(cert);
});

certificatesRouter.post('/', async (req, res) => {
  const body = certBody.parse(req.body);
  const { shop, user } = ctx(req);
  if (!(await Customer.exists({ _id: body.customer, shop }))) throw notFound('Customer');
  if (!(await Vehicle.exists({ _id: body.vehicle, shop }))) throw notFound('Vehicle');
  if (body.job && !(await Job.exists({ _id: body.job, shop }))) throw notFound('Job');
  if (body.installer && !(await User.exists({ _id: body.installer, shop }))) throw notFound('Installer');

  let cert;
  for (let attempt = 0; ; attempt++) {
    try {
      cert = await Certificate.create({ ...body, installedAt: body.installedAt ?? new Date(), shop, code: newCertificateCode() });
      break;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000 || attempt > 4) throw err;
    }
  }
  if (body.job) {
    await Job.updateOne({ _id: body.job, shop }, { $push: { timeline: { type: 'system', message: `Warranty certificate ${cert.code} issued (${cert.product})`, by: user } } });
    await broadcastJob(shop, body.job);
  }
  await logActivity({ shop, actor: user, action: 'certificate.issued', entityType: 'certificate', entityId: cert._id, summary: `Certificate ${cert.code} issued for ${cert.product}` });
  await cert.populate(POPULATE);
  res.status(201).json(cert);
});

certificatesRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(certBody).parse(req.body);
  const cert = await findOwned(Certificate, ctx(req).shop, req.params.id, 'Certificate');
  cert.set(defined(body));
  await cert.save();
  await cert.populate(POPULATE);
  res.json(cert);
});

certificatesRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const cert = await findOwned(Certificate, ctx(req).shop, req.params.id, 'Certificate');
  await cert.deleteOne();
  res.json({ ok: true });
});
