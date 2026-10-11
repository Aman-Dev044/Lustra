# Lustra API

Node.js + Express 5 + Mongoose 9 (TypeScript, ESM). The full contract is in [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

```bash
cp .env.example .env   # MongoDB on mongodb://127.0.0.1:27017/lustra by default
npm install
npm run seed           # demo shop "Apex Auto Spa" → demo@lustra.app / demo1234
npm run dev            # http://localhost:8879 (tsx watch)
npm test               # vitest + supertest against the lustra_test database
npm run typecheck
```

## Layout

```
src/
  index.ts            http server, socket.io, schedulers, graceful shutdown
  app.ts              express app factory (used by tests)
  models/             mongoose schemas (all tenant data carries `shop`)
  routes/             one router per resource, mounted under /api
  lib/
    auth.ts           JWT cookie auth, roles
    plans.ts          plan feature gates (Express / Pro / Enterprise / Visualizer add-on)
    automations.ts    trigger → condition → action engine (+ `wait` scheduler)
    copilot.ts        Quote Copilot estimator
    availability.ts   booking slot engine (timezone-aware)
    messaging.ts      simulated SMS / email (swap `deliver()` for Twilio / SendGrid)
    vin.ts            offline VIN check-digit validation & decoding
    routing.ts        mobile route optimizer (nearest neighbour + 2-opt, haversine × 1.3, 40 km/h)
    insights.ts       revenue forecast, churn risk, opportunities, health score
    webhooks.ts       signed webhook deliveries (X-Lustra-Signature: sha256=…)
    coupons.ts / giftcards.ts / segments.ts / suggestions.ts / csv.ts
  seed/               demo data + per-industry defaults, automation templates, marketplace catalog
tests/                integration + unit tests
```

## Going live

- **Payments** — `POST /api/public/invoices/:token/pay` and `PATCH /api/shop/plan` are simulated; wire Stripe there.
- **SMS / email** — replace `deliver()` in `src/lib/messaging.ts`.
- **Uploads** — stored on disk under `uploads/<shopId>/`; swap `src/lib/uploads.ts` for S3/R2 in production.
