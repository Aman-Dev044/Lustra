import type { Model, Types } from 'mongoose';
import { notFound } from './errors.js';

/** Load a tenant-scoped document or throw 404. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findOwned<M extends Model<any>>(model: M, shop: Types.ObjectId | string, id: string | string[], what: string) {
  const doc = await model.findOne({ _id: String(id), shop });
  if (!doc) throw notFound(what);
  return doc as ReturnType<M['hydrate']>;
}

export const CUSTOMER_FIELDS = 'firstName lastName email phone tags loyaltyPoints lifetimeValue';
export const VEHICLE_FIELDS = 'year make model trim color type size plate vin';
export const USER_FIELDS = 'name email role avatarColor';

/** Remove keys whose value is undefined so `$set` doesn't clobber fields. */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
