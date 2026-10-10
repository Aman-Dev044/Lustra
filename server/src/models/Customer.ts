import { Schema, model, type InferSchemaType } from 'mongoose';
import { CUSTOMER_SOURCES, geoSchema, shopRef, jsonOptions } from './common.js';

const customerSchema = new Schema(
  {
    shop: shopRef,
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, default: '', trim: true, maxlength: 80 },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '' },
    company: { type: String, default: '' },
    tags: { type: [String], default: [] },
    source: { type: String, enum: CUSTOMER_SOURCES, default: 'other' },
    notes: { type: String, default: '' },
    loyaltyPoints: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 },
    visits: { type: Number, default: 0 },
    marketingOptIn: { type: Boolean, default: true },
    lastVisitAt: Date,
    geo: { type: geoSchema, default: undefined },
  },
  {
    timestamps: true,
    toJSON: { ...jsonOptions, virtuals: true, id: false },
    toObject: { virtuals: true, id: false },
  },
);

customerSchema.virtual('fullName').get(function (this: { firstName: string; lastName?: string | null }) {
  return `${this.firstName} ${this.lastName ?? ''}`.trim();
});
customerSchema.index({ shop: 1, createdAt: -1 });
customerSchema.index({ shop: 1, email: 1 });
customerSchema.index({ shop: 1, phone: 1 });

export type CustomerAttrs = InferSchemaType<typeof customerSchema>;
export const Customer = model('Customer', customerSchema);
