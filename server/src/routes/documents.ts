import { Router } from 'express';
import { z } from 'zod';
import { DocumentFile } from '../models/growth.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { ctx, requireRole } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { listQuery, objectId, paged, parseSort, searchRegex } from '../lib/validate.js';
import { findOwned } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { documentUpload, publicUrl, removeUpload } from '../lib/uploads.js';
import { logActivity } from '../lib/activity.js';

export const documentsRouter = Router();
documentsRouter.use(requireFeature('documents'));

const CATEGORIES = ['waiver', 'contract', 'photo', 'receipt', 'warranty', 'other'] as const;
const POPULATE = [
  { path: 'customer', select: 'firstName lastName' },
  { path: 'job', select: 'number title' },
  { path: 'uploadedBy', select: 'name' },
];

documentsRouter.get('/', async (req, res) => {
  const q = listQuery.extend({ customer: objectId.optional(), job: objectId.optional(), category: z.enum(CATEGORIES).optional() }).parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.customer) filter.customer = q.customer;
  if (q.job) filter.job = q.job;
  if (q.category) filter.category = q.category;
  const rx = searchRegex(q.q);
  if (rx) filter.name = rx;
  const sort = parseSort(q.sort, ['createdAt', 'name', 'size'], { createdAt: -1 });
  const [items, total] = await Promise.all([
    DocumentFile.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate(POPULATE),
    DocumentFile.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

documentsRouter.post('/', documentUpload.single('file'), async (req, res) => {
  const { shop, user } = ctx(req);
  const file = req.file;
  if (!file) throw badRequest('Attach a file in the "file" field');
  try {
    const body = z
      .object({
        name: z.string().trim().max(200).optional(),
        category: z.enum(CATEGORIES).default('other'),
        customer: objectId.optional().or(z.literal('').transform(() => undefined)),
        job: objectId.optional().or(z.literal('').transform(() => undefined)),
      })
      .parse(req.body ?? {});
    let customer = body.customer;
    if (body.job) {
      const job = await Job.findOne({ _id: body.job, shop }).select('customer').lean();
      if (!job) throw notFound('Job');
      customer ??= String(job.customer);
    }
    if (customer && !(await Customer.exists({ _id: customer, shop }))) throw notFound('Customer');
    const doc = await DocumentFile.create({
      shop,
      customer,
      job: body.job,
      name: body.name || file.originalname,
      url: publicUrl(file),
      mime: file.mimetype,
      size: file.size,
      category: body.category,
      uploadedBy: user,
    });
    await logActivity({ shop, actor: user, action: 'document.uploaded', entityType: 'document', entityId: doc._id, summary: `Uploaded ${doc.name}` });
    await doc.populate(POPULATE);
    res.status(201).json(doc);
  } catch (err) {
    removeUpload(publicUrl(file));
    throw err;
  }
});

documentsRouter.patch('/:id', async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(200), category: z.enum(CATEGORIES) }).partial().parse(req.body);
  const doc = await findOwned(DocumentFile, ctx(req).shop, req.params.id, 'Document');
  doc.set(body);
  await doc.save();
  await doc.populate(POPULATE);
  res.json(doc);
});

documentsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const doc = await findOwned(DocumentFile, ctx(req).shop, req.params.id, 'Document');
  removeUpload(doc.url);
  await doc.deleteOne();
  res.json({ ok: true });
});
