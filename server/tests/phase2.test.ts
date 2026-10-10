import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { app, createCustomerWithVehicle, registerShop, setupDb, sleep, teardownDb } from './helpers.js';
import { signPayload } from '../src/lib/webhooks.js';
import { optimizeOrder, pathKm, roadKm } from '../src/lib/routing.js';
import { forecastRevenue, linearRegression } from '../src/lib/insights.js';
import { csvCell } from '../src/lib/csv.js';
import { detectIntent } from '../src/lib/suggestions.js';

beforeAll(setupDb);
afterAll(teardownDb);

type Agent = ReturnType<typeof request.agent>;

async function jobWithInvoice(agent: Agent, lineItems: Record<string, unknown>[]) {
  const { customer, vehicle } = await createCustomerWithVehicle(agent);
  const job = await agent.post('/api/jobs').send({ customer: customer._id, vehicle: vehicle._id, lineItems });
  const invoice = await agent.post(`/api/invoices/from-job/${job.body._id}`);
  return { customer, vehicle, job: job.body, invoice: invoice.body };
}

describe('pure helpers', () => {
  it('routing: 2-opt finds the obvious order along a line', () => {
    const depot = { lat: 30, lng: -97 };
    const stops = [0.04, 0.01, 0.03, 0.02].map((d) => ({ lat: 30 + d, lng: -97 }));
    const order = optimizeOrder(depot, stops);
    expect(order.map((i) => stops[i].lat)).toEqual([30.01, 30.02, 30.03, 30.04]);
    expect(pathKm(depot, stops, order)).toBeCloseTo(roadKm(depot, stops[0]), 5); // straight out
  });

  it('insights: regression and forecast band behave', () => {
    expect(linearRegression([1, 3, 5, 7])).toEqual({ intercept: 1, slope: 2 });
    const daily = Array.from({ length: 28 }, (_, i) => ({ date: `d${i}`, weekday: i % 7, revenue: 100 + i * 10 + (i % 7 === 6 ? 200 : 0) }));
    const f = forecastRevenue(daily, Array.from({ length: 7 }, (_, i) => ({ date: `f${i}`, weekday: (28 + i) % 7 })));
    expect(f.series).toHaveLength(35);
    expect(f.trend).toBe('up');
    const saturday = f.series.find((p) => p.date === 'f6')!;
    const friday = f.series.find((p) => p.date === 'f5')!;
    expect(saturday.predicted).toBeGreaterThan(friday.predicted + 100); // weekday seasonality
    for (const p of f.series) expect(p.lower).toBeLessThanOrEqual(p.predicted);
  });

  it('csv: escapes quotes, commas, newlines and formula injection', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(-5)).toBe('-5');
  });

  it('message intent detection', () => {
    expect(detectIntent('How much for a ceramic coating?')).toBe('pricing');
    expect(detectIntent('Do you have availability Saturday?')).toBe('availability');
    expect(detectIntent('Is my car ready yet?')).toBe('status');
    expect(detectIntent('Thank you!! looks amazing')).toBe('thanks');
    expect(detectIntent('There is a scratch on my door now')).toBe('complaint');
    expect(detectIntent('Can I reschedule to next week?')).toBe('reschedule');
  });
});

