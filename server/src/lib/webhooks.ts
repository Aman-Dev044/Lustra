import { createHmac, randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { Webhook } from '../models/growth.js';
import { Job } from '../models/Job.js';
import { Invoice } from '../models/Invoice.js';
import { Quote } from '../models/Quote.js';
import { Customer } from '../models/Customer.js';
import { TRIGGERS } from '../models/common.js';

type Id = Types.ObjectId | string;

export const WEBHOOK_EVENTS = [...TRIGGERS, 'job.updated', 'invoice.created'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const SIGNATURE_HEADER = 'X-Lustra-Signature';
const TIMEOUT_MS = 5_000;
const KEEP_DELIVERIES = 20;

export const newWebhookSecret = () => `whsec_${randomBytes(24).toString('hex')}`;

/** `sha256=<hex hmac(secret, rawBody)>` — receivers recompute this over the exact raw request body. */
export function signPayload(secret: string, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

export interface DeliveryResult {
  at: Date;
  event: string;
  status: 'success' | 'failed';
  code: number;
  durationMs: number;
  error?: string;
}

/** POST one signed delivery and record it on the webhook (last 20 kept). */
export async function deliver(webhook: { _id: Id; url: string; secret: string }, event: string, data: unknown): Promise<DeliveryResult> {
  const body = JSON.stringify({ id: `evt_${nanoid(18)}`, event, createdAt: new Date().toISOString(), data });
  const started = Date.now();
  let code = 0;
  let error: string | undefined;
  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Lustra-Webhooks/1.0', [SIGNATURE_HEADER]: signPayload(webhook.secret, body) },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'manual',
    });
    code = res.status;
    await res.body?.cancel().catch(() => undefined);
  } catch (err) {
    error = err instanceof Error ? (err.name === 'TimeoutError' ? 'Timed out after 5s' : err.message) : 'Delivery failed';
  }
  const result: DeliveryResult = {
    at: new Date(),
    event,
    status: code >= 200 && code < 300 ? 'success' : 'failed',
    code,
    durationMs: Date.now() - started,
    ...(error ? { error } : {}),
  };
  const { error: _omit, ...stored } = result;
  await Webhook.updateOne({ _id: webhook._id }, { $push: { deliveries: { $each: [stored], $slice: -KEEP_DELIVERIES } } });
  return result;
}

interface EventPayload {
  jobId?: Id;
  invoiceId?: Id;
  quoteId?: Id;
  customerId?: Id;
  inspectionId?: Id;
  stage?: string;
  previousStage?: string;
}

async function loadData(payload: EventPayload) {
  const [job, invoice, quote, customer] = await Promise.all([
    payload.jobId ? Job.findById(payload.jobId).lean() : null,
    payload.invoiceId ? Invoice.findById(payload.invoiceId).lean() : null,
    payload.quoteId ? Quote.findById(payload.quoteId).lean() : null,
    payload.customerId ? Customer.findById(payload.customerId).select('-__v').lean() : null,
  ]);
  return {
    ...(job ? { job } : {}),
    ...(invoice ? { invoice } : {}),
    ...(quote ? { quote } : {}),
    ...(customer ? { customer } : {}),
    ...(payload.inspectionId ? { inspectionId: payload.inspectionId } : {}),
    ...(payload.stage ? { stage: payload.stage, previousStage: payload.previousStage } : {}),
  };
}

/**
 * Fan an event out to the shop's subscribed webhooks. Fire-and-forget: never throws.
 * Pass `data` for events that already have the document loaded, or an id payload to load lazily.
 */
export async function dispatchWebhooks(shopId: Id, event: WebhookEvent, input: { data?: unknown; payload?: EventPayload }): Promise<void> {
  try {
    const hooks = await Webhook.find({ shop: shopId, active: true, events: event }).select('url secret').lean();
    if (!hooks.length) return;
    const data = input.data ?? (await loadData(input.payload ?? {}));
    await Promise.all(hooks.map((h) => deliver(h, event, data)));
  } catch (err) {
    console.error('webhook dispatch failed', err);
  }
}
