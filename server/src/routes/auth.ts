import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { emailField } from '../lib/validate.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { INDUSTRIES } from '../models/common.js';
import { clearAuthCookie, ctx, requireAuth, setAuthCookie, signToken } from '../lib/auth.js';
import { conflict, notFound, unauthorized } from '../lib/errors.js';
import { provisionShop, uniqueShopSlug } from '../lib/provision.js';
import { logActivity } from '../lib/activity.js';

export const authRouter = Router();

const AVATAR_COLORS = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f97316', '#a78bfa'];
export const randomAvatarColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

const registerBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailField,
  password: z.string().min(8).max(200),
  shopName: z.string().trim().min(2).max(120),
  industry: z.enum(INDUSTRIES).default('detailing'),
  phone: z.string().trim().max(40).optional(),
  plan: z.enum(['express', 'pro', 'enterprise']).optional(),
});

authRouter.post('/register', async (req, res) => {
  const body = registerBody.parse(req.body);
  if (await User.exists({ email: body.email })) throw conflict('An account with that email already exists');

  const shop = await Shop.create({
    name: body.shopName,
    slug: await uniqueShopSlug(body.shopName),
    industry: body.industry,
    phone: body.phone ?? '',
    email: body.email,
    plan: body.plan ?? 'pro',
    trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
  });
  let user;
  try {
    user = await User.create({
      shop: shop._id,
      name: body.name,
      email: body.email,
      phone: body.phone ?? '',
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'owner',
      avatarColor: randomAvatarColor(),
      lastLoginAt: new Date(),
    });
  } catch (err) {
    await Shop.deleteOne({ _id: shop._id });
    throw err;
  }
  await provisionShop(shop._id, body.industry);
  await logActivity({ shop: shop._id, actor: user._id, action: 'shop.created', entityType: 'shop', entityId: shop._id, summary: `${shop.name} joined Lustra` });

  setAuthCookie(res, signToken({ userId: String(user._id), shopId: String(shop._id), role: 'owner' }));
  res.status(201).json({ user: user.toJSON(), shop: shop.toJSON() });
});

const loginBody = z.object({ email: emailField, password: z.string().min(1).max(200) });

authRouter.post('/login', async (req, res) => {
  const body = loginBody.parse(req.body);
  const user = await User.findOne({ email: body.email }).select('+passwordHash');
  if (!user || !user.active || !(await bcrypt.compare(body.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }
  const shop = await Shop.findById(user.shop);
  if (!shop) throw unauthorized('Invalid email or password');
  user.lastLoginAt = new Date();
  await user.save();

  setAuthCookie(res, signToken({ userId: String(user._id), shopId: String(shop._id), role: user.role }));
  res.json({ user: user.toJSON(), shop: shop.toJSON() });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { userId, shopId } = ctx(req);
  const [user, shop] = await Promise.all([User.findById(userId), Shop.findById(shopId)]);
  if (!user || !user.active || !shop) {
    clearAuthCookie(res);
    throw unauthorized();
  }
  res.json({ user: user.toJSON(), shop: shop.toJSON() });
});

const meBody = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  password: z.string().min(8).max(200).optional(),
  currentPassword: z.string().optional(),
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const body = meBody.parse(req.body);
  const user = await User.findById(ctx(req).userId).select('+passwordHash');
  if (!user) throw notFound('User');
  if (body.name) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone;
  if (body.avatarColor) user.avatarColor = body.avatarColor;
  if (body.password) {
    if (body.currentPassword !== undefined && !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw unauthorized('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(body.password, 10);
  }
  await user.save();
  res.json(user.toJSON());
});
