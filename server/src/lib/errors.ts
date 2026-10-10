import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import multer from 'multer';

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PLAN_REQUIRED'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, 'VALIDATION', message, details);
export const unauthorized = (message = 'Please sign in to continue') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do that') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let code: ErrorCode = 'INTERNAL';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION';
    message = err.issues[0] ? `${err.issues[0].path.join('.') || 'input'}: ${err.issues[0].message}` : 'Invalid input';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'VALIDATION';
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION';
    message = Object.values(err.errors)[0]?.message ?? 'Invalid input';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = 'VALIDATION';
    message = err.message;
  } else if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    const field = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0];
    message = field ? `That ${field} is already in use` : 'Duplicate value';
  } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    status = 400;
    code = 'VALIDATION';
    message = 'Malformed JSON body';
  } else if (err && typeof err === 'object' && typeof (err as { status?: unknown }).status === 'number' && (err as { status: number }).status < 500) {
    // http-errors from body-parser / serve-static (413 payload too large, 404 missing upload, …)
    status = (err as { status: number }).status;
    code = status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'VALIDATION';
    message = status === 404 ? 'Not found' : (err as { expose?: boolean }).expose ? String((err as { message?: string }).message) : 'Request could not be processed';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message, code, ...(details !== undefined ? { details } : {}) } });
};
