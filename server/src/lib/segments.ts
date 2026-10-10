import type { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Job } from '../models/Job.js';
import { Membership } from '../models/misc.js';
import type { SegmentType } from '../models/growth.js';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/** Customers who completed a job with a line item in `categories` between `fromDays` and `toDays` ago. */
async function completedWith(shop: Types.ObjectId, categories: string[], fromDays: number, toDays: number): Promise<Types.ObjectId[]> {
  const filter: Record<string, unknown> = {
    shop,
    stage: 'completed',
    completedAt: { $gte: daysAgo(toDays), $lte: daysAgo(fromDays) },
    'lineItems.category': { $in: categories },
  };
  return (await Job.distinct('customer', filter)) as Types.ObjectId[];
}

/**
 * Resolve a campaign segment to a Mongo filter over customers.
 * - lapsed: had a visit, but none in the last 90 days
 * - due_maintenance: ceramic coating 5–7 months ago, or a detail 30–45 days ago
 * - coating_anniversary: ceramic/PPF completed 1 year ago (±30 days)
 * - vip: top 10% by lifetime value
 * - members: active membership
 * - tag: has the tag `value`
 */
export async function segmentFilter(shop: Types.ObjectId, type: SegmentType, value?: unknown): Promise<Record<string, unknown>> {
  switch (type) {
    case 'tag':
      return { shop, tags: String(value ?? '') };
    case 'lapsed':
      return { shop, lastVisitAt: { $lt: daysAgo(90) } };
    case 'due_maintenance': {
      const [coated, detailed] = await Promise.all([
        completedWith(shop, ['ceramic'], 150, 213),
        completedWith(shop, ['detailing', 'interior', 'maintenance'], 30, 45),
      ]);
      return { shop, _id: { $in: [...coated, ...detailed] } };
    }
    case 'coating_anniversary':
      return { shop, _id: { $in: await completedWith(shop, ['ceramic', 'ppf'], 335, 395) } };
    case 'vip': {
      const spenders = await Customer.countDocuments({ shop, lifetimeValue: { $gt: 0 } });
      const top = Math.max(1, Math.ceil(spenders * 0.1));
      // Note: .distinct() would ignore .limit(), so select ids explicitly.
      const top10 = await Customer.find({ shop, lifetimeValue: { $gt: 0 } }).sort({ lifetimeValue: -1 }).limit(top).select('_id').lean();
      return { shop, _id: { $in: top10.map((c) => c._id) } };
    }
    case 'members':
      return { shop, _id: { $in: await Membership.distinct('customer', { shop, status: 'active' }) } };
    default:
      return { shop };
  }
}

/** Reachable recipients for a channel (opted-in with an address). */
export function reachable(filter: Record<string, unknown>, channel: 'sms' | 'email') {
  return { ...filter, marketingOptIn: { $ne: false }, [channel === 'sms' ? 'phone' : 'email']: { $nin: ['', null] } };
}
