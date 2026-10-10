import type { Types } from 'mongoose';
import { config } from '../config.js';
import { Message } from '../models/misc.js';
import { Job } from '../models/Job.js';
import { emitToShop } from './realtime.js';

type Id = Types.ObjectId | string;

const MONEY_KEYS = /(total|balance|paid|amount|price)$/i;

/** Render `{{path.to.value}}` placeholders against a context object. Unknown paths render as empty strings. */
export function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
      return undefined;
    }, context);
    if (value === undefined || value === null) return '';
    if (typeof value === 'number' && MONEY_KEYS.test(path)) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (value instanceof Date) return value.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    return String(value);
  });
}

export function portalLink(token: string): string {
  return `${config.publicAppUrl}/portal/${token}`;
}

export function bookingLink(slug: string): string {
  return `${config.publicAppUrl}/book/${slug}`;
}

/**
 * Simulated SMS/email delivery: the message is persisted and logged. Swap the body of `deliver`
 * for Twilio / SendGrid calls to go live.
 */
async function deliver(channel: 'sms' | 'email' | 'note', to: string, subject: string, body: string): Promise<'sent' | 'failed'> {
  if (!config.isTest && channel !== 'note') {
    console.log(`[messaging] ${channel.toUpperCase()} → ${to || '(no address)'}${subject ? ` | ${subject}` : ''}\n  ${body}`);
  }
  return 'sent';
}

export async function sendMessage(input: {
  shop: Id;
  customer: { _id: Id; email?: string | null; phone?: string | null };
  job?: Id | null;
  channel: 'sms' | 'email' | 'note';
  body: string;
  subject?: string;
  automation?: Id | null;
  by?: Id | null;
}) {
  const to = input.channel === 'email' ? input.customer.email ?? '' : input.customer.phone ?? '';
  const status = await deliver(input.channel, to, input.subject ?? '', input.body);
  const message = await Message.create({
    shop: input.shop,
    customer: input.customer._id,
    job: input.job ?? undefined,
    direction: 'outbound',
    channel: input.channel,
    subject: input.subject ?? '',
    body: input.body,
    status,
    automation: input.automation ?? undefined,
    by: input.by ?? undefined,
    readAt: new Date(),
  });
  if (input.job) {
    await Job.updateOne(
      { _id: input.job, shop: input.shop },
      { $push: { timeline: { type: 'message', message: `${input.channel.toUpperCase()} sent: ${input.body.slice(0, 140)}`, by: input.by ?? undefined } } },
    );
  }
  emitToShop(input.shop, 'message:new', message.toJSON());
  return message;
}
