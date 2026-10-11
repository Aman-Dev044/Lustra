# Lustra — Architecture & API Contract

Lustra is the spatial operating system for auto-appearance & field-service shops (detailing, ceramic coating,
PPF, tint, wrap, marine, landscaping, lawn care, flat glass). It is a next-generation alternative to tools like
Urable, with the same pricing tiers and a much deeper, real-time, AI-assisted feature set.

```
NEWCLIENTPROJECT/
  server/   Node.js + Express 5 + Mongoose 9 (TypeScript, ESM, run with tsx)   → http://localhost:8879
  web/      Next.js 16 App Router + Tailwind v4 + motion + three.js            → http://localhost:8878
```

The web app proxies `/api/*` and `/uploads/*` to the server via `next.config.ts` rewrites, so the browser only
ever talks to `localhost:8878` and the auth cookie is first-party. Socket.io connects directly to
`NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:8879`) with `withCredentials: true`.

## Pricing (identical to Urable)

| Plan       | Monthly | Yearly  |
|------------|---------|---------|
| Express    | $70/mo  | $840/yr |
| Pro        | $110/mo | $1,320/yr |
| Enterprise | $183/mo | $2,200/yr |
| 3D Visualizer add-on | $150/mo | — |

Unlimited users on every plan. No contracts. Plan gates (`web/src/lib/plans.ts` and `server/src/lib/plans.ts`):

- `express`: customers, vehicles, jobs, calendar, quotes, invoices, payments, reminders, inventory, team assign, time clock, basic analytics, inspections (photo), messages, certificates, command palette, live board.
- `pro` adds: `online_booking`, `lead_forms`, `followups`, `documents`, `marketplace`, `quickbooks`, `profit_analytics`, `quote_copilot`, `customer_portal`.
- `enterprise` adds: `memberships` (recurring billing), `video_inspections`, `automations` (custom workflows), `payment_reminders`, `commissions`, `line_item_scheduling`, `capacity_planner`, `multi_location`.
- add-on `visualizer` (boolean on shop.addOns).

## Conventions

- All IDs are Mongo ObjectId strings exposed as `_id`. Dates are ISO strings in JSON.
- Money is stored as **numbers in dollars** with 2-decimal rounding (`round2`).
- Every tenant document has `shop` (ObjectId). Every authenticated query is scoped by `req.auth.shopId`.
- List responses: `{ items: T[], total: number, page: number, pageSize: number }` (query `page`, `pageSize` (default 50, max 200), `q`, `sort`).
- Single responses: the document object itself.
- Errors: HTTP status + `{ error: { message: string, code: string, details?: unknown } }`.
  Codes: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PLAN_REQUIRED`, `RATE_LIMITED`, `INTERNAL`.
- Validation with zod on every write route.
- Auth: JWT in httpOnly cookie `lustra_token` (7 days, sameSite=lax). `Authorization: Bearer <token>` also accepted.
- Roles: `owner` > `admin` > `manager` > `technician`. Technicians cannot delete, change settings, or see other people's earnings.
- Real-time: after any job/invoice/booking/notification mutation the server emits to room `shop:<shopId>`.

## Data models (server/src/models)

```ts
Shop { name, slug(unique), industry: Industry, phone, email, website, address, timezone='America/New_York',
  currency='USD', taxRate(%)=0, logoUrl, brandColor='#7c5cff', plan: 'express'|'pro'|'enterprise',
  planInterval: 'monthly'|'yearly', addOns: { visualizer: boolean }, trialEndsAt,
  booking: { enabled, headline, leadTimeHours=12, slotMinutes=30, bays=2, requireDeposit=false, depositPercent=20,
    workingHours: [{ day 0-6, open:'08:00', close:'18:00', closed:boolean }] },
  locations: [{ _id, name, address }], loyalty: { enabled, pointsPerDollar=1, redeemValue=0.05 },
  onboarding: { completedSteps: string[] } }
Industry = 'detailing'|'ceramic'|'ppf'|'tint'|'wrap'|'marine'|'landscaping'|'lawn-care'|'flat-glass'|'mobile'

User { shop, name, email(unique, lowercase), passwordHash(select:false), role, phone, avatarColor,
  hourlyRate=0, commissionPercent=0, active=true, lastLoginAt }

