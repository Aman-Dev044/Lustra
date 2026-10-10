import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/db.js';

export const TEST_DB = 'mongodb://127.0.0.1:27017/lustra_test';
export const app = createApp();

export async function setupDb() {
  await connectDb(TEST_DB);
  await mongoose.connection.dropDatabase();
  // Unique indexes must exist before duplicate-key behaviour can be tested.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function teardownDb() {
  // Let fire-and-forget automations finish before dropping the database.
  await sleep(300);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let counter = 0;
/** Register a fresh shop and return a cookie-carrying agent. */
export async function registerShop(overrides: Record<string, unknown> = {}) {
  counter += 1;
  const agent = request.agent(app);
  const body = {
    name: `Owner ${counter}`,
    email: `owner${counter}-${Date.now()}@test.dev`,
    password: 'supersecret1',
    shopName: `Test Shop ${counter}`,
    industry: 'detailing',
    ...overrides,
  };
  const res = await agent.post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user, shop: res.body.shop, credentials: { email: body.email, password: body.password } };
}

export async function createCustomerWithVehicle(agent: ReturnType<typeof request.agent>) {
  const customer = await agent.post('/api/customers').send({ firstName: 'Ada', lastName: 'Lovelace', email: `ada${Date.now()}@test.dev`, phone: '5125550199' });
  const vehicle = await agent
    .post('/api/vehicles')
    .send({ customer: customer.body._id, type: 'suv', year: 2021, make: 'Tesla', model: 'Model Y', color: 'Pearl White', size: 'medium' });
  return { customer: customer.body, vehicle: vehicle.body };
}
