# Lustra — Phase 2: full Urable parity + next-gen features

Extends ARCHITECTURE.md. Every Urable capability is covered (routing, coupons & e-gift cards, lead forms, documents,
QuickBooks/Zapier/API, repeat jobs, time-off & meetings, supplier marketplace, import/export) plus new advanced tech
(AI Insights, smart campaigns, reputation hub, AI reply suggestions, API keys & signed webhooks).

## Plan gates (additions)

- `express` (all plans): routing (map + optimize + on-my-way), coupons, gift cards, calendar blocks, recurring jobs, import/export, Stripe/Square integrations.
- `pro` adds features: `campaigns`, `reviews`, `ai_insights` (plus existing `lead_forms`, `documents`, `marketplace`, `quickbooks`).
- `enterprise` adds: `api_access` (API keys + webhooks + Zapier).

## Model changes

```ts
Shop      += depot: { address, lat, lng }, credits: number (marketplace cashback, $)
Customer  += geo?: { lat, lng }
Job       += mobile: boolean, serviceAddress?: string, geo?: { lat, lng }, routeOrder?: number, eta?: Date,
             recurrence?: { frequency: 'weekly'|'biweekly'|'monthly'|'quarterly'|'custom', intervalDays: number,
                            endsAt?: Date, parent?: Job, generatedNext?: boolean }
Invoice   += coupon?: { code, amount }, payments[].method += 'gift_card', payments[].giftCard?: string (code)

CalendarBlock { shop, user?: User (null = whole shop), title, kind: 'time_off'|'meeting'|'blocked', start, end, bay?: number, allDay, notes }
Coupon    { shop, code (unique per shop, uppercase), description, type: 'percent'|'fixed', value, minSpend=0, maxUses?,
            uses=0, expiresAt?, active=true, categories: ServiceCategory[] (empty = all) }
GiftCard  { shop, code (e.g. 'GC-8F3K-2QPL'), initialBalance, balance, customer?, recipientName, recipientEmail, message,
            expiresAt?, status: 'active'|'depleted'|'void', transactions: [{ at, amount (− redeem / + load), invoice?, note }] }
LeadForm  { shop, name, slug (unique per shop), title, description, fields: [{ _id, key, label,
            type: 'text'|'email'|'phone'|'textarea'|'select'|'vehicle'|'services'|'date'|'checkbox', required, options: string[] }],
            submitLabel='Request a quote', successMessage, createJob=true, active=true, submissions=0 }
Document  { shop, customer?, job?, name, url, mime, size, category: 'waiver'|'contract'|'photo'|'receipt'|'warranty'|'other', uploadedBy }
Integration { shop, provider: 'quickbooks'|'stripe'|'square'|'zapier'|'google'|'twilio'|'carfax'|'mailchimp',
            status: 'connected'|'disconnected', connectedAt, account?: string, lastSyncAt, log: [{ at, message }] }
ApiKey    { shop, name, prefix ('lx_live_ab12'), hash (sha256), lastUsedAt, createdBy, revokedAt }
Webhook   { shop, url, events: string[] (automation trigger names + 'job.updated', 'invoice.created'), secret, active,
            deliveries: last 20 [{ at, event, status: 'success'|'failed', code, durationMs }] }
            Delivery = POST JSON { id, event, createdAt, data } with header `X-Lustra-Signature: sha256=<hex hmac(secret, rawBody)>`
MarketplaceProduct (global) { vendor, name, sku, category: 'ceramic'|'ppf'|'tint'|'chemicals'|'tools'|'towels'|'wrap',
            price, memberPrice, unit, rating, description, badge? }
SupplyOrder { shop, number, items: [{ product, sku, name, qty, price }], subtotal, credit (2% cashback), total,
            status: 'placed'|'shipped'|'delivered', placedBy, deliveredAt }
Campaign  { shop, name, channel: 'sms'|'email', segment: { type: 'all'|'tag'|'lapsed'|'due_maintenance'|'coating_anniversary'|'vip'|'members', value?: string|number },
            subject?, body, status: 'draft'|'sent', sentAt, stats: { recipients, delivered, booked, revenue } }
Review    { shop, customer?, job?, source: 'google'|'facebook'|'yelp'|'lustra', rating 1-5, comment, author, reply?, repliedAt?, status: 'new'|'replied' }
ReviewRequest { shop, customer, job?, token, sentAt, completedAt?, rating? }
```

## Endpoints (base `/api`)

Scheduling
- `GET /calendar/blocks?from&to` → `CalendarBlock[]` · `POST /calendar/blocks` · `PATCH /calendar/blocks/:id` · `DELETE /calendar/blocks/:id`
- Jobs accept `mobile, serviceAddress, recurrence` on create/patch. When a recurring job is completed the server creates the next
  occurrence (stage `scheduled`, same line items, start + intervalDays) linked via `recurrence.parent`, unless past `endsAt`.
- `POST /jobs/:id/on-my-way` `{ etaMinutes }` → sends SMS (template) + timeline entry + sets `eta`; returns job.

Routing
- `GET /routes?date=YYYY-MM-DD` → `{ date, depot, technicians: [{ user, stops: [{ job, order, lat, lng, eta, legKm, legMinutes }], totalKm, totalMinutes }], unassigned: Job[] }`
  (mobile jobs that day; distance = haversine × 1.3 road factor; 40 km/h average; job duration added to ETAs)