describe('coupons', () => {
  it('validates rules and applies / removes on invoices', async () => {
    const { agent } = await registerShop();
    await agent.post('/api/coupons').send({ code: 'save10', type: 'percent', value: 10 }).expect(201);
    await agent.post('/api/coupons').send({ code: 'BIG50', type: 'fixed', value: 50, minSpend: 300 }).expect(201);
    await agent.post('/api/coupons').send({ code: 'CERAMIC20', type: 'percent', value: 20, categories: ['ceramic'], maxUses: 1 }).expect(201);
    await agent.post('/api/coupons').send({ code: 'OLD', type: 'percent', value: 10, expiresAt: new Date(Date.now() - 86_400_000).toISOString() }).expect(201);
    expect((await agent.post('/api/coupons').send({ code: 'SAVE10', type: 'percent', value: 5 })).status).toBe(409);

    const v = (body: Record<string, unknown>) => agent.post('/api/coupons/validate').send(body).then((r) => r.body);
    expect(await v({ code: 'save10', subtotal: 200 })).toMatchObject({ valid: true, amount: 20 });
    expect(await v({ code: 'BIG50', subtotal: 200 })).toMatchObject({ valid: false, reason: expect.stringMatching(/minimum spend/) });
    expect(await v({ code: 'BIG50', subtotal: 300 })).toMatchObject({ valid: true, amount: 50 });
    expect(await v({ code: 'OLD', subtotal: 300 })).toMatchObject({ valid: false, reason: expect.stringMatching(/expired/) });
    expect(await v({ code: 'NOPE', subtotal: 300 })).toMatchObject({ valid: false, amount: 0 });
    expect(await v({ code: 'CERAMIC20', subtotal: 300, categories: ['tint'] })).toMatchObject({ valid: false });

    // Category coupon only discounts eligible job lines
    const { invoice } = await jobWithInvoice(agent, [
      { name: 'Ceramic Coating', category: 'ceramic', unitPrice: 1000 },
      { name: 'Window Tint', category: 'tint', unitPrice: 400 },
    ]);
    const applied = await agent.post(`/api/invoices/${invoice._id}/apply-coupon`).send({ code: 'ceramic20' });
    expect(applied.status).toBe(200);
    expect(applied.body.coupon).toEqual({ code: 'CERAMIC20', amount: 200 });
    expect(applied.body.totals).toMatchObject({ subtotal: 1400, discount: 200, total: 1200, balance: 1200 });

    // maxUses = 1 is now exhausted
    expect(await v({ code: 'CERAMIC20', subtotal: 1000, categories: ['ceramic'] })).toMatchObject({ valid: false, reason: expect.stringMatching(/limit/) });

    const removed = await agent.delete(`/api/invoices/${invoice._id}/coupon`);
    expect(removed.body.coupon).toBeUndefined();
    expect(removed.body.totals.total).toBe(1400);
    const coupons = await agent.get('/api/coupons?q=CERAMIC20');
    expect(coupons.body.items[0].uses).toBe(0); // released
  });
});

describe('gift cards', () => {
  it('redeems through invoice payments and rejects overdrafts', async () => {
    const { agent } = await registerShop();
    const card = await agent.post('/api/gift-cards').send({ initialBalance: 100, recipientName: 'Grace Hopper' });
    expect(card.status).toBe(201);
    expect(card.body.code).toMatch(/^GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(card.body.balance).toBe(100);

    const { invoice } = await jobWithInvoice(agent, [{ name: 'Full Detail', unitPrice: 250 }]);
    const tooMuch = await agent.post(`/api/invoices/${invoice._id}/payments`).send({ amount: 150, method: 'gift_card', giftCardCode: card.body.code });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.error.message).toMatch(/Insufficient/);
    expect((await agent.post(`/api/invoices/${invoice._id}/payments`).send({ amount: 10, method: 'gift_card' })).status).toBe(400);

    const paid = await agent.post(`/api/invoices/${invoice._id}/payments`).send({ amount: 100, method: 'gift_card', giftCardCode: card.body.code.toLowerCase() });
    expect(paid.status).toBe(201);
    expect(paid.body.totals).toMatchObject({ paid: 100, balance: 150 });
    expect(paid.body.payments[0]).toMatchObject({ method: 'gift_card', giftCard: card.body.code });

    const after = await agent.get(`/api/gift-cards/lookup/${card.body.code}`);
    expect(after.body).toMatchObject({ balance: 0, status: 'depleted' });
    expect(after.body.transactions.at(-1).amount).toBe(-100);

    const reloaded = await agent.post(`/api/gift-cards/${card.body._id}/adjust`).send({ amount: 25, note: 'Goodwill credit' });
    expect(reloaded.body).toMatchObject({ balance: 25, status: 'active' });
  });
});

