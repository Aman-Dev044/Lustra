import { Schema, model, type InferSchemaType } from 'mongoose';
import { ObjectId, VEHICLE_SIZES, VEHICLE_TYPES, shopRef, jsonOptions } from './common.js';

const vehicleSchema = new Schema(
  {
    shop: shopRef,
    customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
    type: { type: String, enum: VEHICLE_TYPES, default: 'car' },
    year: { type: Number, min: 1900, max: 2100 },
    make: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    trim: { type: String, default: '', trim: true },
    color: { type: String, default: '', trim: true },
    vin: { type: String, default: '', uppercase: true, trim: true },
    plate: { type: String, default: '', uppercase: true, trim: true },
    size: { type: String, enum: VEHICLE_SIZES, default: 'medium' },
    notes: { type: String, default: '' },
  },
  { timestamps: true, toJSON: jsonOptions },
);
vehicleSchema.index({ shop: 1, createdAt: -1 });

export type VehicleAttrs = InferSchemaType<typeof vehicleSchema>;
export const Vehicle = model('Vehicle', vehicleSchema);