- `POST /routes/optimize` `{ date, assignUnassigned?: boolean }` → same shape; nearest-neighbour + 2-opt per technician,
  balances unassigned jobs across active technicians, persists `routeOrder`, `assignees`, `eta`.

Promotions
- `/coupons` CRUD · `POST /coupons/validate` `{ code, subtotal, categories? }` → `{ valid, amount, coupon?, reason? }`
- `/gift-cards` CRUD (create body `{ initialBalance, recipientName, recipientEmail?, message?, customer?, expiresAt? }`)
  · `POST /gift-cards/:id/adjust` `{ amount, note }` · `GET /gift-cards/lookup/:code`
- `POST /invoices/:id/apply-coupon` `{ code }` → invoice (discount recalculated, coupon.uses++) · `DELETE /invoices/:id/coupon` → invoice
- `POST /invoices/:id/payments` accepts `method: 'gift_card', giftCardCode` (deducts balance; 400 if insufficient/invalid)
- Public booking body accepts optional `couponCode`.

Lead forms & documents
- `/forms` CRUD · `GET /forms/:id/submissions` → jobs created from it (paged)
- Public: `GET /public/forms/:shopSlug/:formSlug` → `{ shop, form, services }` · `POST /public/forms/:shopSlug/:formSlug` `{ answers: Record<key, unknown> }`
  → creates/matches customer (email/phone), vehicle (vehicle field = `{ year, make, model }`), job stage `lead` (if createJob) with answers in notes,
  notification + automation trigger `lead.created` → `{ ok: true, message }`
- `/documents` — `GET ?customer=&job=&category=&q=` (paged) · `POST` multipart (`file`, `name?`, `category`, `customer?`, `job?`) · `DELETE /:id`

Integrations & developer platform
- `GET /integrations` → all 8 providers `[{ provider, name, description, category, status, connectedAt, account, lastSyncAt, requiredPlan? }]`
- `POST /integrations/:provider/connect` `{ account? }` · `POST /integrations/:provider/disconnect` · `POST /integrations/:provider/sync` → `{ ok, synced, log }` (simulated)
- `/api-keys` — `GET` · `POST { name }` → `{ apiKey (plaintext, shown once), key }` · `DELETE /:id` (revoke). `Authorization: Bearer lx_live_...` authenticates as the shop owner.
- `/webhooks` CRUD · `POST /webhooks/:id/test` → delivery result. Real HTTP deliveries (fire-and-forget, 5s timeout) on job/quote/invoice/booking/customer/lead events.
- `GET /export/:entity` (`customers|vehicles|jobs|invoices|inventory|payments`) → `text/csv` attachment
- `POST /import/customers` `{ rows: [{ firstName, lastName, email?, phone?, tags?, source?, notes? }] }` (client parses CSV) → `{ created, updated, skipped, errors: [{ row, message }] }`

Marketplace (Urable "UrPartners" equivalent)
- `GET /marketplace/products?category=&q=` → `{ items, credits, memberPricing: boolean }` · `GET /marketplace/orders` (paged)
- `POST /marketplace/orders` `{ items: [{ product, qty }] }` → order (member pricing on pro+, 2% credit added to shop.credits)
- `POST /marketplace/orders/:id/receive` → marks delivered and adds qty to Inventory (match by sku, else create)

Growth & AI
- `/campaigns` CRUD · `GET /campaigns/preview?type=&value=` → `{ count, sample: Customer[] }` · `POST /campaigns/:id/send` → campaign
- `/reviews` — `GET` paged + `summary: { average, count, distribution: {1..5}, responseRate, bySource }` · `PATCH /:id { reply }`
  · `POST /reviews/:id/suggest-reply` → `{ suggestions: string[] }` · `POST /reviews/request { customer, job? }` → ReviewRequest (SMS with link `/review/<token>`)
- Public: `GET /public/reviews/:token` → `{ shop, customerFirstName, job? }` · `POST /public/reviews/:token { rating, comment }` → `{ ok, redirect?: string }` (Google review URL offered to everyone; no gating)
- `GET /insights` → `{ forecast: { series: [{ date, actual?, predicted, lower, upper }], next30, trend },
  churnRisk: [{ customer, lastVisitAt, avgIntervalDays, daysOverdue, risk: 'high'|'medium'|'low', lifetimeValue }],
  opportunities: [{ id, kind: 'followup_quotes'|'coating_anniversary'|'idle_capacity'|'lapsed_vips'|'unpaid_invoices'|'low_stock'|'membership_upsell',
    title, description, impact ($), count, action: { label, href } }],
  health: { score (0-100), factors: [{ label, score, hint }] } }`
- `POST /messages/suggest` `{ customer }` → `{ suggestions: string[] }` (intent-aware: pricing / availability / status / thanks / complaint / reschedule)

## New web routes

App: `/app/routes`, `/app/promotions` (coupons · gift cards), `/app/forms`, `/app/documents`, `/app/marketplace`,
`/app/campaigns`, `/app/reviews`, `/app/insights`, `/app/integrations` (integrations · API keys · webhooks · import/export).
Public (noindex): `/f/[shop]/[form]` (lead form), `/review/[token]`.
