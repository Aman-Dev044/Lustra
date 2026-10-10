import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { nanoid } from 'nanoid';
import { JOB_STAGES, ObjectId, geoSchema, lineItemSchema, shopRef, totalsSchema, jsonOptions } from './common.js';
import { computeTotals } from '../lib/money.js';

const timelineSchema = new Schema({
  at: { type: Date, default: () => new Date() },
  type: {
    type: String,
    enum: ['created', 'stage', 'note', 'payment', 'message', 'inspection', 'quote', 'system'],
    default: 'system',
  },
  message: { type: String, required: true, maxlength: 2000 },
  by: { type: ObjectId, ref: 'User' },
});

const checklistSchema = new Schema({
  label: { type: String, required: true, maxlength: 200 },
  done: { type: Boolean, default: false },
});

export const RECURRENCE_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'custom'] as const;

const recurrenceSchema = new Schema(
  {
    frequency: { type: String, enum: RECURRENCE_FREQUENCIES, required: true },
    intervalDays: { type: Number, min: 1, max: 730, required: true },
    endsAt: Date,
    parent: { type: ObjectId, ref: 'Job' },
    generatedNext: { type: Boolean, default: false },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    shop: shopRef,
    number: { type: Number, required: true },
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    vehicle: { type: ObjectId, ref: 'Vehicle' },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    stage: { type: String, enum: JOB_STAGES, default: 'lead', index: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'rush'], default: 'normal' },
    lineItems: { type: [lineItemSchema], default: [] },
    scheduledStart: Date,
    scheduledEnd: Date,
    bay: { type: Number, min: 1 },
    location: { type: ObjectId },
    assignees: [{ type: ObjectId, ref: 'User' }],
    notes: { type: String, default: '' },
    internalNotes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    source: { type: String, default: 'manual' },
    portalToken: { type: String, unique: true, default: () => nanoid(24) },
    timeline: { type: [timelineSchema], default: [] },
    checklist: { type: [checklistSchema], default: [] },
    quote: { type: ObjectId, ref: 'Quote' },
    invoice: { type: ObjectId, ref: 'Invoice' },
    totals: { type: totalsSchema, default: () => ({}) },
    taxRate: { type: Number, default: 0 },
    completedAt: Date,
    mobile: { type: Boolean, default: false },
    serviceAddress: { type: String, default: '' },
    geo: { type: geoSchema, default: undefined },
    routeOrder: Number,
    eta: Date,
    recurrence: { type: recurrenceSchema, default: undefined },
    leadForm: { type: ObjectId, ref: 'LeadForm', index: true },
  },
  { timestamps: true, toJSON: jsonOptions },
);

jobSchema.index({ shop: 1, number: 1 }, { unique: true });
jobSchema.index({ shop: 1, createdAt: -1 });
jobSchema.index({ shop: 1, scheduledStart: 1 });

jobSchema.pre('save', function (this: JobDoc) {
  this.totals = computeTotals(this.lineItems, 0, this.taxRate ?? 0);
  if (this.isModified('stage') && this.stage === 'completed' && !this.completedAt) this.completedAt = new Date();
});

export type JobAttrs = InferSchemaType<typeof jobSchema>;
export type JobDoc = HydratedDocument<JobAttrs>;
export const Job = model('Job', jobSchema);
