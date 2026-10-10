import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { emailField, patchSchema } from '../lib/validate.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { INDUSTRIES, ROLES } from '../models/common.js';
import { ctx, requireRole } from '../lib/auth.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { logActivity } from '../lib/activity.js';
import { randomAvatarColor } from './auth.js';

export const shopRouter = Router();
export const teamRouter = Router();

const time = z.string().regex(/^\d{2}:\d{2}$/);
const shopPatch = z
  .object({
    name: z.string().trim().min(2).max(120),
    industry: z.enum(INDUSTRIES),
    phone: z.string().max(40),
    email: z.union([z.email(), z.literal('')]),
    website: z.string().max(200),
    address: z.string().max(300),
    timezone: z.string().max(60),
    currency: z.string().length(3),
    taxRate: z.number().min(0).max(50),
    logoUrl: z.string().max(500),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    booking: z
      .object({
        enabled: z.boolean(),
        headline: z.string().max(200),
        leadTimeHours: z.number().min(0).max(720),
        slotMinutes: z.number().int().min(15).max(240),
        bays: z.number().int().min(1).max(50),
        requireDeposit: z.boolean(),
        depositPercent: z.number().min(0).max(100),
        workingHours: z.array(z.object({ day: z.number().int().min(0).max(6), open: time, close: time, closed: z.boolean() })).length(7),
      })
      .partial(),
    locations: z.array(z.object({ _id: z.string().optional(), name: z.string().min(1).max(120), address: z.string().max(300).default('') })),
    loyalty: z.object({ enabled: z.boolean(), pointsPerDollar: z.number().min(0), redeemValue: z.number().min(0) }).partial(),
    onboarding: z.object({ completedSteps: z.array(z.string().max(60)) }),
    depot: z.object({ address: z.string().max(300).default(''), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    googleReviewUrl: z.union([z.url().max(500), z.literal('')]),
  })
  .partial();

shopRouter.get('/', async (req, res) => {
  const shop = await Shop.findById(ctx(req).shopId);
  if (!shop) throw notFound('Shop');
  res.json(shop.toJSON());
});

shopRouter.patch('/', requireRole('admin'), async (req, res) => {
  const body = shopPatch.parse(req.body);
  const { shopId, userId } = ctx(req);
  const shop = await Shop.findById(shopId);
  if (!shop) throw notFound('Shop');
  const { booking, loyalty, ...rest } = body;
  shop.set(rest);
  if (booking) shop.set('booking', { ...shop.toObject().booking, ...booking });
  if (loyalty) shop.set('loyalty', { ...shop.toObject().loyalty, ...loyalty });
  await shop.save();
  await logActivity({ shop: shopId, actor: userId, action: 'shop.updated', entityType: 'shop', entityId: shopId, summary: 'Shop settings updated' });
  res.json(shop.toJSON());
});

const planBody = z.object({
  plan: z.enum(['express', 'pro', 'enterprise']),
  planInterval: z.enum(['monthly', 'yearly']).default('monthly'),
  addOns: z.object({ visualizer: z.boolean() }).partial().optional(),
});

/** Simulated billing: switches plan immediately. Replace with Stripe Checkout/Billing Portal to go live. */
shopRouter.patch('/plan', requireRole('owner'), async (req, res) => {
  const body = planBody.parse(req.body);
  const { shopId, userId } = ctx(req);
  const shop = await Shop.findById(shopId);
  if (!shop) throw notFound('Shop');
  shop.plan = body.plan;
  shop.planInterval = body.planInterval;
  if (body.addOns?.visualizer !== undefined) shop.set('addOns.visualizer', body.addOns.visualizer);
  await shop.save();
  await logActivity({ shop: shopId, actor: userId, action: 'shop.plan_changed', entityType: 'shop', entityId: shopId, summary: `Plan changed to ${body.plan} (${body.planInterval})` });
  res.json(shop.toJSON());
});

/* ---------------- Team ---------------- */

const memberBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailField,
  role: z.enum(ROLES).exclude(['owner']).default('technician'),
  password: z.string().min(8).max(200),
  phone: z.string().max(40).optional(),
  hourlyRate: z.number().min(0).max(1000).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
});

teamRouter.get('/', async (req, res) => {
  const users = await User.find({ shop: ctx(req).shopId }).sort({ active: -1, name: 1 });
  res.json(users.map((u) => u.toJSON()));
});

teamRouter.post('/', requireRole('admin'), async (req, res) => {
  const body = memberBody.parse(req.body);
  const { shopId, userId } = ctx(req);
  if (await User.exists({ email: body.email })) throw conflict('An account with that email already exists');
  const { password, ...rest } = body;
  const user = await User.create({ ...rest, shop: shopId, passwordHash: await bcrypt.hash(password, 10), avatarColor: randomAvatarColor() });
  await logActivity({ shop: shopId, actor: userId, action: 'team.added', entityType: 'user', entityId: user._id, summary: `${user.name} joined the team` });
  res.status(201).json(user.toJSON());
});

const memberPatch = patchSchema(memberBody.omit({ email: true, password: true })).extend({
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

teamRouter.patch('/:id', requireRole('admin'), async (req, res) => {
  const body = memberPatch.parse(req.body);
  const { shopId } = ctx(req);
  const user = await User.findOne({ _id: req.params.id, shop: shopId }).select('+passwordHash');
  if (!user) throw notFound('Team member');
  if (user.role === 'owner' && (body.role || body.active === false)) throw forbidden('The owner role cannot be changed');
  const { password, ...rest } = body;
  user.set(rest);
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json(user.toJSON());
});

teamRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const { shopId, userId } = ctx(req);
  const user = await User.findOne({ _id: req.params.id, shop: shopId });
  if (!user) throw notFound('Team member');
  if (user.role === 'owner') throw forbidden('The owner cannot be removed');
  if (String(user._id) === userId) throw forbidden('You cannot deactivate yourself');
  user.active = false;
  await user.save();
  res.json(user.toJSON());
});
