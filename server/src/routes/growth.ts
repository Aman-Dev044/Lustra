import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { Campaign, Review, ReviewRequest, SEGMENT_TYPES } from '../models/growth.js';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { Shop } from '../models/Shop.js';
import { Message } from '../models/misc.js';
import { ctx, requireRole } from '../lib/auth.js';
import { requireFeature } from '../lib/plans.js';
import { csv, listQuery, objectId, paged, parseSort, patchSchema, searchRegex } from '../lib/validate.js';
import { defined, findOwned, CUSTOMER_FIELDS } from '../lib/http.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { reachable, segmentFilter } from '../lib/segments.js';
import { bookingLink, portalLink, renderTemplate, sendMessage } from '../lib/messaging.js';
import { logActivity } from '../lib/activity.js';
import { messageSuggestions, reviewReplySuggestions } from '../lib/suggestions.js';
import { buildInsights } from '../lib/insights.js';
import { config } from '../config.js';
import { round2 } from '../lib/money.js';

export const campaignsRouter = Router();
export const reviewsRouter = Router();
export const aiInsightsRouter = Router();
export const messageSuggestRouter = Router();

/* ---------------- Campaigns ---------------- */
campaignsRouter.use(requireFeature('campaigns'));

const segmentInput = z.object({ type: z.enum(SEGMENT_TYPES).default('all'), value: z.union([z.string().max(60), z.number()]).optional() });
const campaignBody = z.object({
  name: z.string().trim().min(1).max(160),
  channel: z.enum(['sms', 'email']).default('sms'),
  segment: segmentInput.default({ type: 'all' }),
  subject: z.string().max(200).default(''),
  body: z.string().trim().min(1).max(1600),
});

campaignsRouter.get('/preview', async (req, res) => {
  const q = z.object({ type: z.enum(SEGMENT_TYPES).default('all'), value: z.string().max(60).optional(), channel: z.enum(['sms', 'email']).optional() }).parse(req.query);
  const { shop } = ctx(req);
  const base = await segmentFilter(shop, q.type, q.value);
  const filter = q.channel ? reachable(base, q.channel) : base;
  const [count, sample] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.find(filter).sort({ lifetimeValue: -1 }).limit(5).select(`${CUSTOMER_FIELDS} lastVisitAt`),
  ]);
  res.json({ count, sample });
});

campaignsRouter.get('/', async (req, res) => {
  const q = listQuery.extend({ status: csv }).parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.status?.length) filter.status = { $in: q.status };
  const rx = searchRegex(q.q);
  if (rx) filter.name = rx;
  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize),
    Campaign.countDocuments(filter),
  ]);
  res.json(paged(items, total, q));
});

campaignsRouter.get('/:id', async (req, res) => {
  res.json(await findOwned(Campaign, ctx(req).shop, req.params.id, 'Campaign'));
});

campaignsRouter.post('/', requireRole('manager'), async (req, res) => {
  const body = campaignBody.parse(req.body);
  res.status(201).json(await Campaign.create({ ...body, shop: ctx(req).shop }));
});

campaignsRouter.patch('/:id', requireRole('manager'), async (req, res) => {
  const body = patchSchema(campaignBody).parse(req.body);
  const campaign = await findOwned(Campaign, ctx(req).shop, req.params.id, 'Campaign');
  if (campaign.status === 'sent') throw conflict('Sent campaigns cannot be edited — duplicate it instead');
  campaign.set(defined(body));
  await campaign.save();
  res.json(campaign);
});

campaignsRouter.delete('/:id', requireRole('manager'), async (req, res) => {
  const campaign = await findOwned(Campaign, ctx(req).shop, req.params.id, 'Campaign');
  await campaign.deleteOne();
  res.json({ ok: true });
});

campaignsRouter.post('/:id/send', requireRole('manager'), async (req, res) => {
  const { shop, user } = ctx(req);
  const campaign = await findOwned(Campaign, shop, req.params.id, 'Campaign');
  if (campaign.status === 'sent') throw conflict('This campaign was already sent');
  const channel = campaign.channel as 'sms' | 'email';
  const shopDoc = await Shop.findById(shop).lean();
  const filter = reachable(await segmentFilter(shop, (campaign.segment?.type ?? 'all') as never, campaign.segment?.value), channel);
  const recipients = await Customer.find(filter).limit(5000);
  if (!recipients.length) throw badRequest('No reachable customers match this segment');

  let delivered = 0;
  for (const customer of recipients) {
    const context = { customer: customer.toObject(), shop: shopDoc, bookingLink: shopDoc ? bookingLink(shopDoc.slug) : '' };
    const message = await sendMessage({
      shop,
      customer,
      channel,
      subject: channel === 'email' ? renderTemplate(campaign.subject || campaign.name, context) : undefined,
      body: renderTemplate(campaign.body, context),
      by: user,
    });
    if (message.status !== 'failed') delivered++;
  }
  campaign.status = 'sent';
  campaign.sentAt = new Date();
  campaign.stats = { recipients: recipients.length, delivered, booked: 0, revenue: 0 };
  await campaign.save();
  await logActivity({ shop, actor: user, action: 'campaign.sent', entityType: 'campaign', entityId: campaign._id, summary: `Campaign "${campaign.name}" sent to ${recipients.length} customers` });
  res.json(campaign);
});

/* ---------------- Reviews ---------------- */

const SOURCES = ['google', 'facebook', 'yelp', 'lustra'] as const;

reviewsRouter.use(requireFeature('reviews'));

