import type { Types } from 'mongoose';
import { Counter } from '../models/misc.js';

const OFFSET = { job: 1000, quote: 2000, invoice: 3000, order: 5000 } as const;
export type CounterKey = keyof typeof OFFSET;

/** Atomically allocate the next per-shop number: jobs start at 1001, quotes 2001, invoices 3001. */
export async function nextNumber(shop: Types.ObjectId | string, key: CounterKey): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { shop, key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return OFFSET[key] + (doc?.seq ?? 1);
}