Customer { shop, firstName, lastName, email, phone, address, company, tags: string[],
  source: 'website'|'referral'|'google'|'instagram'|'facebook'|'walk-in'|'booking'|'repeat'|'other',
  notes, loyaltyPoints=0, lifetimeValue=0, visits=0, marketingOptIn=true, lastVisitAt }   (+ virtual fullName)

Vehicle { shop, customer, type: 'car'|'truck'|'suv'|'van'|'motorcycle'|'boat'|'rv'|'other',
  year, make, model, trim, color, vin, plate, size: 'small'|'medium'|'large'|'xl', notes }

Service { shop, name, category: 'detailing'|'ceramic'|'ppf'|'tint'|'wrap'|'correction'|'interior'|'marine'|'lawn'|'maintenance'|'other',
  description, basePrice, durationMinutes, sizeMultipliers { small=1, medium=1.15, large=1.3, xl=1.5 },
  keywords: string[], active=true, bookable=true, color }

LineItem { _id, service?, name, description, category, qty=1, unitPrice, discount=0 (dollars),
  durationMinutes, assignee?: User, scheduledStart?, scheduledEnd?, status: 'pending'|'in_progress'|'done' }
Totals { subtotal, discount, tax, total }

Job { shop, number(per-shop sequence from 1001), customer, vehicle, title, stage: JobStage,
  priority: 'low'|'normal'|'high'|'rush', lineItems: LineItem[], scheduledStart, scheduledEnd, bay(1..n),
  location?, assignees: User[], notes, internalNotes, tags, source, portalToken(nanoid, unique),
  timeline: [{ _id, at, type: 'created'|'stage'|'note'|'payment'|'message'|'inspection'|'quote'|'system', message, by? }],
  checklist: [{ _id, label, done }], quote?, invoice?, totals: Totals, completedAt }
JobStage = 'lead'|'quoted'|'scheduled'|'in_progress'|'quality_check'|'completed'|'cancelled'

Quote { shop, number, customer, vehicle?, job?, title, items: [LineItem & { optional:boolean, selected:boolean }],
  discount, taxRate, totals, status: 'draft'|'sent'|'viewed'|'approved'|'declined'|'expired', validUntil,
  notes, publicToken, approvedAt, signatureName, aiGenerated=false, copilotPrompt }

Invoice { shop, number, customer, job?, items: [{ _id, name, description, qty, unitPrice }], discount, taxRate,
  totals: { subtotal, discount, tax, total, tips, paid, balance },
  status: 'draft'|'sent'|'partial'|'paid'|'void'|'overdue', dueDate, notes, publicToken,
  payments: [{ _id, amount, tip=0, method: 'card'|'cash'|'ach'|'check'|'financing'|'other', reference, at, by? }], paidAt }

Inspection { shop, job?, customer, vehicle, type: 'pre'|'post', status: 'draft'|'awaiting_signature'|'signed',
  markers: [{ _id, view: 'top'|'left'|'right'|'front'|'rear', x(0-100), y(0-100),
    kind: 'scratch'|'dent'|'chip'|'swirl'|'crack'|'stain'|'other', severity: 1|2|3, note }],
  media: [{ _id, url, kind: 'photo'|'video', caption }], notes, publicToken,
  signature: { name, signedAt } }

InventoryItem { shop, name, sku, category, unit='unit', quantity, reorderLevel, cost, supplier, location,
  adjustments: [{ at, delta, reason, by }] }

TimeEntry { shop, user, job?, clockIn, clockOut?, minutes, tips=0, note }

Automation { shop, name, description, enabled, trigger: Trigger,
  conditions: [{ field, op: 'eq'|'neq'|'gt'|'lt'|'contains', value }],
  actions: [{ type: 'send_sms'|'send_email'|'notify_team'|'add_tag'|'update_stage'|'wait', config: Record<string,any> }],
  runs=0, lastRunAt }
Trigger = 'job.created'|'job.stage_changed'|'job.completed'|'quote.sent'|'quote.approved'|'invoice.paid'|
          'invoice.overdue'|'booking.created'|'customer.created'|'inspection.signed'
ScheduledAction { shop, automation, actionIndex, payload, runAt, status }   (poller every 30s executes 'wait' continuations)

