import { Schema, model, type InferSchemaType } from 'mongoose';
import { ACTION_TYPES, ObjectId, TRIGGERS, shopRef, jsonOptions } from './common.js';

/* ---------- Inventory ---------- */
const inventorySchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, default: '', trim: true },
    category: { type: String, default: 'Supplies', trim: true },
    unit: { type: String, default: 'unit' },
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: '' },
    location: { type: String, default: '' },
    adjustments: [
      {
        at: { type: Date, default: () => new Date() },
        delta: { type: Number, required: true },
        reason: { type: String, default: '' },
        by: { type: ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const InventoryItem = model('InventoryItem', inventorySchema);
export type InventoryAttrs = InferSchemaType<typeof inventorySchema>;

/* ---------- Time tracking ---------- */
const timeEntrySchema = new Schema(
  {
    shop: shopRef,
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    job: { type: ObjectId, ref: 'Job' },
    clockIn: { type: Date, required: true },
    clockOut: Date,
    minutes: { type: Number, default: 0 },
    tips: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
timeEntrySchema.index({ shop: 1, clockIn: -1 });
export const TimeEntry = model('TimeEntry', timeEntrySchema);

/* ---------- Automations ---------- */
const automationSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    trigger: { type: String, enum: TRIGGERS, required: true },
    conditions: [
      {
        _id: false,
        field: { type: String, required: true },
        op: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'contains'], default: 'eq' },
        value: Schema.Types.Mixed,
      },
    ],
    actions: [
      {
        _id: false,
        type: { type: String, enum: ACTION_TYPES, required: true },
        config: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    runs: { type: Number, default: 0 },
    lastRunAt: Date,
    templateKey: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions, minimize: false },
);
export const Automation = model('Automation', automationSchema);
export type AutomationAttrs = InferSchemaType<typeof automationSchema>;

const scheduledActionSchema = new Schema(
  {
    shop: shopRef,
    automation: { type: ObjectId, ref: 'Automation', required: true },
    actionIndex: { type: Number, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    runAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending', index: true },
  },
  { timestamps: true, minimize: false },
);
export const ScheduledAction = model('ScheduledAction', scheduledActionSchema);

/* ---------- Messaging ---------- */
const messageSchema = new Schema(
  {
    shop: shopRef,
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    job: { type: ObjectId, ref: 'Job' },
    direction: { type: String, enum: ['outbound', 'inbound'], default: 'outbound' },
    channel: { type: String, enum: ['sms', 'email', 'note'], default: 'sms' },
    subject: { type: String, default: '' },
    body: { type: String, required: true, maxlength: 5000 },
    status: { type: String, enum: ['queued', 'sent', 'delivered', 'failed', 'received'], default: 'sent' },
    automation: { type: ObjectId, ref: 'Automation' },
    readAt: Date,
    by: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
messageSchema.index({ shop: 1, createdAt: -1 });
export const Message = model('Message', messageSchema);

/* ---------- Warranty certificates ---------- */
const certificateSchema = new Schema(
  {
    shop: shopRef,
    code: { type: String, required: true, unique: true, uppercase: true },
    customer: { type: ObjectId, ref: 'Customer', required: true },
    vehicle: { type: ObjectId, ref: 'Vehicle', required: true },
    job: { type: ObjectId, ref: 'Job' },
    product: { type: String, required: true, trim: true },
    coverage: { type: String, default: '' },
    installedAt: { type: Date, default: () => new Date() },
    expiresAt: Date,
    installer: { type: ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'expired', 'void'], default: 'active' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const Certificate = model('Certificate', certificateSchema);

/* ---------- Memberships ---------- */
const membershipPlanSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    interval: { type: String, enum: ['month', 'year'], default: 'month' },
    perks: { type: [String], default: [] },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    color: { type: String, default: '#7c5cff' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const MembershipPlan = model('MembershipPlan', membershipPlanSchema);

const membershipSchema = new Schema(
  {
    shop: shopRef,
    plan: { type: ObjectId, ref: 'MembershipPlan', required: true },
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    vehicle: { type: ObjectId, ref: 'Vehicle' },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    startedAt: { type: Date, default: () => new Date() },
    nextBillingAt: Date,
    washesUsed: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const Membership = model('Membership', membershipSchema);

/* ---------- Notifications, activity, leads, counters ---------- */
const notificationSchema = new Schema(
  {
    shop: shopRef,
    user: { type: ObjectId, ref: 'User', default: null },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    kind: { type: String, enum: ['info', 'success', 'warning', 'booking', 'payment'], default: 'info' },
    readBy: [{ type: ObjectId, ref: 'User' }],
  },
  { timestamps: true, toJSON: jsonOptions },
);
notificationSchema.index({ shop: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);

const activitySchema = new Schema(
  {
    shop: shopRef,
    actor: { type: ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: ObjectId },
    summary: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
activitySchema.index({ shop: 1, createdAt: -1 });
export const ActivityLog = model('ActivityLog', activitySchema);

const leadSchema = new Schema(
  {
    shop: { type: ObjectId, ref: 'Shop' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    message: { type: String, default: '' },
    source: { type: String, enum: ['contact', 'demo', 'visualizer', 'newsletter'], default: 'contact' },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON: jsonOptions },
);
export const Lead = model('Lead', leadSchema);

const counterSchema = new Schema({
  shop: { type: ObjectId, ref: 'Shop', required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
counterSchema.index({ shop: 1, key: 1 }, { unique: true });
export const Counter = model('Counter', counterSchema);
