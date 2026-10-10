import type { Types } from 'mongoose';
import { Coupon, type CouponDoc } from '../models/growth.js';
import { round2 } from './money.js';

export interface CouponCheck {
  valid: boolean;
  amount: number;
  coupon?: CouponDoc;
  reason?: string;
}

export interface CouponLine {
  category?: string | null;
  amount: number;
}

/**
 * Validate a coupon against a basket. Rules: active, not expired, under maxUses, subtotal ≥ minSpend,
 * and (when the coupon is category-restricted) at least one eligible line. Percent coupons apply to the
 * eligible subtotal; fixed coupons are capped at it.
 */
export async function checkCoupon(
  shop: Types.ObjectId | string,
  rawCode: string,
  basket: { subtotal: number; lines?: CouponLine[]; categories?: string[] },
): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await Coupon.findOne({ shop, code });
  if (!coupon) return { valid: false, amount: 0, reason: 'Coupon code not found' };
  if (!coupon.active) return { valid: false, amount: 0, coupon, reason: 'This coupon is no longer active' };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, amount: 0, coupon, reason: 'This coupon has expired' };
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) return { valid: false, amount: 0, coupon, reason: 'This coupon has reached its usage limit' };
  if (basket.subtotal < (coupon.minSpend ?? 0)) {
    return { valid: false, amount: 0, coupon, reason: `Requires a minimum spend of $${coupon.minSpend.toFixed(2)}` };
  }

  let eligible = basket.subtotal;
  const restricted = coupon.categories?.length ? new Set<string>(coupon.categories) : null;
  if (restricted) {
    if (basket.lines?.length) {
      eligible = basket.lines.filter((l) => l.category && restricted.has(l.category)).reduce((s, l) => s + l.amount, 0);
    } else if (basket.categories?.length) {
      eligible = basket.categories.some((c) => restricted.has(c)) ? basket.subtotal : 0;
    } else {
      eligible = 0;
    }
    if (eligible <= 0) return { valid: false, amount: 0, coupon, reason: `Only valid on ${[...restricted].join(', ')} services` };
  }

  const amount = round2(coupon.type === 'percent' ? (eligible * Math.min(coupon.value, 100)) / 100 : Math.min(coupon.value, eligible));
  return { valid: amount > 0, amount, coupon, ...(amount > 0 ? {} : { reason: 'Nothing to discount' }) };
}

/** Atomically consume one use (respecting maxUses). Returns false when the limit was hit concurrently. */
export async function consumeCoupon(couponId: Types.ObjectId): Promise<boolean> {
  const res = await Coupon.updateOne(
    { _id: couponId, $or: [{ maxUses: null }, { $expr: { $lt: ['$uses', '$maxUses'] } }] },
    { $inc: { uses: 1 } },
  );
  return res.modifiedCount === 1;
}

export async function releaseCoupon(shop: Types.ObjectId | string, code: string): Promise<void> {
  await Coupon.updateOne({ shop, code: code.toUpperCase(), uses: { $gt: 0 } }, { $inc: { uses: -1 } });
}
