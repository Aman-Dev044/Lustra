import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/lustra'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-insecure-secret'),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  publicAppUrl: process.env.PUBLIC_APP_URL ?? process.env.CLIENT_URL ?? 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  cookieName: 'lustra_token',
  tokenTtlDays: 7,
  isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
};
