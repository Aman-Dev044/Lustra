# Lustra — the spatial OS for detailing, PPF, tint & wrap shops

Full-stack shop-management platform (Urable feature parity + next-gen features) with a Spatial UI theme.

| Part | Stack | Port |
|------|-------|------|
| `web/` | Next.js 16 (App Router, Cache Components), Tailwind v4, motion, three.js / R3F, Socket.io client | 3000 |
| `server/` | Node.js, Express 5, Mongoose 9 (MongoDB), Socket.io, zod, JWT | 4000 |
| `e2e/` | Playwright end-to-end + SEO suite | — |

Specs: [ARCHITECTURE.md](ARCHITECTURE.md) (core) · [ARCHITECTURE-PHASE2.md](ARCHITECTURE-PHASE2.md) (parity + advanced).

## Quick start

Requirements: Node 20+ (tested on 24), MongoDB 6+ running on `mongodb://127.0.0.1:27017`.

```bash
npm run install:all                     # root + server + web dependencies
cp server/.env.example server/.env      # then set a long random JWT_SECRET
npm run seed                            # demo shop "Apex Auto Spa"
npm run dev                             # API :4000 + web :3000 (hot reload)
```

Open http://localhost:3000 — log in with **demo@lustra.app / demo1234** (Enterprise plan + 3D Visualizer).
Other demo staff: priya@, diego@, jordan@, tyler@, aaliyah@apexautospa.com (same password).

Production: `npm run build && npm start`.

Demo data follows your machine's timezone; set `SEED_TIMEZONE=America/Chicago` before `npm run seed` to override.

## Tests

```bash
npm test                                # backend integration tests (vitest + supertest, uses lustra_test DB)
npx playwright install chromium         # once
npm run e2e                             # with the stack running: SEO, every page, auth, booking, mobile overflow
```

## Pricing (same as Urable)

Express **$70/mo** ($840/yr) · Pro **$110/mo** ($1,320/yr) · Enterprise **$183/mo** ($2,200/yr) · 3D Visualizer add-on **$150/mo**.
Unlimited users, no contracts. Plan gates live in `web/src/lib/plans.ts` and `server/src/lib/plans.ts`.

## Feature map

**Urable parity:** quoting & invoicing, automated messaging, payments (cards, ACH, financing, tips, deposits), mapping &
route optimization, online booking, workflows, employee earnings & commissions, line-item scheduling, photo/video
inspections, 3D visualizer, supplier marketplace, lead forms, document storage, QuickBooks/Stripe/Square/Zapier, API,
coupons & e-gift cards, recurring jobs, time off & meetings, VIN decode, signatures, import/export, analytics.

**Next-gen:** AI Quote Copilot, AI Insights (forecast, churn radar, opportunities, health score), real-time Live Board,
live customer portal (track · approve · sign · pay), QR-verified warranty certificates, memberships & recurring billing,
visual automation builder, smart-segment campaigns, reputation hub with AI replies, AI inbox reply suggestions,
bay capacity planner, API keys + HMAC-signed webhooks, ⌘K command palette, real-time presence.

**SEO:** per-page metadata & canonicals, Open Graph/Twitter cards with generated OG images, JSON-LD (Organization,
WebSite, SoftwareApplication, Product/Offer, FAQPage, BreadcrumbList, BlogPosting, AboutPage, ContactPage),
`sitemap.xml`, `robots.txt`, web manifest, static prerendering, `next/image`, semantic HTML, noindex on private routes.

## Simulated integrations

SMS/email delivery, card processing, plan billing, QuickBooks/Zapier syncs and marketplace fulfilment are simulated
(stored + logged). Swap in real providers in `server/src/lib/messaging.ts` and the integration/payment routes.