describe('recurring jobs & calendar', () => {
  it('generates the next occurrence when a recurring job is completed', async () => {
    const { agent } = await registerShop();
    const { customer } = await createCustomerWithVehicle(agent);
    const start = new Date(Date.now() + 86_400_000);
    const job = await agent.post('/api/jobs').send({
      customer: customer._id,
      scheduledStart: start.toISOString(),
      lineItems: [{ name: 'Maintenance Wash', unitPrice: 79, durationMinutes: 60 }],
      recurrence: { frequency: 'biweekly' },
    });
    expect(job.body.recurrence).toMatchObject({ frequency: 'biweekly', intervalDays: 14, generatedNext: false });

    await agent.patch(`/api/jobs/${job.body._id}/stage`).send({ stage: 'completed' }).expect(200);
    // Re-completing must not create duplicates
    await agent.patch(`/api/jobs/${job.body._id}/stage`).send({ stage: 'in_progress' });
    await agent.patch(`/api/jobs/${job.body._id}/stage`).send({ stage: 'completed' });

    const list = await agent.get(`/api/jobs?customer=${customer._id}&sort=scheduledStart`);
    expect(list.body.total).toBe(2);
    const next = list.body.items.find((j: { _id: string }) => j._id !== job.body._id);
    expect(next.stage).toBe('scheduled');
    expect(new Date(next.scheduledStart).getTime() - start.getTime()).toBe(14 * 86_400_000);
    expect(next.recurrence).toMatchObject({ parent: job.body._id, intervalDays: 14, generatedNext: false });
    expect(next.lineItems[0]).toMatchObject({ name: 'Maintenance Wash', unitPrice: 79, status: 'pending' });

    // endsAt stops the series
    const ending = await agent.post('/api/jobs').send({
      customer: customer._id,
      scheduledStart: start.toISOString(),
      lineItems: [{ name: 'Wash', unitPrice: 50 }],
      recurrence: { frequency: 'monthly', endsAt: new Date(start.getTime() + 5 * 86_400_000).toISOString() },
    });
    await agent.patch(`/api/jobs/${ending.body._id}/stage`).send({ stage: 'completed' });
    expect((await agent.get(`/api/jobs?customer=${customer._id}`)).body.total).toBe(3);
  });

  it('calendar blocks close bays for online booking', async () => {
    const { agent, shop } = await registerShop();
    await agent.patch('/api/shop').send({ timezone: 'UTC', booking: { bays: 1, leadTimeHours: 0, slotMinutes: 60, workingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '09:00', close: '12:00', closed: false })) } });
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const block = await agent.post('/api/calendar/blocks').send({ title: 'Team meeting', kind: 'meeting', start: `${date}T09:00:00Z`, end: `${date}T10:00:00Z` });
    expect(block.status).toBe(201);
    await agent.post('/api/calendar/blocks').send({ title: 'Bad', start: `${date}T10:00:00Z`, end: `${date}T09:00:00Z` }).expect(400);
    const list = await agent.get(`/api/calendar/blocks?from=${date}T00:00:00Z&to=${date}T23:59:59Z`);
    expect(list.body).toHaveLength(1);
    const avail = await request(app).get(`/api/public/shops/${shop.slug}/availability?date=${date}`);
    expect(avail.body.slots.map((s: { available: boolean }) => s.available)).toEqual([false, true, true]);
  });
});

describe('routing', () => {
  it('optimizes mobile routes, assigns unassigned jobs and persists order + ETA', async () => {
    const { agent } = await registerShop();
    await agent.patch('/api/shop').send({ timezone: 'UTC', depot: { address: 'HQ', lat: 30.265, lng: -97.747 } });
    const tech = await agent.post('/api/team').send({ name: 'Tech One', email: `tech${Date.now()}@test.dev`, role: 'technician', password: 'supersecret1' });
    const { customer } = await createCustomerWithVehicle(agent);
    const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    // Stops placed north of the depot, created out of order.
    const offsets = [0.09, 0.03, 0.06];
    for (const [i, d] of offsets.entries()) {
      await agent
        .post('/api/jobs')
        .send({
          customer: customer._id,
          mobile: true,
          serviceAddress: `Stop ${i}`,
          geo: { lat: 30.265 + d, lng: -97.747 },
          scheduledStart: `${date}T09:00:00Z`,
          lineItems: [{ name: 'Mobile wash', unitPrice: 80, durationMinutes: 60 }],
          ...(i === 0 ? { assignees: [tech.body._id] } : {}),
        })
        .expect(201);
    }
    const before = await agent.get(`/api/routes?date=${date}`);
    expect(before.body.depot).toMatchObject({ lat: 30.265, lng: -97.747 });
    expect(before.body.unassigned).toHaveLength(2);

    const res = await agent.post('/api/routes/optimize').send({ date, assignUnassigned: true });
    expect(res.status).toBe(200);
    expect(res.body.unassigned).toHaveLength(0);
    const route = res.body.technicians.find((t: { user: { _id: string } }) => t.user._id === tech.body._id);
    // Load balancing may give other active users stops too; the tech's own stops must be ordered outward.
    const all = res.body.technicians.flatMap((t: { stops: unknown[] }) => t.stops);
    expect(all).toHaveLength(3);
    const lats = route.stops.map((s: { lat: number }) => s.lat);
    expect([...lats].sort((a, b) => a - b)).toEqual(lats);
    route.stops.forEach((s: { order: number; legKm: number; legMinutes: number; eta: string }, i: number) => {
      expect(s.order).toBe(i + 1);
      expect(s.legKm).toBeGreaterThan(0);
      expect(s.legMinutes).toBeGreaterThan(0);
      if (i > 0) expect(new Date(s.eta).getTime()).toBeGreaterThan(new Date(route.stops[i - 1].eta).getTime());
    });
    expect(route.totalKm).toBeGreaterThan(0);

    const persisted = await agent.get(`/api/jobs/${route.stops[0].job._id}`);
    expect(persisted.body.routeOrder).toBe(1);
    expect(persisted.body.eta).toBeTruthy();

    const omw = await agent.post(`/api/jobs/${route.stops[0].job._id}/on-my-way`).send({ etaMinutes: 20 });
    expect(omw.status).toBe(200);
    expect(omw.body.timeline.some((t: { message: string }) => /on the way/.test(t.message))).toBe(true);
  });
});

