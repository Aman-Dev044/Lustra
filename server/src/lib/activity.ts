import type { Types } from 'mongoose';
import { ActivityLog, Notification } from '../models/misc.js';
import { emitToShop } from './realtime.js';

type Id = Types.ObjectId | string;

export async function logActivity(input: {
  shop: Id;
  actor?: Id | null;
  action: string;
  entityType: string;
  entityId?: Id | null;
  summary: string;
}): Promise<void> {
  try {
    await ActivityLog.create({ ...input, actor: input.actor ?? undefined, entityId: input.entityId ?? undefined });
  } catch (err) {
    console.error('activity log failed', err);
  }
}

export async function notify(input: {
  shop: Id;
  user?: Id | null;
  title: string;
  body?: string;
  link?: string;
  kind?: 'info' | 'success' | 'warning' | 'booking' | 'payment';
}): Promise<void> {
  try {
    const n = await Notification.create({ ...input, user: input.user ?? null });
    emitToShop(input.shop, 'notification', { ...n.toJSON(), read: false });
  } catch (err) {
    console.error('notification failed', err);
  }
}
