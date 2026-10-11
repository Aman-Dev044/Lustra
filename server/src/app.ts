import express, { Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './lib/cors.js';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { dbStatus } from './db.js';
import { requireAuth } from './lib/auth.js';
import { AppError, errorHandler, notFoundHandler } from './lib/errors.js';
import { uploadRoot } from './lib/uploads.js';
import { authRouter } from './routes/auth.js';
import { shopRouter, teamRouter } from './routes/shop.js';
import { customersRouter } from './routes/customers.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { servicesRouter } from './routes/services.js';
import { jobsRouter } from './routes/jobs.js';
import { quotesRouter } from './routes/quotes.js';
import { invoicesRouter } from './routes/invoices.js';
import { inspectionsRouter } from './routes/inspections.js';
import { inventoryRouter } from './routes/inventory.js';
import { certificatesRouter } from './routes/certificates.js';
import { membershipsRouter } from './routes/memberships.js';
import { automationsRouter } from './routes/automations.js';
import { messagesRouter } from './routes/messages.js';
import { earningsRouter, timeRouter } from './routes/time.js';
import { activityRouter, analyticsRouter, notificationsRouter, searchRouter } from './routes/insights.js';
import { publicRouter } from './routes/public.js';
import { calendarRouter } from './routes/calendar.js';
import { routesRouter } from './routes/routing.js';
import { couponsRouter, giftCardsRouter } from './routes/promotions.js';
import { formsRouter } from './routes/forms.js';
import { documentsRouter } from './routes/documents.js';
import { apiKeysRouter, exportRouter, importRouter, integrationsRouter, webhooksRouter } from './routes/platform.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { aiInsightsRouter, campaignsRouter, messageSuggestRouter, reviewsRouter } from './routes/growth.js';

function limiter(windowMinutes: number, limit: number, opts: { failuresOnly?: boolean } = {}) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    // Brute-force protection counts only failed attempts, so normal sign-ins never lock anyone out.
    skipSuccessfulRequests: opts.failuresOnly ?? false,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests — please slow down and try again shortly')),
  });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Uploaded media is embedded by the web app on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '5mb' })); // imports send up to 5,000 rows
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  if (!config.isTest) app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', fallthrough: false }));

  const api = Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true, db: dbStatus(), uptime: Math.round(process.uptime()) });
  });

  // Throttle credential endpoints only — /auth/me runs on every app load and must not count.
  api.post('/auth/login', limiter(15, 20, { failuresOnly: true }));
  api.post('/auth/register', limiter(60, 20));
  api.use('/auth', authRouter);
  api.use('/public', limiter(1, 120), publicRouter);

  // Everything below requires a signed-in user.
  const secured = Router();
  secured.use(requireAuth);
  secured.use('/shop', shopRouter);
  secured.use('/team', teamRouter);
  secured.use('/customers', customersRouter);
  secured.use('/vehicles', vehiclesRouter);
  secured.use('/services', servicesRouter);
  secured.use('/jobs', jobsRouter);
  secured.use('/quotes', quotesRouter);
  secured.use('/invoices', invoicesRouter);
  secured.use('/inspections', inspectionsRouter);
  secured.use('/inventory', inventoryRouter);
  secured.use('/certificates', certificatesRouter);
  secured.use('/memberships', membershipsRouter);
  secured.use('/automations', automationsRouter);
  secured.use('/messages', messageSuggestRouter, messagesRouter);
  secured.use('/time', timeRouter);
  secured.use('/earnings', earningsRouter);
  secured.use('/analytics', analyticsRouter);
  secured.use('/search', searchRouter);
  secured.use('/notifications', notificationsRouter);
  secured.use('/activity', activityRouter);
  // Phase 2
  secured.use('/calendar', calendarRouter);
  secured.use('/routes', routesRouter);
  secured.use('/coupons', couponsRouter);
  secured.use('/gift-cards', giftCardsRouter);
  secured.use('/forms', formsRouter);
  secured.use('/documents', documentsRouter);
  secured.use('/integrations', integrationsRouter);
  secured.use('/api-keys', apiKeysRouter);
  secured.use('/webhooks', webhooksRouter);
  secured.use('/export', exportRouter);
  secured.use('/import', importRouter);
  secured.use('/marketplace', marketplaceRouter);
  secured.use('/campaigns', campaignsRouter);
  secured.use('/reviews', reviewsRouter);
  secured.use('/insights', aiInsightsRouter);
  api.use(secured);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