describe('lead forms', () => {
  it('public submission creates a lead job, customer and vehicle', async () => {
    const { agent, shop } = await registerShop();
    const form = await agent.post('/api/forms').send({
      name: 'Ceramic quote',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone', type: 'phone' },
        { key: 'vehicle', label: 'Vehicle', type: 'vehicle', required: true },
        { key: 'services', label: 'Services', type: 'services' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
    });
    expect(form.status).toBe(201);
    expect(form.body.slug).toBe('ceramic-quote');

    const pub = await request(app).get(`/api/public/forms/${shop.slug}/ceramic-quote`);
    expect(pub.status).toBe(200);
    expect(pub.body.services.length).toBeGreaterThan(0);
    const ceramic = pub.body.services.find((s: { name: string }) => s.name.startsWith('Ceramic Coating'));

    const missing = await request(app).post(`/api/public/forms/${shop.slug}/ceramic-quote`).send({ answers: { name: 'X' } });
    expect(missing.status).toBe(400);

    const ok = await request(app)
      .post(`/api/public/forms/${shop.slug}/ceramic-quote`)
      .send({ answers: { name: 'Katherine Johnson', email: 'kj@test.dev', vehicle: { year: 2022, make: 'BMW', model: 'M3' }, services: [ceramic._id], notes: 'Black paint' } });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ ok: true, message: expect.any(String) });

    const subs = await agent.get(`/api/forms/${form.body._id}/submissions`);
    expect(subs.body.total).toBe(1);
    const job = subs.body.items[0];
    expect(job.stage).toBe('lead');
    expect(job.customer.firstName).toBe('Katherine');
    expect(job.vehicle).toMatchObject({ make: 'BMW', model: 'M3', year: 2022 });
    expect(job.lineItems[0].name).toBe(ceramic.name);
    expect(job.notes).toMatch(/Notes: Black paint/);
    expect((await agent.get(`/api/forms/${form.body._id}`)).body.submissions).toBe(1);
    await sleep(200);
    const notes = await agent.get('/api/notifications');
    expect(notes.body.some((n: { title: string }) => n.title.includes('Katherine'))).toBe(true);
  });
});