Message { shop, customer, job?, direction: 'outbound'|'inbound', channel: 'sms'|'email'|'note', subject, body,
  status: 'queued'|'sent'|'delivered'|'failed'|'received', automation?, readAt, by? }
  (SMS/email providers are simulated: messages are stored + logged. Plug Twilio/SendGrid in server/src/lib/messaging.ts)

Certificate { shop, code(unique e.g. 'LX-7K2M9Q'), customer, vehicle, job?, product, coverage, installedAt,
  expiresAt, installer?: User, notes, status: 'active'|'expired'|'void' }

MembershipPlan { shop, name, price, interval: 'month'|'year', perks: string[], discountPercent, color, active }
Membership { shop, plan, customer, vehicle?, status: 'active'|'paused'|'cancelled', startedAt, nextBillingAt, washesUsed }

Notification { shop, user?(null = everyone), title, body, link, kind: 'info'|'success'|'warning'|'booking'|'payment', readBy: User[] }
ActivityLog { shop, actor?, action, entityType, entityId, summary }
Lead { shop?, name, email, phone, company, message, source: 'contact'|'demo'|'visualizer'|'newsletter', meta }
Counter { shop, key, seq }
```

## REST API (base `/api`)

Auth (`/auth`)
- `POST /auth/register` `{ name, email, password(min 8), shopName, industry, phone? }` → `{ user, shop }` + cookie. Seeds default services & automations for the industry.
- `POST /auth/login` `{ email, password }` → `{ user, shop }` + cookie
- `POST /auth/logout` → `{ ok: true }`
- `GET /auth/me` → `{ user, shop }` (401 if not logged in)
- `PATCH /auth/me` `{ name?, phone?, password? }` → user

Shop & team
- `GET /shop` → shop · `PATCH /shop` (owner/admin) partial shop (not plan) → shop
- `PATCH /shop/plan` `{ plan, planInterval, addOns? }` (owner) → shop  (simulated billing)
- `GET /team` → `User[]` · `POST /team` `{ name, email, role, password, hourlyRate?, commissionPercent? }` · `PATCH /team/:id` · `DELETE /team/:id` (deactivate)

Core CRUD (all support `GET /x?q=&page=&pageSize=`, `GET /x/:id`, `POST /x`, `PATCH /x/:id`, `DELETE /x/:id`)
- `/customers` (list filters: `tag`, `source`) — `GET /customers/:id/overview` → `{ customer, vehicles, jobs, invoices, quotes, messages, certificates, memberships }`
- `/vehicles` (filter `customer`) — `GET /vehicles/decode-vin/:vin` → `{ vin, year?, make?, country?, valid }`
- `/services` (filter `category`, `active`)
- `/jobs` (filters `stage` (comma list), `from`, `to` (scheduledStart range), `assignee`, `customer`) — populated `customer`, `vehicle`, `assignees`
  - `GET /jobs/board` → `{ columns: { [stage]: Job[] } }` (excludes cancelled, completed limited to last 14 days)
  - `PATCH /jobs/:id/stage` `{ stage }` · `POST /jobs/:id/notes` `{ message }` · `PATCH /jobs/:id/checklist` `{ checklist }`
  - `PATCH /jobs/:id/line-items/:itemId` `{ assignee?, scheduledStart?, scheduledEnd?, status? }` (line-item scheduling)
- `/quotes` — `POST /quotes/:id/send` · `POST /quotes/:id/convert` → job · `POST /quotes/copilot` `{ prompt, vehicleSize?, vehicleType? }` → `{ items: LineItem[], durationMinutes, total, confidence, reasoning: string[], detected: { size, condition, categories } }`
- `/invoices` — `POST /invoices/from-job/:jobId` · `POST /invoices/:id/payments` `{ amount, tip?, method, reference? }` · `POST /invoices/:id/send` · `POST /invoices/:id/void`
- `/inspections` — `POST /inspections/:id/media` (multipart `file`, field `caption`) · `POST /inspections/:id/request-signature`
- `/inventory` — `POST /inventory/:id/adjust` `{ delta, reason }`
- `/certificates`
- `/memberships/plans` (CRUD) · `/memberships` (CRUD)
- `/automations` — `GET /automations/templates` → template list · `POST /automations/:id/test` `{ }` → `{ ok, log: string[] }`
- `/messages` — `GET /messages/threads` → `[{ customer, lastMessage, unread }]` · `GET /messages?customer=` · `POST /messages` `{ customer, channel, body, subject? }` · `POST /messages/read` `{ customer }`

Time & money
- `GET /time/status` → `{ active: TimeEntry|null }` · `POST /time/clock-in` `{ job? }` · `POST /time/clock-out` `{ tips?, note? }` · `GET /time?user=&from=&to=`
- `GET /earnings?from=&to=` → `[{ user, minutes, hours, wages, tips, commission, total, jobs }]`

Insights
- `GET /analytics/overview?range=7d|30d|90d|365d` → `{ kpis: { revenue, revenueChange, jobsCompleted, jobsChange, avgTicket, conversionRate, outstanding, newCustomers }, revenueSeries: [{ date, revenue, jobs }], byCategory: [{ category, revenue }], topServices: [{ name, count, revenue }], sources: [{ source, count }], technicians: [{ user, jobs, revenue }], pipeline: [{ stage, count, value }], upcoming: Job[] }`
- `GET /analytics/capacity?from=&to=` → `{ bays, days: [{ date, hours: [{ hour, booked(0..bays) }] }] }`
- `GET /search?q=` → `{ customers, vehicles, jobs, invoices, quotes }` (max 5 each)
- `GET /notifications` → `Notification[]` (+ `read: boolean` for current user) · `POST /notifications/read-all`
- `GET /activity?limit=` → `ActivityLog[]`

Public (no auth)
- `GET /public/shops/:slug` → `{ shop: {name, slug, industry, phone, email, address, brandColor, logoUrl, booking}, services: Service[] (bookable) }`
- `GET /public/shops/:slug/availability?date=YYYY-MM-DD&services=id,id` → `{ date, slots: [{ start, end, available }] }`
- `POST /public/shops/:slug/bookings` `{ firstName, lastName, email, phone, vehicle: { year, make, model, type, color }, services: id[], start, notes }` → `{ job: { number, portalToken } }`
- `GET /public/portal/:token` → `{ shop, job, customer(first name only), vehicle, quote?, invoice?, inspection?, certificates }`
- `POST /public/quotes/:token/approve` `{ signatureName, selectedItemIds? }` · `POST /public/quotes/:token/decline`
- `GET /public/quotes/:token` · `GET /public/invoices/:token` · `POST /public/invoices/:token/pay` `{ amount, tip }` (simulated card)
- `GET /public/inspections/:token` · `POST /public/inspections/:token/sign` `{ name }`
- `GET /public/certificates/:code`
- `POST /public/leads` `{ name, email, phone?, company?, message?, source }`

Health: `GET /api/health` → `{ ok: true, db: 'up'|'down', uptime }`

## Socket.io events (server → client, room `shop:<id>`)

`job:created` Job · `job:updated` Job · `job:deleted` {_id} · `invoice:updated` Invoice · `booking:created` Job ·
`notification` Notification · `message:new` Message · `presence` `{ users: [{_id,name}] }`

## Web routes

Marketing (static, SEO): `/`, `/features`, `/features/[slug]`, `/industries`, `/industries/[slug]`, `/pricing`,
`/visualizer`, `/about`, `/contact`, `/blog`, `/blog/[slug]`, `/legal/privacy`, `/legal/terms`, `/why-lustra`.
Auth: `/login`, `/signup`.
App (client, auth-gated, noindex): `/app` (dashboard), `/app/board`, `/app/jobs`, `/app/jobs/[id]`, `/app/calendar`,
`/app/customers`, `/app/customers/[id]`, `/app/quotes`, `/app/quotes/new`, `/app/quotes/[id]`, `/app/invoices`,
`/app/invoices/[id]`, `/app/inspections`, `/app/inspections/[id]`, `/app/inventory`, `/app/team`, `/app/time`,
`/app/automations`, `/app/analytics`, `/app/messages`, `/app/memberships`, `/app/certificates`, `/app/visualizer`,
`/app/settings` (tabs: shop, services, booking, billing, team).
Public customer-facing (noindex): `/book/[slug]`, `/portal/[token]`, `/verify/[code]`.

## Demo data

`cd server && npm run seed` → shop "Apex Auto Spa" (slug `apex-auto-spa`, enterprise + visualizer),
login **demo@lustra.app / demo1234**, 6 staff, ~80 customers, ~100 vehicles, ~220 jobs over the last 120 days
and next 21 days, quotes, invoices, payments, inspections, inventory, automations, memberships, certificates, messages.
