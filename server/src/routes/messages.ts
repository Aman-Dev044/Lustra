import { Router } from 'express';
import { z } from 'zod';
import { Message } from '../models/misc.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { ctx } from '../lib/auth.js';
import { objectId } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';
import { sendMessage } from '../lib/messaging.js';

export const messagesRouter = Router();

/** One row per customer conversation, newest first, with unread inbound counts. */
messagesRouter.get('/threads', async (req, res) => {
  const { shop } = ctx(req);
  const rows = await Message.aggregate([
    { $match: { shop } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$customer',
        lastMessage: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$direction', 'inbound'] }, { $not: ['$readAt'] }] }, 1, 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    { $limit: 200 },
    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer', pipeline: [{ $project: { firstName: 1, lastName: 1, phone: 1, email: 1, tags: 1 } }] } },
    { $unwind: '$customer' },
    { $project: { _id: 0, customer: 1, lastMessage: 1, unread: 1, count: 1 } },
  ]);
  res.json(rows);
});

messagesRouter.get('/', async (req, res) => {
  const q = z.object({ customer: objectId, limit: z.coerce.number().int().min(1).max(500).default(200) }).parse(req.query);
  const { shop } = ctx(req);
  const messages = await Message.find({ shop, customer: q.customer }).sort({ createdAt: -1 }).limit(q.limit).populate('by', 'name avatarColor');
  res.json(messages.reverse());
});

messagesRouter.post('/', async (req, res) => {
  const body = z
    .object({
      customer: objectId,
      channel: z.enum(['sms', 'email', 'note']).default('sms'),
      body: z.string().trim().min(1).max(5000),
      subject: z.string().max(200).optional(),
      job: objectId.optional(),
    })
    .parse(req.body);
  const { shop, user } = ctx(req);
  const customer = await Customer.findOne({ _id: body.customer, shop });
  if (!customer) throw notFound('Customer');
  if (body.job && !(await Job.exists({ _id: body.job, shop }))) throw notFound('Job');
  const message = await sendMessage({ shop, customer, job: body.job, channel: body.channel, body: body.body, subject: body.subject, by: user });
  await message.populate('by', 'name avatarColor');
  res.status(201).json(message);
});

messagesRouter.post('/read', async (req, res) => {
  const { customer } = z.object({ customer: objectId }).parse(req.body);
  const result = await Message.updateMany({ shop: ctx(req).shop, customer, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ ok: true, updated: result.modifiedCount });
});
