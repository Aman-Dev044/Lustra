import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:8878';

/** Browser origins allowed to call the API and open sockets: CLIENT_URL plus comma-separated CORS_ORIGINS.
 *  "*" allows any origin (each request's origin is echoed back, so cookies still work). */
const corsOrigins = [
  ...new Set(
    [clientUrl, ...(process.env.CORS_ORIGINS ?? '').split(',')]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  ),
];

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8879),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/lustra'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-only-insecure-secret'),
  clientUrl,
  corsOrigins,
  corsAllowAll: corsOrigins.includes('*'),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? process.env.CLIENT_URL ?? 'http://localhost:8878',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  cookieName: 'lustra_token',
  tokenTtlDays: 7,
  isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',
};
