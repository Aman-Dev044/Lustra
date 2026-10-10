import { Schema } from 'mongoose';

export const { ObjectId } = Schema.Types;

export const shopRef = { type: ObjectId, ref: 'Shop', required: true, index: true } as const;

export const INDUSTRIES = [
  'detailing', 'ceramic', 'ppf', 'tint', 'wrap', 'marine', 'landscaping', 'lawn-care', 'flat-glass', 'mobile',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const ROLES = ['owner', 'admin', 'manager', 'technician'] as const;
export type Role = (typeof ROLES)[number];

export const SERVICE_CATEGORIES = [
  'detailing', 'ceramic', 'ppf', 'tint', 'wrap', 'correction', 'interior', 'marine', 'lawn', 'maintenance', 'other',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const VEHICLE_TYPES = ['car', 'truck', 'suv', 'van', 'motorcycle', 'boat', 'rv', 'other'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export const VEHICLE_SIZES = ['small', 'medium', 'large', 'xl'] as const;
export type VehicleSize = (typeof VEHICLE_SIZES)[number];

export const JOB_STAGES = ['lead', 'quoted', 'scheduled', 'in_progress', 'quality_check', 'completed', 'cancelled'] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const CUSTOMER_SOURCES = [
  'website', 'referral', 'google', 'instagram', 'facebook', 'walk-in', 'booking', 'repeat', 'other',
] as const;

export const TRIGGERS = [
  'job.created', 'job.stage_changed', 'job.completed', 'quote.sent', 'quote.approved', 'invoice.paid',
  'invoice.overdue', 'booking.created', 'customer.created', 'inspection.signed', 'lead.created',
] as const;
export type Trigger = (typeof TRIGGERS)[number];

export const ACTION_TYPES = ['send_sms', 'send_email', 'notify_team', 'add_tag', 'update_stage', 'wait'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const PAYMENT_METHODS = ['card', 'cash', 'ach', 'check', 'financing', 'gift_card', 'other'] as const;

/** Optional { lat, lng } point; absent unless set. */
export const geoSchema = new Schema(
  { lat: { type: Number, min: -90, max: 90, required: true }, lng: { type: Number, min: -180, max: 180, required: true } },
  { _id: false },
);

export const totalsSchema = new Schema(
  {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false },
);

export const lineItemSchema = new Schema({
  service: { type: ObjectId, ref: 'Service' },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 2000 },
  category: { type: String, enum: SERVICE_CATEGORIES, default: 'other' },
  qty: { type: Number, default: 1, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  durationMinutes: { type: Number, default: 60, min: 0 },
  assignee: { type: ObjectId, ref: 'User' },
  scheduledStart: Date,
  scheduledEnd: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
  optional: { type: Boolean, default: false },
  selected: { type: Boolean, default: true },
});

/** Shared toJSON options: hide version key and never serialize password hashes. */
export const jsonOptions = {
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    return ret;
  },
};