reviewsRouter.get('/', async (req, res) => {
  const q = listQuery
    .extend({ source: z.enum(SOURCES).optional(), status: z.enum(['new', 'replied']).optional(), rating: z.coerce.number().int().min(1).max(5).optional() })
    .parse(req.query);
  const { shop } = ctx(req);
  const filter: Record<string, unknown> = { shop };
  if (q.source) filter.source = q.source;
  if (q.status) filter.status = q.status;
  if (q.rating) filter.rating = q.rating;
  const rx = searchRegex(q.q);
  if (rx) filter.$or = [{ comment: rx }, { author: rx }];
  const sort = parseSort(q.sort, ['createdAt', 'rating'], { createdAt: -1 });
  const [items, total, agg] = await Promise.all([
    Review.find(filter).sort(sort).skip((q.page - 1) * q.pageSize).limit(q.pageSize).populate('customer', 'firstName lastName').populate('job', 'number title'),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { shop } },
      {
        $facet: {
          overall: [{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 }, replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } } } }],
          distribution: [{ $group: { _id: '$rating', count: { $sum: 1 } } }],
          bySource: [{ $group: { _id: '$source', count: { $sum: 1 }, average: { $avg: '$rating' } } }],
        },
      },
    ]),
  ]);
  const facet = agg[0] ?? { overall: [], distribution: [], bySource: [] };
  const overall = facet.overall[0];
  const distribution: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of facet.distribution) distribution[String(d._id)] = d.count;
  res.json({
    ...paged(items, total, q),
    summary: {
      average: round2(overall?.average ?? 0),
      count: overall?.count ?? 0,
      distribution,
      responseRate: overall?.count ? round2((overall.replied / overall.count) * 100) : 0,
      bySource: SOURCES.map((source) => {
        const row = facet.bySource.find((s: { _id: string }) => s._id === source);
        return { source, count: row?.count ?? 0, average: round2(row?.average ?? 0) };
      }),
    },
  });
});

reviewsRouter.patch('/:id', async (req, res) => {
  const { reply } = z.object({ reply: z.string().trim().max(2000) }).parse(req.body);
  const review = await findOwned(Review, ctx(req).shop, req.params.id, 'Review');
  review.reply = reply;
  review.repliedAt = reply ? new Date() : undefined;
  review.status = reply ? 'replied' : 'new';
  await review.save();
  res.json(review);
});

reviewsRouter.post('/:id/suggest-reply', async (req, res) => {
  const { shop } = ctx(req);
  const review = await findOwned(Review, shop, req.params.id, 'Review');
  const [customer, shopDoc] = await Promise.all([
    review.customer ? Customer.findById(review.customer).select('firstName').lean() : null,
    Shop.findById(shop).select('name').lean(),
  ]);
  const firstName = customer?.firstName ?? (review.author ?? '').trim().split(/\s+/)[0] ?? '';
  res.json({ suggestions: reviewReplySuggestions({ rating: review.rating, comment: review.comment ?? '', firstName, shopName: shopDoc?.name ?? 'our shop' }) });
});

reviewsRouter.post('/request', async (req, res) => {
  const body = z.object({ customer: objectId, job: objectId.optional(), channel: z.enum(['sms', 'email']).default('sms') }).parse(req.body);
  const { shop, user } = ctx(req);
  const customer = await Customer.findOne({ _id: body.customer, shop });
  if (!customer) throw notFound('Customer');
  if (body.job && !(await Job.exists({ _id: body.job, shop }))) throw notFound('Job');
  const shopDoc = await Shop.findById(shop).select('name').lean();
  const request = await ReviewRequest.create({ shop, customer: customer._id, job: body.job, token: nanoid(24) });
  const link = `${config.publicAppUrl}/review/${request.token}`;
  await sendMessage({
    shop,
    customer,
    job: body.job,
    channel: body.channel,
    subject: `How did we do, ${customer.firstName}?`,
    body: `Hi ${customer.firstName}, thanks for choosing ${shopDoc?.name ?? 'us'}! How did we do? It takes 20 seconds: ${link}`,
    by: user,
  });
  res.status(201).json(request);
});

/* ---------------- AI insights ---------------- */

aiInsightsRouter.get('/', requireFeature('ai_insights'), async (req, res) => {
  res.json(await buildInsights(ctx(req).shop));
});

/* ---------------- Message reply suggestions ---------------- */

messageSuggestRouter.post('/suggest', async (req, res) => {
  const { customer: customerId } = z.object({ customer: objectId }).parse(req.body);
  const { shop } = ctx(req);
  const customer = await Customer.findOne({ _id: customerId, shop }).lean();
  if (!customer) throw notFound('Customer');
  const [lastInbound, shopDoc, job] = await Promise.all([
    Message.findOne({ shop, customer: customerId, direction: 'inbound' }).sort({ createdAt: -1 }).lean(),
    Shop.findById(shop).select('name slug timezone').lean(),
    Job.findOne({ shop, customer: customerId, stage: { $ne: 'cancelled' } }).sort({ scheduledStart: -1, createdAt: -1 }).select('stage scheduledStart portalToken').lean(),
  ]);
  const { intent, suggestions } = messageSuggestions({
    message: lastInbound?.body ?? '',
    firstName: customer.firstName,
    shopName: shopDoc?.name ?? 'our shop',
    bookingLink: shopDoc ? bookingLink(shopDoc.slug) : '',
    portalLink: job?.portalToken ? portalLink(job.portalToken) : undefined,
    jobStage: job?.stage,
    nextAppointment:
      job?.scheduledStart && job.scheduledStart > new Date()
        ? job.scheduledStart.toLocaleString('en-US', { timeZone: shopDoc?.timezone ?? 'UTC', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : undefined,
  });
  res.json({ intent, suggestions, basedOn: lastInbound?.body ?? null });
});
