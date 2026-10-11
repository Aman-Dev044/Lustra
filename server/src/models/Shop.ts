import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { INDUSTRIES, jsonOptions } from './common.js';

const workingHourSchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, default: '08:00' },
    close: { type: String, default: '18:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

export const defaultWorkingHours = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: day === 6 ? '09:00' : '08:00',
    close: day === 6 ? '15:00' : '18:00',
    closed: day === 0,
  }));

const shopSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industry: { type: String, enum: INDUSTRIES, default: 'detailing' },
    phone: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    timezone: { type: String, default: 'America/New_York' },
    currency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0, min: 0, max: 50 },
    logoUrl: { type: String, default: '' },
    brandColor: { type: String, default: '#ff6a2b' },
    plan: { type: String, enum: ['express', 'pro', 'enterprise'], default: 'pro' },
    planInterval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    addOns: { visualizer: { type: Boolean, default: false } },
    trialEndsAt: Date,
    booking: {
      enabled: { type: Boolean, default: true },
      headline: { type: String, default: 'Book your appointment in seconds' },
      leadTimeHours: { type: Number, default: 12, min: 0 },
      slotMinutes: { type: Number, default: 30, min: 15, max: 240 },
      bays: { type: Number, default: 2, min: 1, max: 50 },
      requireDeposit: { type: Boolean, default: false },
      depositPercent: { type: Number, default: 20, min: 0, max: 100 },
      workingHours: { type: [workingHourSchema], default: defaultWorkingHours },
    },
    locations: [{ name: { type: String, required: true }, address: { type: String, default: '' } }],
    loyalty: {
      enabled: { type: Boolean, default: false },
      pointsPerDollar: { type: Number, default: 1 },
      redeemValue: { type: Number, default: 0.05 },
    },
    onboarding: { completedSteps: { type: [String], default: [] } },
    depot: {
      address: { type: String, default: '' },
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    credits: { type: Number, default: 0, min: 0 },
    googleReviewUrl: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);

export type ShopAttrs = InferSchemaType<typeof shopSchema>;
export type ShopDoc = HydratedDocument<ShopAttrs>;
export const Shop = model('Shop', shopSchema);
