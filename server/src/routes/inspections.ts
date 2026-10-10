import { Router } from 'express';
import { z } from 'zod';
import { Inspection } from '../models/Inspection.js';
import { Job } from '../models/Job.js';
import { Customer } from '../models/Customer.js';
import { Vehicle } from '../models/Vehicle.js';
import { Shop } from '../models/Shop.js';
import { ctx, requireRole } from '../lib/auth.js';
import { csv, listQuery, objectId, paged, parseSort, patchSchema } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS, VEHICLE_FIELDS } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { hasFeature, planRequiredError } from '../lib/plans.js';
import { mediaUpload, publicUrl, removeUpload } from '../lib/uploads.js';
import { portalLink, sendMessage } from '../lib/messaging.js';
import { logActivity } from '../lib/activity.js';
import { broadcastJob } from '../lib/jobs.js';

export const inspectionsRouter = Router();

const markerInput = z.object({
  _id: objectId.optional(),
  view: z.enum(['top', 'left', 'right', 'front', 'rear']).default('top'),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  kind: z.enum(['scratch', 'dent', 'chip', 'swirl', 'crack', 'stain', 'other']).default('scratch'),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  note: z.string().max(500).default(''),
});

const inspectionBody = z.object({
  job: objectId.optional().nullable(),
  customer: objectId.optional(),
  vehicle: objectId.optional(),
  type: z.enum(['pre', 'post']).default('pre'),
  status: z.enum(['draft', 'awaiting_signature', 'signed']).optional(),
  markers: z.array(markerInput).max(300).default([]),
  notes: z.string().max(5000).default(''),
});

const POPULATE = [
  { path: 'customer', select: CUSTOMER_FIELDS },
  { path: 'vehicle', select: VEHICLE_FIELDS },
  { path: 'job', select: 'number title stage portalToken' },
];

const filters = listQuery.extend({ job: objectId.optional(), status: csv, vehicle: objectId.optional() });

inspectionsRouter.get('/', async (req, res) => {
  const q = filters.parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.job) filter.job = q.job;
  if (q.vehicle) filter.vehicle = q.vehicle;
  if (q.status?.length) filter.status = { $in: q.status };
  const sort = parseSort(q.sort, ['createdAt', 'updatedAt'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    Inspection.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    Inspection.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

inspectionsRouter.get('/:id', async (req, res) => {
  const inspection = await findOwned(Inspection, ctx(req).shop, req.params.id, 'Inspection');
  await inspection.populate(POPULATE);
  res.json(inspection);
});

inspectionsRouter.post('/', async (req, res) => {
  const body = inspectionBody.parse(req.body);
  const { shop, user } = ctx(req);
  let { customer, vehicle } = body;
  if (body.job) {
    const job = await Job.findOne({ _id: body.job, shop }).select('customer vehicle').lean();
    if (!job) throw notFound('Job');
    customer ??= String(job.customer);
    vehicle ??= job.vehicle ? String(job.vehicle) : undefined;
  }
  if (!customer || !vehicle) throw badRequest('customer and vehicle are required (or pass a job with a vehicle)');
  if (!(await Customer.exists({ _id: customer, shop }))) throw notFound('Customer');
  if (!(await Vehicle.exists({ _id: vehicle, shop }))) throw notFound('Vehicle');

  const inspection = await Inspection.create({ ...body, status: body.status ?? 'draft', customer, vehicle, shop });
  if (body.job) {
    await Job.updateOne({ _id: body.job, shop }, { $push: { timeline: { type: 'inspection', message: `${body.type === 'pre' ? 'Pre' : 'Post'}-work inspection started`, by: user } } });
    await broadcastJob(shop, body.job);
  }
  await logActivity({ shop, actor: user, action: 'inspection.created', entityType: 'inspection', entityId: inspection._id, summary: 'Vehicle inspection created' });
  await inspection.populate(POPULATE);
  res.status(201).json(inspection);
});

inspectionsRouter.patch('/:id', async (req, res) => {
  const body = patchSchema(inspectionBody.omit({ job: true, customer: true, vehicle: true })).parse(req.body);
  const inspection = await findOwned(Inspection, ctx(req).shop, req.params.id, 'Inspection');
  inspection.set(defined(body));
  await inspection.save();
  await inspection.populate(POPULATE);
  res.json(inspection);
});

inspectionsRouter.post('/:id/media', mediaUpload.single('file'), async (req, res) => {
  const { shop, user } = ctx(req);
  const file = req.file;
  if (!file) throw badRequest('Attach a file in the "file" field');
  const inspection = await Inspection.findOne({ _id: String(req.params.id), shop });
  if (!inspection) {
    removeUpload(publicUrl(file));
    throw notFound('Inspection');
  }
  const kind = file.mimetype.startsWith('video/') ? 'video' : 'photo';
  if (kind === 'video') {
    const shopDoc = await Shop.findById(shop).select('plan addOns').lean();
    if (!shopDoc || !hasFeature(shopDoc, 'video_inspections')) {
      removeUpload(publicUrl(file));
      throw planRequiredError('video_inspections');
    }
  }
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.slice(0, 300) : '';
  inspection.media.push({ url: publicUrl(file), kind, caption });
  await inspection.save();
  await logActivity({ shop, actor: user, action: 'inspection.media', entityType: 'inspection', entityId: inspection._id, summary: `${kind === 'video' ? 'Video' : 'Photo'} added to inspection` });
  await inspection.populate(POPULATE);
  res.status(201).json(inspection);
});

inspectionsRouter.delete('/:id/media/:mediaId', async (req, res) => {
  const inspection = await findOwned(Inspection, ctx(req).shop, req.params.id, 'Inspection');
  const media = inspection.media.id(String(req.params.mediaId));
  if (!media) throw notFound('Media');
  removeUpload(media.url);
  media.deleteOne();
  await inspection.save();
  await inspection.populate(POPULATE);
  res.json(inspection);
});

inspectionsRouter.post('/:id/request-signature', async (req, res) => {
  const body = z.object({ channel: z.enum(['sms', 'email']).default('sms') }).parse(req.body ?? {});
  const { shop, user } = ctx(req);
  const inspection = await findOwned(Inspection, shop, req.params.id, 'Inspection');
  const customer = await Customer.findById(inspection.customer);
  if (!customer) throw notFound('Customer');
  inspection.status = 'awaiting_signature';
  await inspection.save();
  const job = inspection.job ? await Job.findById(inspection.job).select('portalToken').lean() : null;
  await sendMessage({
    shop,
    customer,
    job: inspection.job,
    channel: body.channel,
    subject: 'Please review your vehicle inspection',
    body: `Hi ${customer.firstName}, please review and sign the condition report for your vehicle: ${portalLink(job?.portalToken ?? inspection.publicToken)}`,
    by: user,
  });
  await inspection.populate(POPULATE);
  res.json(inspection);
});

inspectionsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const inspection = await findOwned(Inspection, ctx(req).shop, req.params.id, 'Inspection');
  inspection.media.forEach((m) => removeUpload(m.url));
  await inspection.deleteOne();
  res.json({ ok: true });
});
