import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { nanoid } from 'nanoid';
import { ObjectId, lineItemSchema, shopRef, totalsSchema, jsonOptions } from './common.js';
import { computeTotals } from '../lib/money.js';

const quoteSchema = new Schema(
  {
    shop: shopRef,
    number: { type: Number, required: true },
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    vehicle: { type: ObjectId, ref: 'Vehicle' },
    job: { type: ObjectId, ref: 'Job' },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    items: { type: [lineItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    totals: { type: totalsSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'approved', 'declined', 'expired'],
      default: 'draft',
      index: true,
    },
    validUntil: Date,
    notes: { type: String, default: '' },
    publicToken: { type: String, unique: true, default: () => nanoid(24) },
    sentAt: Date,
    approvedAt: Date,
    declinedAt: Date,
    signatureName: { type: String, default: '' },
    aiGenerated: { type: Boolean, default: false },
    copilotPrompt: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);

quoteSchema.index({ shop: 1, number: 1 }, { unique: true });
quoteSchema.index({ shop: 1, createdAt: -1 });

quoteSchema.pre('save', function (this: QuoteDoc) {
  this.totals = computeTotals(this.items, this.discount ?? 0, this.taxRate ?? 0);
});

export type QuoteAttrs = InferSchemaType<typeof quoteSchema>;
export type QuoteDoc = HydratedDocument<QuoteAttrs>;
export const Quote = model('Quote', quoteSchema);
