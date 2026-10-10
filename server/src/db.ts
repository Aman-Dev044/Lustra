import mongoose from 'mongoose';
import { config } from './config.js';

mongoose.set('strictQuery', true);
// Query operator injection is prevented by zod-validating every query/body value into primitives
// (and Express 5's simple query parser), so mongoose's sanitizeFilter — which would also wrap our own
// $in/$gte operators — is intentionally not enabled.

export async function connectDb(uri = config.mongoUri): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function dbStatus(): 'up' | 'down' {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}
