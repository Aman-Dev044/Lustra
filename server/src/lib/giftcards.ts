import type { Types } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { GiftCard } from '../models/growth.js';
import { badRequest } from './errors.js';
import { round2 } from './money.js';

const chunk = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 4);
export const newGiftCardCode = () => `GC-${chunk()}-${chunk()}`;

/**
 * Atomically deduct `amount` from a gift card (400 when unknown, expired, void or insufficient).
 * Returns the normalized code.
 */
export async function redeemGiftCard(
  shop: Types.ObjectId | string,
  rawCode: string,
  amount: number,
  invoice: Types.ObjectId | undefined,
  note: string,
): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const card = await GiftCard.findOne({ shop, code });
  if (!card || card.status === 'void') throw badRequest('Gift card not found');
  if (card.expiresAt && card.expiresAt < new Date()) throw badRequest('This gift card has expired');
  if (card.balance + 0.005 < amount) throw badRequest(`Insufficient gift card balance ($${card.balance.toFixed(2)} available)`);

  const updated = await GiftCard.findOneAndUpdate(
    { _id: card._id, balance: { $gte: amount - 0.005 }, status: 'active' },
    { $inc: { balance: -amount }, $push: { transactions: { amount: -amount, invoice, note, at: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!updated) throw badRequest('Insufficient gift card balance');
  if (round2(updated.balance) <= 0) {
    updated.balance = 0;
    updated.status = 'depleted';
    await updated.save();
  }
  return code;
}
