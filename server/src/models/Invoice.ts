import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { nanoid } from 'nanoid';
import { ObjectId, PAYMENT_METHODS, shopRef, jsonOptions } from './common.js';
import { computeTotals, round2 } from '../lib/money.js';

const invoiceItemSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '' },
  qty: { type: Number, default: 1, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
});

const paymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  tip: { type: Number, default: 0, min: 0 },
  method: { type: String, enum: PAYMENT_METHODS, default: 'card' },
  reference: { type: String, default: '' },
  at: { type: Date, default: () => new Date() },
  by: { type: ObjectId, ref: 'User' },
  giftCard: { type: String },
});

const invoiceSchema = new Schema(
  {
    shop: shopRef,
    number: { type: Number, required: true },
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    job: { type: ObjectId, ref: 'Job' },
    items: { type: [invoiceItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    totals: {
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'partial', 'paid', 'void', 'overdue'],
      default: 'draft',
      index: true,
    },
    dueDate: Date,
    notes: { type: String, default: '' },
    publicToken: { type: String, unique: true, default: () => nanoid(24) },
    payments: { type: [paymentSchema], default: [] },
    sentAt: Date,
    paidAt: Date,
    coupon: { type: new Schema({ code: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } }, { _id: false }), default: undefined },
  },
  { timestamps: true, toJSON: jsonOptions },
);

invoiceSchema.index({ shop: 1, number: 1 }, { unique: true });
invoiceSchema.index({ shop: 1, createdAt: -1 });

/** Recompute totals and derive payment status (void stays void). */
invoiceSchema.pre('save', function (this: InvoiceDoc) {
  const base = computeTotals(this.items, (this.discount ?? 0) + (this.coupon?.amount ?? 0), this.taxRate ?? 0);
  const paid = round2(this.payments.reduce((s, p) => s + p.amount, 0));
  const tips = round2(this.payments.reduce((s, p) => s + (p.tip ?? 0), 0));
  const balance = round2(Math.max(0, base.total - paid));
  this.totals = { ...base, tips, paid, balance };
  if (this.status === 'void') return;
  if (base.total > 0 && balance === 0 && paid > 0) {
    this.status = 'paid';
    if (!this.paidAt) this.paidAt = new Date();
  } else if (paid > 0) {
    this.status = 'partial';
  } else if (this.status === 'paid' || this.status === 'partial') {
    this.status = this.sentAt ? 'sent' : 'draft';
  }
  if ((this.status === 'sent' || this.status === 'partial') && this.dueDate && this.dueDate < new Date() && balance > 0) {
    this.status = 'overdue';
  }
});

export type InvoiceAttrs = InferSchemaType<typeof invoiceSchema>;
export type InvoiceDoc = HydratedDocument<InvoiceAttrs>;
export const Invoice = model('Invoice', invoiceSchema);
