import { z } from 'zod';
import mongoose from 'mongoose';

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

/** Accepts ISO strings / timestamps and returns a Date; empty string or null → undefined. */
export const dateLike = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());

export const listQuery = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.string().max(60).optional(),
});
export type ListQuery = z.infer<typeof listQuery>;

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(q?: string): RegExp | undefined {
  return q ? new RegExp(escapeRegex(q), 'i') : undefined;
}

/** Parse "-createdAt" / "name" into a mongoose sort object restricted to an allow-list. */
export function parseSort(
  sort: string | undefined,
  allowed: string[],
  fallback: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
  if (!sort) return fallback;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!allowed.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1 };
}

export function paged<T>(items: T[], total: number, q: ListQuery) {
  return { items, total, page: q.page, pageSize: q.pageSize };
}

/** Comma-separated list → string array (empty → undefined). */
export const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined));

/** Trimmed, lower-cased email. */
export const emailField = z.string().trim().toLowerCase().pipe(z.email());

/**
 * PATCH variant of an object schema: every field optional and defaults removed.
 * (zod 4's `.partial()` still applies `.default()` values, which would reset omitted fields.)
 */
export function patchSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      const inner = field instanceof z.ZodDefault ? field.unwrap() : field;
      return [key, (inner as z.ZodType).optional()];
    }),
  );
  return z.object(shape) as unknown as z.ZodObject<{ [K in keyof T]: z.ZodOptional<z.ZodType<z.output<T[K]> extends infer O ? Exclude<O, undefined> : never>> }>;
}

export const geoInput = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
