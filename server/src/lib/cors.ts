import type { CorsOptions } from 'cors';
import { config } from '../config.js';

/** Shared CORS policy for Express and Socket.io, driven by CLIENT_URL + CORS_ORIGINS in .env. */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Same-origin / server-to-server requests (curl, the Next.js proxy) send no Origin header.
    if (!origin || config.corsAllowAll || config.corsOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
};