describe('developer platform', () => {
  it('API keys authenticate as the owner; revoked keys fail', async () => {
    const { agent } = await registerShop({ plan: 'enterprise' });
    const created = await agent.post('/api/api-keys').send({ name: 'Zapier' });
    expect(created.status).toBe(201);
    expect(created.body.apiKey).toMatch(/^lx_live_[A-Za-z0-9]{40}$/);
    expect(created.body.key.prefix).toBe(created.body.apiKey.slice(0, 12));
    expect(created.body.key.hash).toBeUndefined();

    const viaKey = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${created.body.apiKey}`);
    expect(viaKey.status).toBe(200);
    expect(viaKey.body.user.role).toBe('owner');
    const list = await agent.get('/api/api-keys');
    expect(list.body[0].lastUsedAt).toBeTruthy();

    await agent.delete(`/api/api-keys/${created.body.key._id}`).expect(200);
    const revoked = await request(app).get('/api/customers').set('Authorization', `Bearer ${created.body.apiKey}`);
    expect(revoked.status).toBe(401);
    expect((await request(app).get('/api/customers').set('Authorization', 'Bearer lx_live_bogus')).status).toBe(401);
  });

  it('delivers signed webhooks (test + real events)', async () => {
    const received: { headers: http.IncomingHttpHeaders; body: string }[] = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received.push({ headers: req.headers, body });
        res.writeHead(204).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
    try {
      const { agent } = await registerShop({ plan: 'enterprise' });
      const hook = await agent.post('/api/webhooks').send({ url, events: ['customer.created', 'job.created'] });
      expect(hook.status).toBe(201);
      expect(hook.body.secret).toMatch(/^whsec_/);

      const test = await agent.post(`/api/webhooks/${hook.body._id}/test`);
      expect(test.body).toMatchObject({ status: 'success', code: 204, event: 'webhook.test' });
      const delivery = received[0];
      expect(delivery.headers['x-lustra-signature']).toBe(signPayload(hook.body.secret, delivery.body));
      expect(delivery.headers['x-lustra-signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(JSON.parse(delivery.body)).toMatchObject({ id: expect.stringMatching(/^evt_/), event: 'webhook.test', createdAt: expect.any(String), data: expect.any(Object) });

      await createCustomerWithVehicle(agent);
      await sleep(400);
      const events = received.map((r) => JSON.parse(r.body).event);
      expect(events).toContain('customer.created');
      const customerEvent = received.find((r) => JSON.parse(r.body).event === 'customer.created')!;
      expect(JSON.parse(customerEvent.body).data.customer.firstName).toBe('Ada');

      const stored = await agent.get('/api/webhooks');
      expect(stored.body[0].deliveries.length).toBeGreaterThanOrEqual(2);
      expect(stored.body[0].deliveries.length).toBeLessThanOrEqual(20);
    } finally {
      server.close();
    }
  });

  it('exports CSV and imports customers with upsert', async () => {
    const { agent } = await registerShop();
    await agent.post('/api/customers').send({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@test.dev', phone: '(512) 555-0100', notes: 'says "hi", ok' });

    const csv = await agent.get('/api/export/customers');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/^attachment; filename="lustra-customers-\d{4}-\d{2}-\d{2}\.csv"$/);
    const [header, row] = csv.text.replace(/^﻿/, '').split('\r\n');
    expect(header.split(',').slice(0, 4)).toEqual(['First name', 'Last name', 'Email', 'Phone']);
    expect(row).toContain('ada@test.dev');
    for (const entity of ['vehicles', 'jobs', 'invoices', 'inventory', 'payments']) {
      expect((await agent.get(`/api/export/${entity}`)).status).toBe(200);
    }
    expect((await agent.get('/api/export/secrets')).status).toBe(400);

    const imported = await agent.post('/api/import/customers').send({
      rows: [
        { firstName: 'Ada', lastName: 'Byron', email: 'ADA@test.dev', tags: 'vip; poet' }, // update by email
        { firstName: 'Phone', lastName: 'Match', phone: '512-555-0100' }, // update by phone (same customer)
        { firstName: 'Grace', lastName: 'Hopper', email: 'grace@test.dev', source: 'referral' },
        { lastName: 'NoFirstName' },
        { firstName: 'Bad', email: 'not-an-email' },
      ],
    });
    expect(imported.body).toMatchObject({ created: 1, updated: 2, skipped: 2 });
    expect(imported.body.errors.map((e: { row: number }) => e.row)).toEqual([4, 5]);
    const list = await agent.get('/api/customers?pageSize=10');
    expect(list.body.total).toBe(2);
    const ada = list.body.items.find((c: { email: string }) => c.email === 'ada@test.dev');
    expect(ada.tags).toEqual(expect.arrayContaining(['vip', 'poet']));
  });

  it('integrations list all providers and gate premium ones', async () => {
    const { agent } = await registerShop({ plan: 'express' });
    const list = await agent.get('/api/integrations');
    expect(list.body.map((i: { provider: string }) => i.provider)).toEqual(['quickbooks', 'stripe', 'square', 'zapier', 'google', 'twilio', 'carfax', 'mailchimp']);
    expect(list.body[0]).toMatchObject({ status: 'disconnected', requiredPlan: 'pro', name: 'QuickBooks Online' });
    expect((await agent.post('/api/integrations/quickbooks/connect').send({})).status).toBe(403);
    expect((await agent.post('/api/integrations/stripe/connect').send({ account: 'acct_123' })).body).toMatchObject({ status: 'connected', account: 'acct_123' });
    const sync = await agent.post('/api/integrations/stripe/sync');
    expect(sync.body).toMatchObject({ ok: true, synced: 0 });
  });
});

describe('growth & AI', () => {
  it('campaign preview counts segments and sends to reachable customers', async () => {
    const { agent } = await registerShop();
    await agent.post('/api/customers').send({ firstName: 'Tagged', phone: '5125550001', tags: ['fleet'] });
    await agent.post('/api/customers').send({ firstName: 'Optout', phone: '5125550002', tags: ['fleet'], marketingOptIn: false });
    await agent.post('/api/customers').send({ firstName: 'NoPhone', email: 'np@test.dev', tags: ['fleet'] });
    expect((await agent.get('/api/campaigns/preview?type=tag&value=fleet')).body.count).toBe(3);
    const sms = await agent.get('/api/campaigns/preview?type=tag&value=fleet&channel=sms');
    expect(sms.body.count).toBe(1);
    expect(sms.body.sample[0].firstName).toBe('Tagged');
    expect((await agent.get('/api/campaigns/preview?type=lapsed')).body.count).toBe(0);
    expect((await agent.get('/api/campaigns/preview?type=all')).body.count).toBe(3);

    const campaign = await agent.post('/api/campaigns').send({ name: 'Fleet promo', channel: 'sms', segment: { type: 'tag', value: 'fleet' }, body: 'Hi {{customer.firstName}} from {{shop.name}}!' });
    const sent = await agent.post(`/api/campaigns/${campaign.body._id}/send`);
    expect(sent.body).toMatchObject({ status: 'sent', stats: { recipients: 1, delivered: 1 } });
    expect((await agent.post(`/api/campaigns/${campaign.body._id}/send`)).status).toBe(409);
  });

  it('reviews: summary, suggestions, request flow without gating', async () => {
    const { agent } = await registerShop();
    const { customer } = await createCustomerWithVehicle(agent);
    const req1 = await agent.post('/api/reviews/request').send({ customer: customer._id });
    expect(req1.status).toBe(201);
    const pub = await request(app).get(`/api/public/reviews/${req1.body.token}`);
    expect(pub.body).toMatchObject({ customerFirstName: 'Ada', completed: false });

    // Low ratings are stored and still offered the public review link.
    const low = await request(app).post(`/api/public/reviews/${req1.body.token}`).send({ rating: 2, comment: 'Took too long to finish' });
    expect(low.body).toMatchObject({ ok: true, redirect: expect.stringContaining('google.com') });
    expect((await request(app).post(`/api/public/reviews/${req1.body.token}`).send({ rating: 5 })).status).toBe(409);

    const req2 = await agent.post('/api/reviews/request').send({ customer: customer._id });
    await request(app).post(`/api/public/reviews/${req2.body.token}`).send({ rating: 5, comment: 'Ceramic coating looks amazing' }).expect(200);

    const list = await agent.get('/api/reviews');
    expect(list.body.summary).toMatchObject({ average: 3.5, count: 2, responseRate: 0, distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 } });
    expect(list.body.summary.bySource.find((s: { source: string }) => s.source === 'lustra')).toMatchObject({ count: 2 });

    const lowReview = list.body.items.find((r: { rating: number }) => r.rating === 2);
    const suggestions = await agent.post(`/api/reviews/${lowReview._id}/suggest-reply`);
    expect(suggestions.body.suggestions).toHaveLength(3);
    expect(suggestions.body.suggestions[0]).toMatch(/Ada/);
    expect(suggestions.body.suggestions.join(' ')).toMatch(/sorry|apologize/i);

    const replied = await agent.patch(`/api/reviews/${lowReview._id}`).send({ reply: suggestions.body.suggestions[0] });
    expect(replied.body.status).toBe('replied');
    expect((await agent.get('/api/reviews')).body.summary.responseRate).toBe(50);
  });

  it('insights returns forecast, churn, opportunities and health', async () => {
    const { agent } = await registerShop();
    const res = await agent.get('/api/insights');
    expect(res.status).toBe(200);
    expect(res.body.forecast.series).toHaveLength(120);
    expect(res.body.forecast).toMatchObject({ next30: expect.any(Number), trend: expect.stringMatching(/^(up|down|flat)$/) });
    expect(res.body.forecast.series[0]).toMatchObject({ date: expect.any(String), actual: 0, predicted: expect.any(Number), lower: expect.any(Number), upper: expect.any(Number) });
    expect(res.body.forecast.series[119].actual).toBeUndefined();
    expect(Array.isArray(res.body.churnRisk)).toBe(true);
    expect(Array.isArray(res.body.opportunities)).toBe(true);
    expect(res.body.health.score).toBeGreaterThanOrEqual(0);
    expect(res.body.health.factors.length).toBeGreaterThan(3);
  });

  it('message suggestions follow the last inbound intent', async () => {
    const { agent } = await registerShop();
    const { customer } = await createCustomerWithVehicle(agent);
    const res = await agent.post('/api/messages/suggest').send({ customer: customer._id });
    expect(res.body.intent).toBe('general');
    expect(res.body.suggestions).toHaveLength(3);
  });

  it('marketplace: browsing for all, orders for pro+, receiving fills inventory', async () => {
    const express = await registerShop({ plan: 'express' });
    const browse = await express.agent.get('/api/marketplace/products?category=towels');
    expect(browse.body.items.length).toBeGreaterThan(0);
    expect(browse.body.memberPricing).toBe(false);
    expect((await express.agent.post('/api/marketplace/orders').send({ items: [{ product: browse.body.items[0]._id, qty: 1 }] })).status).toBe(403);

    const { agent } = await registerShop();
    const products = await agent.get('/api/marketplace/products?q=microfiber');
    const product = products.body.items[0];
    const order = await agent.post('/api/marketplace/orders').send({ items: [{ product: product._id, qty: 3 }] });
    expect(order.status).toBe(201);
    expect(order.body).toMatchObject({ number: 5001, status: 'placed', subtotal: Math.round(product.memberPrice * 3 * 100) / 100 });
    expect(order.body.credit).toBeCloseTo(order.body.subtotal * 0.02, 2);
    expect((await agent.get('/api/marketplace/products')).body.credits).toBeCloseTo(order.body.credit, 2);

    const received = await agent.post(`/api/marketplace/orders/${order.body._id}/receive`);
    expect(received.body.status).toBe('delivered');
    expect((await agent.post(`/api/marketplace/orders/${order.body._id}/receive`)).status).toBe(409);
    const inventory = await agent.get(`/api/inventory?q=${product.sku}`);
    expect(inventory.body.items[0]).toMatchObject({ sku: product.sku, quantity: 3 });
  });
});

describe('phase 2 plan gates', () => {
  it('express shops are blocked from pro/enterprise features but keep the all-plan ones', async () => {
    const { agent } = await registerShop({ plan: 'express' });
    const gated: [string, string, string][] = [
      ['get', '/api/campaigns', 'campaigns'],
      ['get', '/api/reviews', 'reviews'],
      ['get', '/api/insights', 'ai_insights'],
      ['get', '/api/forms', 'lead_forms'],
      ['get', '/api/documents', 'documents'],
      ['get', '/api/api-keys', 'api_access'],
      ['get', '/api/webhooks', 'api_access'],
    ];
    for (const [method, url, feature] of gated) {
      const res = await (agent as unknown as Record<string, (u: string) => request.Test>)[method](url);
      expect(res.status, url).toBe(403);
      expect(res.body.error).toMatchObject({ code: 'PLAN_REQUIRED', details: { feature } });
    }
    for (const url of ['/api/coupons', '/api/gift-cards', '/api/calendar/blocks', `/api/routes?date=2030-01-07`, '/api/export/customers', '/api/marketplace/products', '/api/integrations']) {
      expect((await agent.get(url)).status, url).toBe(200);
    }
    const pro = await registerShop({ plan: 'pro' });
    expect((await pro.agent.get('/api/insights')).status).toBe(200);
    expect((await pro.agent.get('/api/api-keys')).status).toBe(403);
  });
});
