import { Router } from 'express';
import { z } from 'zod';
import { CalendarBlock } from '../models/growth.js';
import { User } from '../models/User.js';
import { ctx, requireRole } from '../lib/auth.js';
import { dateLike, objectId, patchSchema } from '../lib/validate.js';
import { defined, findOwned } from '../lib/http.js';
import { badRequest, notFound } from '../lib/errors.js';
import { emitToShop } from '../lib/realtime.js';

export const calendarRouter = Router();

const blockBody = z.object({
  user: objectId.optional().nullable(),
  title: z.string().trim().min(1).max(160),
  kind: z.enum(['time_off', 'meeting', 'blocked']).default('blocked'),
  start: z.coerce.date(),
  end: z.coerce.date(),
  bay: z.number().int().min(1).max(50).optional().nullable(),
  allDay: z.boolean().default(false),
  notes: z.string().max(2000).default(''),
});

calendarRouter.get('/blocks', async (req, res) => {
  const q = z.object({ from: dateLike, to: dateLike, user: objectId.optional() }).parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.from) filter.end = { $gt: q.from };
  if (q.to) filter.start = { $lt: q.to };
  if (q.user) filter.user = q.user;
  const blocks = await CalendarBlock.find(filter).sort({ start: 1 }).limit(1000).populate('user', 'name avatarColor');
  res.json(blocks);
});

calendarRouter.post('/blocks', async (req, res) => {
  const body = blockBody.parse(req.body);
  const { shop, user, role } = ctx(req);
  if (body.end <= body.start) throw badRequest('end must be after start');
  // Technicians may only book their own time off.
  const owner = role === 'technician' ? user : body.user ?? null;
  if (owner && !(await User.exists({ _id: owner, shop }))) throw notFound('Team member');
  const block = await CalendarBlock.create({ ...body, user: owner, shop });
  await block.populate('user', 'name avatarColor');
  emitToShop(shop, 'calendar:updated', block.toJSON());
  res.status(201).json(block);
});

calendarRouter.patch('/blocks/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(blockBody).parse(req.body);
  const { shop } = ctx(req);
  if (body.user && !(await User.exists({ _id: body.user, shop }))) throw notFound('Team member');
  const block = await findOwned(CalendarBlock, shop, req.params.id, 'Calendar block');
  block.set(defined(body));
  if (block.end <= block.start) throw badRequest('end must be after start');
  await block.save();
  await block.populate('user', 'name avatarColor');
  emitToShop(shop, 'calendar:updated', block.toJSON());
  res.json(block);
});

calendarRouter.delete('/blocks/:id', requireRole('manager'), async (req, res) => {
  const { shop } = ctx(req);
  const block = await findOwned(CalendarBlock, shop, req.params.id, 'Calendar block');
  await block.deleteOne();
  emitToShop(shop, 'calendar:updated', { _id: block._id, deleted: true });
  res.json({ ok: true });
});
