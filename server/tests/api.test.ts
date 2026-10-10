import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, createCustomerWithVehicle, registerShop, setupDb, sleep, teardownDb } from './helpers.js';
import { Message } from '../src/models/misc.js';

beforeAll(setupDb);
afterAll(teardownDb);

describe('auth', () => {
  it('registers, reads the session, logs out and logs back in', async () => {
    const { agent, user, shop, credentials } = await registerShop();
    expect(user.role).toBe('owner');
    expect(user.passwordHash).toBeUndefined();
    expect(shop.slug).toMatch(/^test-shop-/);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(credentials.email);

    // Default catalog was provisioned
    const services = await agent.get('/api/services');
    expect(services.body.total).toBeGreaterThan(10);

    const out = await agent.post('/api/auth/logout');
    expect(out.body).toEqual({ ok: true });
    expect((await agent.get('/api/auth/me')).status).toBe(401);

    const bad = await request(app).post('/api/auth/login').send({ ...credentials, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');

    const login = await agent.post('/api/auth/login').send(credentials);
    expect(login.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('logout always clears the cookie, even without a session', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', 'lustra_token=garbage');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/lustra_token=;/);
  });

  it('rejects duplicate emails and invalid input', async () => {
    const { credentials } = await registerShop();
    const dup = await request(app).post('/api/auth/register').send({ name: 'X Y', email: credentials.email, password: 'supersecret1', shopName: 'Dup Shop' });
    expect(dup.status).toBe(409);
    const invalid = await request(app).post('/api/auth/register').send({ name: 'X', email: 'nope', password: '1', shopName: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION');
  });
});

describe('tenant isolation', () => {
  it('prevents shop A from reading or editing shop B data', async () => {
    const a = await registerShop();
    const b = await registerShop();
    const { customer } = await createCustomerWithVehicle(b.agent);
    expect((await a.agent.get(`/api/customers/${customer._id}`)).status).toBe(404);
    expect((await a.agent.patch(`/api/customers/${customer._id}`).send({ firstName: 'Hacked' })).status).toBe(404);
    const listA = await a.agent.get('/api/customers');
    expect(listA.body.items.find((c: { _id: string }) => c._id === customer._id)).toBeUndefined();
    const jobForeign = await a.agent.post('/api/jobs').send({ customer: customer._id });
    expect(jobForeign.status).toBe(404);
  });
});

describe('customers, vehicles & jobs', () => {
  it('runs a full job lifecycle with totals, stage changes and timeline', async () => {
    const { agent } = await registerShop();
    await agent.patch('/api/shop').send({ taxRate: 10 });
    const { customer, vehicle } = await createCustomerWithVehicle(agent);
    expect(customer.fullName).toBe('Ada Lovelace');
    expect(vehicle.make).toBe('Tesla');

    const patched = await agent.patch(`/api/customers/${customer._id}`).send({ notes: 'VIP' });
    expect(patched.body.notes).toBe('VIP');
    expect(patched.body.email).toBe(customer.email); // PATCH must not reset omitted fields

    const created = await agent.post('/api/jobs').send({
      customer: customer._id,
      vehicle: vehicle._id,
      scheduledStart: new Date(Date.now() + 86_400_000).toISOString(),
      lineItems: [
        { name: 'Full Detail', qty: 1, unitPrice: 250, durationMinutes: 240 },
        { name: 'Engine Bay', qty: 2, unitPrice: 50, discount: 20, durationMinutes: 60 },
      ],
    });
    expect(created.status).toBe(201);
    const job = created.body;
    expect(job.number).toBe(1001);
    expect(job.stage).toBe('scheduled');
    expect(job.totals).toEqual({ subtotal: 350, discount: 20, tax: 33, total: 363 });
    expect(new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime()).toBe(300 * 60_000);
    expect(job.customer.firstName).toBe('Ada');
    expect(job.checklist.length).toBeGreaterThan(0);

    const second = await agent.post('/api/jobs').send({ customer: customer._id, lineItems: [] });
    expect(second.body.number).toBe(1002);
    expect(second.body.stage).toBe('lead');

    const moved = await agent.patch(`/api/jobs/${job._id}/stage`).send({ stage: 'in_progress' });
    expect(moved.body.stage).toBe('in_progress');
    const done = await agent.patch(`/api/jobs/${job._id}/stage`).send({ stage: 'completed' });
    expect(done.body.completedAt).toBeTruthy();

    await agent.post(`/api/jobs/${job._id}/notes`).send({ message: 'Customer loved it' });
    const full = await agent.get(`/api/jobs/${job._id}`);
    // Automation SMS ("work started", "ready for pickup") are logged on the timeline too.
    const types = full.body.timeline.map((t: { type: string }) => t.type).filter((t: string) => t !== 'message');
    expect(types).toEqual(['created', 'stage', 'stage', 'note']);
    expect(full.body.timeline.filter((t: { type: string }) => t.type === 'message').length).toBeGreaterThanOrEqual(1);
    expect(full.body.timeline[1].message).toBe('Scheduled → In progress');

    const board = await agent.get('/api/jobs/board');
    expect(board.body.columns.completed.map((j: { _id: string }) => j._id)).toContain(job._id);
    expect(board.body.columns.lead).toHaveLength(1);

    const filtered = await agent.get('/api/jobs?stage=completed');
    expect(filtered.body.total).toBe(1);
    const byNumber = await agent.get('/api/jobs?q=1002');
    expect(byNumber.body.items[0].number).toBe(1002);

    // The "work started" automation template should have texted the customer.
    await sleep(300);
    const sms = await Message.find({ customer: customer._id, channel: 'sms' }).lean();
    expect(sms.some((m) => m.body.includes('just started'))).toBe(true);
  });
});

describe('quotes', () => {
  it('Quote Copilot suggests ceramic, PPF and correction for a swirled Model Y', async () => {
    const { agent } = await registerShop();
    const res = await agent.post('/api/quotes/copilot').send({ prompt: '2021 Tesla Model Y heavy swirls wants ceramic coating and front PPF' });
    expect(res.status).toBe(200);
    const categories = res.body.items.filter((i: { selected: boolean }) => i.selected).map((i: { category: string }) => i.category);
    expect(categories).toEqual(expect.arrayContaining(['ceramic', 'ppf', 'correction']));
    expect(res.body.detected.size).toBe('medium');
    expect(res.body.reasoning.length).toBeGreaterThan(2);
    expect(res.body.items[0].service).toMatch(/^[a-f0-9]{24}$/);
  });

  it('creates, sends, converts and approves quotes via the public portal', async () => {
    const { agent } = await registerShop();
    const { customer, vehicle } = await createCustomerWithVehicle(agent);
    const quote = await agent.post('/api/quotes').send({
      customer: customer._id,
      vehicle: vehicle._id,
      title: 'Protection package',
      items: [
        { name: 'Full Front PPF', unitPrice: 1800, durationMinutes: 600, category: 'ppf' },
        { name: 'Ceramic Window Tint', unitPrice: 400, optional: true, selected: false, category: 'tint' },
      ],
    });
    expect(quote.status).toBe(201);
    expect(quote.body.number).toBe(2001);
    expect(quote.body.totals.total).toBe(1800);

    const sent = await agent.post(`/api/quotes/${quote.body._id}/send`).send({});
    expect(sent.body.status).toBe('sent');

    // Portal resolves the quote token and marks it viewed
    const portal = await request(app).get(`/api/public/portal/${quote.body.publicToken}`);
    expect(portal.status).toBe(200);
    expect(portal.body.quote.status).toBe('viewed');
    expect(portal.body.customer).toEqual({ firstName: 'Ada', loyaltyPoints: 0 });

    const optionalId = portal.body.quote.items.find((i: { optional: boolean }) => i.optional)._id;
    const approved = await request(app)
      .post(`/api/public/quotes/${quote.body.publicToken}/approve`)
      .send({ signatureName: 'Ada Lovelace', selectedItemIds: [optionalId] });
    expect(approved.status).toBe(200);
    expect(approved.body.quote.status).toBe('approved');
    expect(approved.body.quote.totals.total).toBe(2200);
    expect(approved.body.job.portalToken).toBeTruthy();

    const again = await request(app).post(`/api/public/quotes/${quote.body.publicToken}/approve`).send({ signatureName: 'Ada Lovelace' });
    expect(again.status).toBe(409);

    // Approval created a job with both items
    const jobs = await agent.get(`/api/jobs?customer=${customer._id}`);
    expect(jobs.body.total).toBe(1);
    expect(jobs.body.items[0].lineItems).toHaveLength(2);

    // Converting a second quote with a date schedules a job
    const q2 = await agent.post('/api/quotes').send({ customer: customer._id, items: [{ name: 'Full Detail', unitPrice: 249 }] });
    const start = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const converted = await agent.post(`/api/quotes/${q2.body._id}/convert`).send({ scheduledStart: start });
    expect(converted.status).toBe(201);
    expect(converted.body.stage).toBe('scheduled');
    expect(converted.body.quote).toBe(q2.body._id);
  });
});

describe('invoices & payments', () => {
  it('moves from sent → partial → paid and updates customer value', async () => {
    const { agent } = await registerShop();
    await agent.patch('/api/shop').send({ loyalty: { enabled: true, pointsPerDollar: 2 } });
    const { customer, vehicle } = await createCustomerWithVehicle(agent);
    const job = await agent.post('/api/jobs').send({ customer: customer._id, vehicle: vehicle._id, lineItems: [{ name: 'Ceramic Coating', unitPrice: 1000 }] });
    const invoice = await agent.post(`/api/invoices/from-job/${job.body._id}`);
    expect(invoice.status).toBe(201);
    expect(invoice.body.number).toBe(3001);
    expect(invoice.body.totals.balance).toBe(1000);

    // Idempotent: creating again returns the same invoice
    const same = await agent.post(`/api/invoices/from-job/${job.body._id}`);
    expect(same.body._id).toBe(invoice.body._id);

    const sent = await agent.post(`/api/invoices/${invoice.body._id}/send`).send({});
    expect(sent.body.status).toBe('sent');

    const partial = await agent.post(`/api/invoices/${invoice.body._id}/payments`).send({ amount: 400, method: 'cash' });
    expect(partial.body.status).toBe('partial');
    expect(partial.body.totals).toMatchObject({ paid: 400, balance: 600 });

    const over = await agent.post(`/api/invoices/${invoice.body._id}/payments`).send({ amount: 900 });
    expect(over.status).toBe(400);

    // Customer pays the rest (with tip) through the portal
    const paid = await request(app).post(`/api/public/invoices/${invoice.body.publicToken}/pay`).send({ amount: 600, tip: 50 });
    expect(paid.status).toBe(200);
    expect(paid.body.invoice.status).toBe('paid');
    expect(paid.body.invoice.totals).toMatchObject({ paid: 1000, balance: 0, tips: 50 });

    const c = await agent.get(`/api/customers/${customer._id}`);
    expect(c.body.lifetimeValue).toBe(1000);
    expect(c.body.loyaltyPoints).toBe(2000);
    expect(c.body.visits).toBe(1);

    const voidPaid = await agent.post(`/api/invoices/${invoice.body._id}/void`);
    expect(voidPaid.status).toBe(409);
  });
});

describe('public booking', () => {
  it('lists availability, books a slot, and blocks double-booking a single bay', async () => {
    const { agent, shop } = await registerShop();
    await agent.patch('/api/shop').send({
      timezone: 'UTC',
      booking: { bays: 1, leadTimeHours: 0, slotMinutes: 60, workingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '09:00', close: '17:00', closed: false })) },
    });
    const info = await request(app).get(`/api/public/shops/${shop.slug}`);
    expect(info.status).toBe(200);
    expect(info.body.bookingAvailable).toBe(true);
    const service = info.body.services.find((s: { name: string }) => s.name === 'Full Detail');

    const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const avail = await request(app).get(`/api/public/shops/${shop.slug}/availability?date=${date}&services=${service._id}`);
    expect(avail.status).toBe(200);
    const slot = avail.body.slots.find((s: { available: boolean }) => s.available);
    expect(slot.start).toBe(`${date}T09:00:00.000Z`);

    const booking = {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@test.dev',
      phone: '5125550123',
      vehicle: { year: 2023, make: 'Ford', model: 'F-150', type: 'truck', color: 'Blue' },
      services: [service._id],
      start: slot.start,
    };
    const booked = await request(app).post(`/api/public/shops/${shop.slug}/bookings`).send(booking);
    expect(booked.status).toBe(201);
    expect(booked.body.job.number).toBe(1001);
    // Trucks are priced as "large" (×1.3)
    expect(booked.body.job.total).toBe(Math.round((249 * 1.3) / 5) * 5);

    const clash = await request(app).post(`/api/public/shops/${shop.slug}/bookings`).send({ ...booking, email: 'other@test.dev' });
    expect(clash.status).toBe(409);

    const after = await request(app).get(`/api/public/shops/${shop.slug}/availability?date=${date}&services=${service._id}`);
    expect(after.body.slots.find((s: { start: string }) => s.start === slot.start).available).toBe(false);

    const portal = await request(app).get(`/api/public/portal/${booked.body.job.portalToken}`);
    expect(portal.status).toBe(200);
    expect(portal.body.job.stage).toBe('scheduled');
    expect(portal.body.vehicle.make).toBe('Ford');
    expect(portal.body.shop.name).toBe(shop.name);
    expect(JSON.stringify(portal.body)).not.toContain('internalNotes');

    const customers = await agent.get('/api/customers?source=booking');
    expect(customers.body.total).toBe(1);
    await sleep(300);
    const notifications = await agent.get('/api/notifications');
    expect(Array.isArray(notifications.body)).toBe(true);
    expect(notifications.body.some((n: { kind: string; read: boolean }) => n.kind === 'booking' && n.read === false)).toBe(true);
  });

  it('requires the Pro plan for online booking', async () => {
    const { shop } = await registerShop({ plan: 'express' });
    const res = await request(app).get(`/api/public/shops/${shop.slug}/availability?date=2030-01-07`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PLAN_REQUIRED');
  });
});

describe('plan gates', () => {
  it('blocks enterprise features on the express plan and unlocks them after upgrading', async () => {
    const { agent } = await registerShop({ plan: 'express' });
    const blocked = await agent.get('/api/automations');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toMatchObject({ code: 'PLAN_REQUIRED', details: { feature: 'automations', requiredPlan: 'enterprise' } });
    expect((await agent.post('/api/quotes/copilot').send({ prompt: 'full detail' })).status).toBe(403);

    const upgraded = await agent.patch('/api/shop/plan').send({ plan: 'enterprise', planInterval: 'yearly' });
    expect(upgraded.body.plan).toBe('enterprise');
    const ok = await agent.get('/api/automations');
    expect(ok.status).toBe(200);
    expect(ok.body.items.length).toBeGreaterThan(5);
  });
});

describe('vehicles & insights', () => {
  it('decodes VINs offline', async () => {
    const { agent } = await registerShop();
    const good = await agent.get('/api/vehicles/decode-vin/1HGCM82633A004352');
    expect(good.body).toMatchObject({ valid: true, make: 'Honda', checkDigitValid: true });
    const bad = await agent.get('/api/vehicles/decode-vin/1HGCM82633A004353');
    expect(bad.body.valid).toBe(false);
  });

  it('returns the analytics overview shape', async () => {
    const { agent } = await registerShop();
    const { customer } = await createCustomerWithVehicle(agent);
    const job = await agent.post('/api/jobs').send({ customer: customer._id, lineItems: [{ name: 'Full Detail', unitPrice: 300, category: 'detailing' }] });
    await agent.patch(`/api/jobs/${job.body._id}/stage`).send({ stage: 'completed' });
    const inv = await agent.post(`/api/invoices/from-job/${job.body._id}`);
    await agent.post(`/api/invoices/${inv.body._id}/payments`).send({ amount: 300, method: 'card' });

    const res = await agent.get('/api/analytics/overview?range=7d');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.kpis).sort()).toEqual(
      ['avgTicket', 'conversionRate', 'jobsChange', 'jobsCompleted', 'newCustomers', 'outstanding', 'revenue', 'revenueChange'].sort(),
    );
    expect(res.body.kpis.revenue).toBe(300);
    expect(res.body.kpis.jobsCompleted).toBe(1);
    expect(res.body.revenueSeries).toHaveLength(7);
    expect(res.body.byCategory).toEqual([{ category: 'detailing', revenue: 300 }]);
    expect(res.body.pipeline.map((p: { stage: string }) => p.stage)).toEqual(['lead', 'quoted', 'scheduled', 'in_progress', 'quality_check']);
    for (const key of ['topServices', 'sources', 'technicians', 'upcoming']) expect(Array.isArray(res.body[key])).toBe(true);

    const search = await agent.get('/api/search?q=Ada');
    expect(search.body.customers).toHaveLength(1);
    expect(search.body.jobs).toHaveLength(1);
  });
});
