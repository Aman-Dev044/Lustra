import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config.js';
import { forbidden, unauthorized } from './errors.js';
import type { Role } from '../models/common.js';
import { ApiKey } from '../models/growth.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { hasFeature, planRequiredError } from './plans.js';

export interface AuthContext {
  userId: string;
  shopId: string;
  role: Role;
  /** Set when the request was authenticated with an API key. */
  apiKey?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

interface TokenPayload {
  sub: string;
  shop: string;
  role: Role;
}

export function signToken(ctx: AuthContext): string {
  const payload: TokenPayload = { sub: ctx.userId, shop: ctx.shopId, role: ctx.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: `${config.tokenTtlDays}d` });
}

export function verifyToken(token: string): AuthContext | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (!decoded?.sub || !decoded.shop) return null;
    return { userId: decoded.sub, shopId: decoded.shop, role: decoded.role };
  } catch {
    return null;
  }
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.env === 'production',
  path: '/',
});

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, { ...cookieOptions(), maxAge: config.tokenTtlDays * 24 * 60 * 60 * 1000 });
}

/** Always safe to call: clears the cookie with the exact options it was set with. */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(config.cookieName, cookieOptions());
}

export function tokenFromRequest(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[config.cookieName];
}

/** Parse a raw Cookie header (used by socket.io handshakes). */
export function tokenFromCookieHeader(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === config.cookieName) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export const API_KEY_PREFIX = 'lx_live_';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Resolve `Bearer lx_live_…` API keys: they act as the shop owner and require the api_access feature. */
async function authenticateApiKey(key: string): Promise<AuthContext> {
  const apiKey = await ApiKey.findOne({ hash: hashApiKey(key), revokedAt: null });
  if (!apiKey) throw unauthorized('Invalid or revoked API key');
  const shop = await Shop.findById(apiKey.shop).select('plan addOns').lean();
  if (!shop) throw unauthorized('Invalid or revoked API key');
  if (!hasFeature(shop, 'api_access')) throw planRequiredError('api_access');
  const owner = await User.findOne({ shop: apiKey.shop, role: 'owner', active: true }).select('_id').lean();
  if (!owner) throw unauthorized('Shop owner account is inactive');
  // Throttle writes: only bump lastUsedAt once a minute.
  if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 60_000) {
    await ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } });
  }
  return { userId: String(owner._id), shopId: String(apiKey.shop), role: 'owner', apiKey: String(apiKey._id) };
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (token?.startsWith(API_KEY_PREFIX)) {
    req.auth = await authenticateApiKey(token);
    return next();
  }
  const ctx = token ? verifyToken(token) : null;
  if (!ctx) return next(unauthorized());
  req.auth = ctx;
  next();
};

const ROLE_RANK: Record<Role, number> = { technician: 0, manager: 1, admin: 2, owner: 3 };

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function requireRole(minimum: Role): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!hasRole(req.auth.role, minimum)) return next(forbidden());
    next();
  };
}

/** Auth context accessor for routes mounted behind requireAuth. */
export function ctx(req: Request): AuthContext & { shop: Types.ObjectId; user: Types.ObjectId } {
  if (!req.auth) throw unauthorized();
  return { ...req.auth, shop: new Types.ObjectId(req.auth.shopId), user: new Types.ObjectId(req.auth.userId) };
}
