import { Schema, model, type InferSchemaType } from 'mongoose';
import { SERVICE_CATEGORIES, shopRef, jsonOptions } from './common.js';

const serviceSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: SERVICE_CATEGORIES, default: 'other' },
    description: { type: String, default: '' },
    basePrice: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 60, min: 0 },
    sizeMultipliers: {
      small: { type: Number, default: 1 },
      medium: { type: Number, default: 1.15 },
      large: { type: Number, default: 1.3 },
      xl: { type: Number, default: 1.5 },
    },
    keywords: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    bookable: { type: Boolean, default: true },
    color: { type: String, default: '#7c5cff' },
  },
  { timestamps: true, toJSON: jsonOptions },
);

export type ServiceAttrs = InferSchemaType<typeof serviceSchema>;
export const Service = model('Service', serviceSchema);
