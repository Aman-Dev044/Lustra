import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES, shopRef, jsonOptions } from './common.js';

const userSchema = new Schema(
  {
    shop: shopRef,
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'technician' },
    phone: { type: String, default: '' },
    avatarColor: { type: String, default: '#7c5cff' },
    hourlyRate: { type: Number, default: 0, min: 0 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true, toJSON: jsonOptions },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);
