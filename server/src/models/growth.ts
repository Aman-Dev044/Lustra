import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ObjectId, SERVICE_CATEGORIES, shopRef, jsonOptions } from './common.js';

/* ---------- Calendar blocks (time off, meetings, blocked bays) ---------- */
const calendarBlockSchema = new Schema(
  {
    shop: shopRef,
    user: { type: ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    kind: { type: String, enum: ['time_off', 'meeting', 'blocked'], default: 'blocked' },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    bay: { type: Number, min: 1 },
    allDay: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
calendarBlockSchema.index({ shop: 1, start: 1, end: 1 });
export const CalendarBlock = model('CalendarBlock', calendarBlockSchema);

/* ---------- Coupons ---------- */
const couponSchema = new Schema(
  {
    shop: shopRef,
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minSpend: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, min: 1 },
    uses: { type: Number, default: 0, min: 0 },
    expiresAt: Date,
    active: { type: Boolean, default: true },
    categories: { type: [{ type: String, enum: SERVICE_CATEGORIES }], default: [] },
  },
  { timestamps: true, toJSON: jsonOptions },
);
couponSchema.index({ shop: 1, code: 1 }, { unique: true });
export type CouponAttrs = InferSchemaType<typeof couponSchema>;
export type CouponDoc = HydratedDocument<CouponAttrs>;
export const Coupon = model('Coupon', couponSchema);

/* ---------- Gift cards ---------- */
const giftCardSchema = new Schema(
  {
    shop: shopRef,
    code: { type: String, required: true, unique: true, uppercase: true },
    initialBalance: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    customer: { type: ObjectId, ref: 'Customer' },
    recipientName: { type: String, default: '' },
    recipientEmail: { type: String, default: '', lowercase: true, trim: true },
    message: { type: String, default: '' },
    expiresAt: Date,
    status: { type: String, enum: ['active', 'depleted', 'void'], default: 'active' },
    transactions: [
      {
        at: { type: Date, default: () => new Date() },
        amount: { type: Number, required: true },
        invoice: { type: ObjectId, ref: 'Invoice' },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const GiftCard = model('GiftCard', giftCardSchema);

/* ---------- Lead forms ---------- */
export const FORM_FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'vehicle', 'services', 'date', 'checkbox'] as const;
const leadFormSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    fields: [
      {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        type: { type: String, enum: FORM_FIELD_TYPES, default: 'text' },
        required: { type: Boolean, default: false },
        options: { type: [String], default: [] },
      },
    ],
    submitLabel: { type: String, default: 'Request a quote' },
    successMessage: { type: String, default: 'Thanks! We will be in touch shortly with your quote.' },
    createJob: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    submissions: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: jsonOptions },
);
leadFormSchema.index({ shop: 1, slug: 1 }, { unique: true });
export const LeadForm = model('LeadForm', leadFormSchema);

/* ---------- Documents ---------- */
const documentSchema = new Schema(
  {
    shop: shopRef,
    customer: { type: ObjectId, ref: 'Customer', index: true },
    job: { type: ObjectId, ref: 'Job', index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true },
    mime: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    category: { type: String, enum: ['waiver', 'contract', 'photo', 'receipt', 'warranty', 'other'], default: 'other' },
    uploadedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
documentSchema.index({ shop: 1, createdAt: -1 });
export const DocumentFile = model('Document', documentSchema);

/* ---------- Integrations & developer platform ---------- */
export const PROVIDERS = ['quickbooks', 'stripe', 'square', 'zapier', 'google', 'twilio', 'carfax', 'mailchimp'] as const;
export type Provider = (typeof PROVIDERS)[number];
const integrationSchema = new Schema(
  {
    shop: shopRef,
    provider: { type: String, enum: PROVIDERS, required: true },
    status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
    connectedAt: Date,
    account: { type: String, default: '' },
    lastSyncAt: Date,
    log: [{ _id: false, at: { type: Date, default: () => new Date() }, message: String }],
  },
  { timestamps: true, toJSON: jsonOptions },
);
integrationSchema.index({ shop: 1, provider: 1 }, { unique: true });
export const Integration = model('Integration', integrationSchema);

const apiKeySchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 120 },
    prefix: { type: String, required: true },
    hash: { type: String, required: true, unique: true, select: false },
    lastUsedAt: Date,
    createdBy: { type: ObjectId, ref: 'User' },
    revokedAt: Date,
  },
  { timestamps: true, toJSON: { ...jsonOptions, transform: (_d: unknown, ret: Record<string, unknown>) => { delete ret.hash; return ret; } } },
);
export const ApiKey = model('ApiKey', apiKeySchema);

const webhookSchema = new Schema(
  {
    shop: shopRef,
    url: { type: String, required: true, trim: true },
    events: { type: [String], default: [] },
    secret: { type: String, required: true },
    active: { type: Boolean, default: true },
    deliveries: [
      {
        _id: false,
        at: { type: Date, default: () => new Date() },
        event: String,
        status: { type: String, enum: ['success', 'failed'] },
        code: Number,
        durationMs: Number,
      },
    ],
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const Webhook = model('Webhook', webhookSchema);

/* ---------- Marketplace ---------- */
export const MARKETPLACE_CATEGORIES = ['ceramic', 'ppf', 'tint', 'chemicals', 'tools', 'towels', 'wrap'] as const;
const productSchema = new Schema(
  {
    vendor: { type: String, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, enum: MARKETPLACE_CATEGORIES, required: true },
    price: { type: Number, required: true, min: 0 },
    memberPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'each' },
    rating: { type: Number, default: 4.7, min: 0, max: 5 },
    description: { type: String, default: '' },
    badge: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const MarketplaceProduct = model('MarketplaceProduct', productSchema);

const supplyOrderSchema = new Schema(
  {
    shop: shopRef,
    number: { type: Number, required: true },
    items: [
      {
        _id: false,
        product: { type: ObjectId, ref: 'MarketplaceProduct' },
        sku: String,
        name: String,
        qty: { type: Number, min: 1 },
        price: Number,
      },
    ],
    subtotal: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['placed', 'shipped', 'delivered'], default: 'placed' },
    placedBy: { type: ObjectId, ref: 'User' },
    deliveredAt: Date,
  },
  { timestamps: true, toJSON: jsonOptions },
);
supplyOrderSchema.index({ shop: 1, number: 1 }, { unique: true });
export const SupplyOrder = model('SupplyOrder', supplyOrderSchema);

/* ---------- Campaigns ---------- */
export const SEGMENT_TYPES = ['all', 'tag', 'lapsed', 'due_maintenance', 'coating_anniversary', 'vip', 'members'] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];
const campaignSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 160 },
    channel: { type: String, enum: ['sms', 'email'], default: 'sms' },
    segment: {
      type: { type: String, enum: SEGMENT_TYPES, default: 'all' },
      value: Schema.Types.Mixed,
    },
    subject: { type: String, default: '' },
    body: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ['draft', 'sent'], default: 'draft' },
    sentAt: Date,
    stats: {
      recipients: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      booked: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const Campaign = model('Campaign', campaignSchema);

/* ---------- Reviews ---------- */
const reviewSchema = new Schema(
  {
    shop: shopRef,
    customer: { type: ObjectId, ref: 'Customer' },
    job: { type: ObjectId, ref: 'Job' },
    source: { type: String, enum: ['google', 'facebook', 'yelp', 'lustra'], default: 'lustra' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '', maxlength: 5000 },
    author: { type: String, default: '' },
    reply: { type: String, default: '' },
    repliedAt: Date,
    status: { type: String, enum: ['new', 'replied'], default: 'new' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
reviewSchema.index({ shop: 1, createdAt: -1 });
export const Review = model('Review', reviewSchema);

const reviewRequestSchema = new Schema(
  {
    shop: shopRef,
    customer: { type: ObjectId, ref: 'Customer', required: true },
    job: { type: ObjectId, ref: 'Job' },
    token: { type: String, required: true, unique: true },
    sentAt: { type: Date, default: () => new Date() },
    completedAt: Date,
    rating: Number,
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const ReviewRequest = model('ReviewRequest', reviewRequestSchema);
