import { Schema, model, type InferSchemaType } from 'mongoose';
import { nanoid } from 'nanoid';
import { ObjectId, shopRef, jsonOptions } from './common.js';

const markerSchema = new Schema({
  view: { type: String, enum: ['top', 'left', 'right', 'front', 'rear'], default: 'top' },
  x: { type: Number, min: 0, max: 100, required: true },
  y: { type: Number, min: 0, max: 100, required: true },
  kind: { type: String, enum: ['scratch', 'dent', 'chip', 'swirl', 'crack', 'stain', 'other'], default: 'scratch' },
  severity: { type: Number, enum: [1, 2, 3], default: 1 },
  note: { type: String, default: '', maxlength: 500 },
});

const mediaSchema = new Schema({
  url: { type: String, required: true },
  kind: { type: String, enum: ['photo', 'video'], default: 'photo' },
  caption: { type: String, default: '', maxlength: 300 },
});

const inspectionSchema = new Schema(
  {
    shop: shopRef,
    job: { type: ObjectId, ref: 'Job', index: true },
    customer: { type: ObjectId, ref: 'Customer', required: true },
    vehicle: { type: ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['pre', 'post'], default: 'pre' },
    status: { type: String, enum: ['draft', 'awaiting_signature', 'signed'], default: 'draft' },
    markers: { type: [markerSchema], default: [] },
    media: { type: [mediaSchema], default: [] },
    notes: { type: String, default: '' },
    publicToken: { type: String, unique: true, default: () => nanoid(24) },
    signature: { name: { type: String, default: '' }, signedAt: Date },
  },
  { timestamps: true, toJSON: jsonOptions },
);
inspectionSchema.index({ shop: 1, createdAt: -1 });

export type InspectionAttrs = InferSchemaType<typeof inspectionSchema>;
export const Inspection = model('Inspection', inspectionSchema);
