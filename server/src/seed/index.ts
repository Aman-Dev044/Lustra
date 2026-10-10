/**
 * Demo data: `npm run seed` → "Apex Auto Spa" (enterprise + visualizer), login demo@lustra.app / demo1234.
 * Deterministic (seeded PRNG) and idempotent: the demo shop's data is removed first.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { uploadRoot } from '../lib/uploads.js';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { connectDb, disconnectDb } from '../db.js';
import {
  ActivityLog, Automation, Certificate, Counter, Customer, Inspection, InventoryItem, Invoice, Job, Lead, Membership,
  MembershipPlan, Message, Notification, Quote, ScheduledAction, Service, Shop, TimeEntry, User, Vehicle,
  type JobStage, type VehicleSize, type VehicleType,
} from '../models/index.js';
import { AUTOMATION_TEMPLATES, defaultServices } from './defaults.js';
import { computeTotals, round2 } from '../lib/money.js';
import { zonedTime } from '../lib/availability.js';
import { checkDigit } from '../lib/vin.js';
import { DEFAULT_CHECKLIST } from '../lib/jobs.js';
import { createRandom } from './random.js';
import { seedPhase2, PHASE2_MODELS } from './phase2.js';

export const DEMO = { slug: 'apex-auto-spa', email: 'demo@lustra.app', password: 'demo1234' };
// Demo data follows the machine's timezone so times look right wherever the demo runs (override with SEED_TIMEZONE).
const TZ = process.env.SEED_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
const DAY = 86_400_000;

const { rand, int, pick, chance, weighted, shuffle } = createRandom(20261010);

/* ---------- reference data ---------- */
const FIRST = ['James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Logan', 'Charlotte', 'Elijah', 'Amelia', 'Aiden', 'Harper', 'Carter', 'Evelyn', 'Jackson', 'Abigail', 'Sebastian', 'Emily', 'Mateo', 'Ella', 'Jack', 'Scarlett', 'Owen', 'Grace', 'Wyatt', 'Chloe', 'Luke', 'Camila', 'Gabriel', 'Zoe', 'Anthony', 'Nora', 'Isaac', 'Lily', 'Dylan', 'Hannah', 'Leo', 'Layla', 'Julian', 'Riley', 'Hudson', 'Aria', 'Ryan', 'Ellie', 'Nathan', 'Stella', 'Caleb', 'Violet', 'Christian', 'Aurora', 'Andrew', 'Lucy', 'Josiah', 'Paisley', 'Samuel', 'Savannah', 'Ravi', 'Ananya', 'Wei', 'Mei', 'Omar', 'Fatima', 'Diego', 'Valentina'];
const LAST = ['Johnson', 'Williams', 'Brown', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Patel', 'Chen', 'Kim', 'Okafor', 'Haddad', 'Novak'];
const STREETS = ['Barton Springs Rd', 'S Congress Ave', 'Rainey St', 'E 6th St', 'Westlake Dr', 'Bee Cave Rd', 'Lamar Blvd', 'Manor Rd', 'Burnet Rd', 'Mopac Expy', 'Riverside Dr', 'Exposition Blvd'];

const CARS: { make: string; model: string; type: VehicleType; size: VehicleSize; wmi: string; trims?: string[] }[] = [
  { make: 'Tesla', model: 'Model 3', type: 'car', size: 'small', wmi: '5YJ', trims: ['Long Range', 'Performance'] },
  { make: 'Tesla', model: 'Model Y', type: 'suv', size: 'medium', wmi: '7SA', trims: ['Long Range', 'Performance'] },
  { make: 'Tesla', model: 'Model S', type: 'car', size: 'medium', wmi: '5YJ', trims: ['Plaid'] },
  { make: 'Tesla', model: 'Cybertruck', type: 'truck', size: 'large', wmi: '7G2', trims: ['AWD', 'Cyberbeast'] },
  { make: 'Porsche', model: '911', type: 'car', size: 'small', wmi: 'WP0', trims: ['Carrera S', 'GT3', 'Turbo S'] },
  { make: 'Porsche', model: 'Taycan', type: 'car', size: 'medium', wmi: 'WP0', trims: ['4S', 'Turbo'] },
  { make: 'Porsche', model: 'Cayenne', type: 'suv', size: 'large', wmi: 'WP1', trims: ['S', 'Coupe'] },
  { make: 'BMW', model: 'M3', type: 'car', size: 'medium', wmi: 'WBS', trims: ['Competition'] },
  { make: 'BMW', model: 'M4', type: 'car', size: 'small', wmi: 'WBS', trims: ['Competition xDrive'] },
  { make: 'BMW', model: 'X5', type: 'suv', size: 'large', wmi: '5UX', trims: ['xDrive40i', 'M60i'] },
  { make: 'Mercedes-Benz', model: 'G 63 AMG', type: 'suv', size: 'large', wmi: 'W1N' },
  { make: 'Mercedes-Benz', model: 'C 300', type: 'car', size: 'medium', wmi: 'W1K' },
  { make: 'Mercedes-Benz', model: 'Sprinter', type: 'van', size: 'xl', wmi: 'W1X' },
  { make: 'Ford', model: 'F-150', type: 'truck', size: 'large', wmi: '1FT', trims: ['Lariat', 'Raptor', 'Platinum'] },
  { make: 'Ford', model: 'Mustang', type: 'car', size: 'medium', wmi: '1FA', trims: ['GT', 'Dark Horse'] },
  { make: 'Ford', model: 'Bronco', type: 'suv', size: 'large', wmi: '1FM', trims: ['Badlands', 'Wildtrak'] },
  { make: 'Chevrolet', model: 'Corvette', type: 'car', size: 'small', wmi: '1G1', trims: ['Stingray', 'Z06'] },
  { make: 'Chevrolet', model: 'Silverado 1500', type: 'truck', size: 'large', wmi: '1GC', trims: ['LTZ', 'High Country'] },
  { make: 'Chevrolet', model: 'Tahoe', type: 'suv', size: 'large', wmi: '1GN', trims: ['Z71', 'RST'] },
  { make: 'Toyota', model: '4Runner', type: 'suv', size: 'large', wmi: 'JTE', trims: ['TRD Pro', 'Limited'] },
  { make: 'Toyota', model: 'Tacoma', type: 'truck', size: 'large', wmi: '3TM', trims: ['TRD Off-Road'] },
  { make: 'Toyota', model: 'Camry', type: 'car', size: 'medium', wmi: '4T1', trims: ['XSE'] },
  { make: 'Lexus', model: 'RX 350', type: 'suv', size: 'medium', wmi: '2T2' },
  { make: 'Rivian', model: 'R1S', type: 'suv', size: 'large', wmi: '7PD', trims: ['Adventure'] },
  { make: 'Rivian', model: 'R1T', type: 'truck', size: 'large', wmi: '7FC', trims: ['Adventure'] },
  { make: 'Ram', model: '2500', type: 'truck', size: 'xl', wmi: '3C6', trims: ['Laramie', 'Power Wagon'] },
  { make: 'Land Rover', model: 'Range Rover', type: 'suv', size: 'large', wmi: 'SAL', trims: ['Autobiography', 'Sport'] },
  { make: 'Audi', model: 'RS 6 Avant', type: 'car', size: 'medium', wmi: 'WUA' },
  { make: 'Audi', model: 'Q7', type: 'suv', size: 'large', wmi: 'WA1' },
  { make: 'Honda', model: 'Civic Type R', type: 'car', size: 'small', wmi: 'SHH' },
  { make: 'Lamborghini', model: 'Urus', type: 'suv', size: 'large', wmi: 'ZPB' },
  { make: 'Jeep', model: 'Wrangler', type: 'suv', size: 'large', wmi: '1C4', trims: ['Rubicon', 'Sahara'] },
  { make: 'Cadillac', model: 'Escalade', type: 'suv', size: 'xl', wmi: '1GY', trims: ['Sport Platinum'] },
  { make: 'Hyundai', model: 'Ioniq 5', type: 'suv', size: 'medium', wmi: 'KM8', trims: ['N'] },
];
const COLORS = ['Obsidian Black', 'Pearl White', 'Midnight Silver', 'Deep Blue Metallic', 'Ultra Red', 'Chalk', 'Nardo Gray', 'Racing Green', 'Frozen Blue', 'Satin Bronze', 'Velvet Red', 'Glacier White', 'Gunmetal'];
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
const YEAR_CODES: Record<number, string> = { 2016: 'G', 2017: 'H', 2018: 'J', 2019: 'K', 2020: 'L', 2021: 'M', 2022: 'N', 2023: 'P', 2024: 'R', 2025: 'S', 2026: 'T', 2027: 'V' };

function makeVin(wmi: string, year: number): string {
  const body = Array.from({ length: 14 }, () => pick(VIN_CHARS.split('')));
  body[6] = YEAR_CODES[year] ?? 'R'; // position 10 overall
  const draft = `${wmi}${body.slice(0, 5).join('')}0${body.slice(6).join('')}`;
  return `${draft.slice(0, 8)}${checkDigit(draft)}${draft.slice(9)}`;
}

/** A local-time instant on a given day (days relative to today). */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const base = new Date(Date.now() + dayOffset * DAY);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(base);
  return zonedTime(date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, TZ);
}
const weekday = (d: Date) => new Date(d.toLocaleString('en-US', { timeZone: TZ })).getDay();

async function wipe(shopId: Types.ObjectId) {
  const models = [ActivityLog, Automation, Certificate, Counter, Customer, Inspection, InventoryItem, Invoice, Job, Lead, Membership, MembershipPlan, Message, Notification, Quote, ScheduledAction, Service, TimeEntry, User, Vehicle, ...PHASE2_MODELS];
  await Promise.all(models.map((m) => (m as unknown as typeof Job).deleteMany({ shop: shopId })));
  await Shop.deleteOne({ _id: shopId });
  await fs.rm(path.join(uploadRoot, String(shopId)), { recursive: true, force: true });
}

export async function seed() {
  const existing = await Shop.findOne({ slug: DEMO.slug });
  if (existing) await wipe(existing._id);
  await User.deleteMany({ email: { $in: [DEMO.email, 'priya@apexautospa.com', 'diego@apexautospa.com', 'jordan@apexautospa.com', 'tyler@apexautospa.com', 'aaliyah@apexautospa.com'] } });

  /* ---------- shop & team ---------- */
  const shop = await Shop.create({
    name: 'Apex Auto Spa',
    slug: DEMO.slug,
    industry: 'detailing',
    phone: '(512) 555-0142',
    email: 'hello@apexautospa.com',
    website: 'https://apexautospa.com',
    address: '2100 S Lamar Blvd, Austin, TX 78704',
    timezone: TZ,
    taxRate: 8.25,
    brandColor: '#7c5cff',
    plan: 'enterprise',
    planInterval: 'yearly',
    addOns: { visualizer: true },
    booking: { enabled: true, headline: 'Book detailing, ceramic & PPF in under a minute', leadTimeHours: 12, slotMinutes: 30, bays: 3, requireDeposit: false, depositPercent: 20 },
    locations: [
      { name: 'Austin HQ', address: '2100 S Lamar Blvd, Austin, TX 78704' },
      { name: 'Round Rock Studio', address: '450 University Blvd, Round Rock, TX 78665' },
    ],
    loyalty: { enabled: true, pointsPerDollar: 1, redeemValue: 0.05 },
    onboarding: { completedSteps: ['profile', 'services', 'booking', 'team', 'payments'] },
  });
  const S = shop._id;
  const hash = await bcrypt.hash(DEMO.password, 10);
  const team = await User.insertMany([
    { shop: S, name: 'Marcus Reed', email: DEMO.email, passwordHash: hash, role: 'owner', phone: '(512) 555-0100', avatarColor: '#7c5cff', hourlyRate: 0, commissionPercent: 0 },
    { shop: S, name: 'Priya Shah', email: 'priya@apexautospa.com', passwordHash: hash, role: 'admin', phone: '(512) 555-0101', avatarColor: '#22d3ee', hourlyRate: 32, commissionPercent: 3 },
    { shop: S, name: 'Diego Alvarez', email: 'diego@apexautospa.com', passwordHash: hash, role: 'manager', phone: '(512) 555-0102', avatarColor: '#f472b6', hourlyRate: 30, commissionPercent: 5 },
    { shop: S, name: 'Jordan Kim', email: 'jordan@apexautospa.com', passwordHash: hash, role: 'technician', phone: '(512) 555-0103', avatarColor: '#34d399', hourlyRate: 26, commissionPercent: 8 },
    { shop: S, name: 'Tyler Brooks', email: 'tyler@apexautospa.com', passwordHash: hash, role: 'technician', phone: '(512) 555-0104', avatarColor: '#fbbf24', hourlyRate: 24, commissionPercent: 8 },
    { shop: S, name: 'Aaliyah Monroe', email: 'aaliyah@apexautospa.com', passwordHash: hash, role: 'technician', phone: '(512) 555-0105', avatarColor: '#60a5fa', hourlyRate: 27, commissionPercent: 10 },
  ]);
  const owner = team[0];
  const techs = team.slice(2);

  /* ---------- services ---------- */
  const services = await Service.insertMany(defaultServices('detailing').map((s) => ({ ...s, shop: S })));
  const svc = (name: string) => services.find((s) => s.name === name)!;
  const PACKAGES: readonly (readonly [string[], number])[] = [
    [['Maintenance Wash'], 16],
    [['Full Detail'], 18],
    [['Interior Deep Clean'], 8],
    [['Full Detail', 'Engine Bay Detail'], 4],
    [['Exterior Decon & Sealant'], 5],
    [['Paint Correction — Stage 1', 'Ceramic Coating — 1 Year'], 7],
    [['Paint Correction — Stage 1', 'Ceramic Coating — 5 Year'], 8],
    [['Paint Correction — Stage 2', 'Ceramic Coating — 9H Lifetime'], 4],
    [['Full Front PPF'], 6],
    [['Full Front PPF', 'Ceramic Coating — 5 Year'], 4],
    [['Track Pack PPF', 'Ceramic Coating — 5 Year'], 2],
    [['Full Body PPF'], 1.4],
    [['Ceramic Window Tint'], 9],
    [['Ceramic Window Tint', 'Windshield Tint'], 4],
    [['Chrome Delete'], 3],
    [['Color Change Wrap'], 1.2],
    [['Paint Correction — Stage 2'], 2],
  ];

  /* ---------- customers & vehicles ---------- */
  const customerDocs = Array.from({ length: 84 }, (_, i) => {
    const firstName = FIRST[i % FIRST.length];
    const lastName = pick(LAST);
    const createdAt = new Date(Date.now() - int(2, 150) * DAY - int(0, 36_000_000));
    return {
      shop: S,
      firstName,
      lastName,
      email: `${firstName}.${lastName}${i}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@example.com',
      phone: `(512) 555-${String(1000 + i * 37).slice(-4)}`,
      address: `${int(100, 9800)} ${pick(STREETS)}, Austin, TX 787${int(1, 49).toString().padStart(2, '0')}`,
      company: chance(0.08) ? pick(['Lone Star Realty', 'Hill Country Fleet', 'Eastside Coffee Co.', 'Barton Dental']) : '',
      tags: shuffle(['vip', 'fleet', 'enthusiast', 'referral-partner', 'ceramic-owner', 'ppf-owner']).slice(0, weighted([[0, 6], [1, 3], [2, 1]] as const)),
      source: weighted([['google', 30], ['instagram', 18], ['referral', 20], ['website', 12], ['booking', 10], ['facebook', 5], ['walk-in', 5]] as const),
      notes: chance(0.2) ? pick(['Prefers early drop-off.', 'Garage kept, very particular about swirls.', 'Has a dog — expect pet hair.', 'Pays with Amex, wants receipts emailed.', 'Owns multiple vehicles; ask about fleet pricing.']) : '',
      marketingOptIn: chance(0.9),
      createdAt,
      updatedAt: createdAt,
    };
  });
  const customers = await Customer.insertMany(customerDocs);

  const vehicleDocs = customers.flatMap((c, i) => {
    const count = i % 6 === 0 ? 2 : i % 17 === 0 ? 3 : 1;
    return Array.from({ length: count }, () => {
      const car = pick(CARS);
      const year = int(2018, 2026);
      return {
        shop: S,
        customer: c._id,
        type: car.type,
        year,
        make: car.make,
        model: car.model,
        trim: car.trims ? pick(car.trims) : '',
        color: pick(COLORS),
        vin: makeVin(car.wmi, year),
        plate: `${pick(['LXR', 'TXA', 'KDN', 'BRV', 'ATX', 'HCX'])}-${int(1000, 9999)}`,
        size: car.size,
      };
    });
  });
  const vehicles = await Vehicle.insertMany(vehicleDocs);
  const vehiclesByCustomer = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const list = vehiclesByCustomer.get(String(v.customer)) ?? [];
    list.push(v);
    vehiclesByCustomer.set(String(v.customer), list);
  }

  /* ---------- jobs ---------- */
  type JobSeed = Record<string, unknown> & { _id: Types.ObjectId; number: number; stage: JobStage; customer: Types.ObjectId; vehicle: Types.ObjectId; lineItems: { name: string; category: string; qty: number; unitPrice: number; discount: number; durationMinutes: number; service: Types.ObjectId; assignee?: Types.ObjectId; status: string }[]; totals: ReturnType<typeof computeTotals>; scheduledStart?: Date; scheduledEnd?: Date; completedAt?: Date; createdAt: Date };
  const jobs: JobSeed[] = [];
  let jobNumber = 1000;
  const repeatCustomers = shuffle([...customers]).slice(0, 30);

  function buildJob(dayOffset: number, stage: JobStage): JobSeed {
    const customer = chance(0.35) ? pick(repeatCustomers) : pick(customers);
    const vehicle = pick(vehiclesByCustomer.get(String(customer._id))!);
    const pkg = weighted(PACKAGES);
    const size = vehicle.size as VehicleSize;
    const assignees = shuffle([...techs]).slice(0, pkg.length > 1 || chance(0.25) ? 2 : 1).map((u) => u._id);
    const lineItems = pkg.map((name, idx) => {
      const s = svc(name);
      const price = Math.round((s.basePrice * (s.sizeMultipliers?.[size] ?? 1)) / 5) * 5;
      return {
        service: s._id,
        name: s.name,
        description: s.description,
        category: s.category,
        qty: 1,
        unitPrice: price,
        discount: chance(0.08) ? round2(price * 0.1) : 0,
        durationMinutes: s.durationMinutes,
        assignee: assignees[idx % assignees.length],
        status: stage === 'completed' ? 'done' : stage === 'in_progress' && idx === 0 ? 'in_progress' : 'pending',
      };
    });
    const minutes = lineItems.reduce((s, l) => s + l.durationMinutes, 0);
    let startDay = dayOffset;
    while ([0].includes(weekday(at(startDay, 12)))) startDay -= 1; // closed Sundays
    const start = at(startDay, pick([8, 8, 9, 9, 10, 11, 13, 14]), pick([0, 0, 30]));
    const end = new Date(start.getTime() + Math.max(minutes, 60) * 60_000);
    const scheduled = !['lead', 'quoted'].includes(stage);
    const createdAt = new Date(start.getTime() - int(1, 12) * DAY);
    const number = ++jobNumber;
    const totals = computeTotals(lineItems, 0, 8.25);
    const timeline: { type: string; message: string; at: Date; by?: Types.ObjectId }[] = [
      { type: 'created', message: stage === 'lead' ? 'Lead captured' : 'Job created', at: createdAt, by: owner._id },
    ];
    if (scheduled) timeline.push({ type: 'stage', message: 'Lead → Scheduled', at: new Date(createdAt.getTime() + 3_600_000) });
    if (['in_progress', 'quality_check', 'completed'].includes(stage)) timeline.push({ type: 'stage', message: 'Scheduled → In progress', at: start });
    if (['quality_check', 'completed'].includes(stage)) timeline.push({ type: 'stage', message: 'In progress → Quality check', at: new Date(end.getTime() - 30 * 60_000) });
    if (stage === 'completed') timeline.push({ type: 'stage', message: 'Quality check → Completed', at: end });
    if (stage === 'cancelled') timeline.push({ type: 'stage', message: 'Scheduled → Cancelled', at: new Date(start.getTime() - DAY) });
    const checklistDone = stage === 'completed' ? 5 : stage === 'quality_check' ? 4 : stage === 'in_progress' ? 2 : 0;

    return {
      _id: new Types.ObjectId(),
      shop: S,
      number,
      customer: customer._id,
      vehicle: vehicle._id,
      title: pkg.join(' + '),
      stage,
      priority: weighted([['normal', 80], ['high', 12], ['rush', 4], ['low', 4]] as const),
      lineItems,
      scheduledStart: scheduled ? start : undefined,
      scheduledEnd: scheduled ? end : undefined,
      bay: scheduled ? int(1, 3) : undefined,
      location: chance(0.8) ? shop.locations[0]._id : shop.locations[1]._id,
      assignees,
      notes: chance(0.15) ? pick(['Customer will wait in lounge.', 'Drop-off night before.', 'Pickup by spouse.', 'Focus on driver seat bolster wear.']) : '',
      internalNotes: chance(0.1) ? 'Check for previous respray on rear quarter.' : '',
      tags: pkg.some((p) => /Ceramic|PPF/.test(p)) ? ['protection'] : [],
      source: weighted([['manual', 50], ['booking', 30], ['quote', 20]] as const),
      portalToken: nanoid(24),
      timeline,
      checklist: DEFAULT_CHECKLIST.map((label, i) => ({ label, done: i < checklistDone })),
      totals,
      taxRate: 8.25,
      completedAt: stage === 'completed' ? end : undefined,
      createdAt,
      updatedAt: stage === 'completed' ? end : createdAt,
    };
  }

  // Past 120 days: busier recently (growth curve).
  for (let d = -120; d <= -1; d++) {
    const growth = 0.9 + ((d + 120) / 120) * 1.3;
    const count = Math.max(0, Math.round(growth + (rand() - 0.5) * 1.6));
    for (let k = 0; k < count; k++) {
      const stage: JobStage = d >= -1 ? pick(['quality_check', 'completed'] as const) : chance(0.05) ? 'cancelled' : 'completed';
      jobs.push(buildJob(d, stage));
    }
  }
  // Today
  jobs.push(buildJob(0, 'in_progress'), buildJob(0, 'in_progress'), buildJob(0, 'quality_check'), buildJob(0, 'scheduled'));
  // Next 21 days
  for (let d = 1; d <= 21; d++) {
    const count = d <= 7 ? int(1, 3) : int(0, 2);
    for (let k = 0; k < count; k++) jobs.push(buildJob(d, 'scheduled'));
  }
  // Open pipeline without dates
  for (let k = 0; k < 9; k++) jobs.push(buildJob(int(1, 6), 'lead'));
  for (let k = 0; k < 7; k++) jobs.push(buildJob(int(1, 6), 'quoted'));
  for (const j of jobs.filter((x) => x.stage === 'lead' || x.stage === 'quoted')) {
    j.createdAt = new Date(Date.now() - int(0, 5) * DAY - int(0, 20) * 3_600_000);
  }

  /* ---------- quotes ---------- */
  const quotes: Record<string, unknown>[] = [];
  let quoteNumber = 2000;
  const quoteFor = (job: JobSeed, status: string, aiGenerated: boolean) => {
    const createdAt = new Date(job.createdAt.getTime() - DAY);
    const items = job.lineItems.map((li) => ({ ...li, optional: false, selected: true }));
    if (chance(0.5)) {
      const upsell = svc(pick(['Ceramic Window Tint', 'Engine Bay Detail', 'Interior Deep Clean', 'Windshield Tint']));
      items.push({ service: upsell._id, name: upsell.name, description: upsell.description, category: upsell.category, qty: 1, unitPrice: upsell.basePrice, discount: 0, durationMinutes: upsell.durationMinutes, status: 'pending', optional: true, selected: status === 'approved' && chance(0.4) } as never);
    }
    const quote = {
      _id: new Types.ObjectId(),
      shop: S,
      number: ++quoteNumber,
      customer: job.customer,
      vehicle: job.vehicle,
      job: job._id,
      title: job.title,
      items,
      discount: 0,
      taxRate: 8.25,
      totals: computeTotals(items, 0, 8.25),
      status,
      validUntil: new Date(createdAt.getTime() + 30 * DAY),
      notes: 'Pricing includes a complimentary maintenance wash within 30 days.',
      publicToken: nanoid(24),
      sentAt: status !== 'draft' ? new Date(createdAt.getTime() + 3_600_000) : undefined,
      approvedAt: status === 'approved' ? new Date(createdAt.getTime() + 20 * 3_600_000) : undefined,
      signatureName: status === 'approved' ? 'Approved via portal' : '',
      aiGenerated,
      copilotPrompt: aiGenerated ? `${job.title} for a ${String(job.title).length > 20 ? 'customer SUV' : 'daily driver'}` : '',
      createdAt,
      updatedAt: createdAt,
    };
    job.quote = quote._id;
    quotes.push(quote);
  };
  for (const job of jobs) {
    const pricey = job.totals.total > 600;
    if (job.stage === 'quoted') quoteFor(job, pick(['sent', 'viewed', 'viewed']), chance(0.5));
    else if (job.stage === 'lead' && chance(0.4)) quoteFor(job, 'draft', chance(0.6));
    else if (pricey && job.stage !== 'cancelled') quoteFor(job, 'approved', chance(0.35));
    else if (job.stage === 'cancelled') quoteFor(job, 'declined', false);
  }

  /* ---------- invoices & payments ---------- */
  const invoices: Record<string, unknown>[] = [];
  let invoiceNumber = 3000;
  const paidByCustomer = new Map<string, { value: number; visits: number; last: Date }>();
  for (const job of jobs.filter((j) => j.stage === 'completed' || j.stage === 'quality_check')) {
    const end = job.scheduledEnd ?? job.createdAt;
    const ageDays = (Date.now() - end.getTime()) / DAY;
    const discount = round2(job.lineItems.reduce((s, l) => s + l.discount, 0));
    const items = job.lineItems.map((l) => ({ _id: new Types.ObjectId(), name: l.name, description: '', qty: l.qty, unitPrice: l.unitPrice }));
    const base = computeTotals(items, discount, 8.25);
    let outcome = weighted([['paid', 91], ['partial', 4], ['unpaid', 5]] as const);
    if (job.stage === 'quality_check') outcome = 'unpaid';
    if (ageDays > 21 && outcome !== 'paid') outcome = chance(0.75) ? 'paid' : outcome;
    const payments: { _id: Types.ObjectId; amount: number; tip: number; method: string; reference: string; at: Date; by: Types.ObjectId }[] = [];
    const payAt = new Date(end.getTime() + int(0, 36) * 3_600_000);
    const method = weighted([['card', 70], ['cash', 8], ['ach', 8], ['financing', 9], ['check', 5]] as const);
    const tip = method === 'card' && chance(0.35) ? Math.round(base.total * pick([0.05, 0.1, 0.15]) / 5) * 5 : 0;
    if (outcome === 'paid') {
      if (base.total > 1500 && chance(0.5)) {
        const deposit = round2(base.total * 0.3);
        payments.push({ _id: new Types.ObjectId(), amount: deposit, tip: 0, method, reference: 'Deposit', at: new Date(job.createdAt.getTime() + 2 * 3_600_000), by: owner._id });
        payments.push({ _id: new Types.ObjectId(), amount: round2(base.total - deposit), tip, method, reference: '', at: payAt, by: owner._id });
      } else {
        payments.push({ _id: new Types.ObjectId(), amount: base.total, tip, method, reference: '', at: payAt, by: owner._id });
      }
    } else if (outcome === 'partial') {
      payments.push({ _id: new Types.ObjectId(), amount: round2(base.total * 0.4), tip: 0, method, reference: 'Deposit', at: payAt, by: owner._id });
    }
    const paid = round2(payments.reduce((s, p) => s + p.amount, 0));
    const balance = round2(Math.max(0, base.total - paid));
    const dueDate = new Date(end.getTime() + 7 * DAY);
    const status = balance === 0 ? 'paid' : dueDate < new Date() ? 'overdue' : paid > 0 ? 'partial' : 'sent';
    const invoice = {
      _id: new Types.ObjectId(),
      shop: S,
      number: ++invoiceNumber,
      customer: job.customer,
      job: job._id,
      items,
      discount,
      taxRate: 8.25,
      totals: { ...base, tips: round2(payments.reduce((s, p) => s + p.tip, 0)), paid, balance },
      status,
      dueDate,
      publicToken: nanoid(24),
      payments,
      sentAt: end,
      paidAt: balance === 0 ? payments[payments.length - 1]?.at : undefined,
      createdAt: end,
      updatedAt: payments[payments.length - 1]?.at ?? end,
    };
    job.invoice = invoice._id;
    invoices.push(invoice);
    if (paid > 0) {
      const key = String(job.customer);
      const prev = paidByCustomer.get(key) ?? { value: 0, visits: 0, last: new Date(0) };
      paidByCustomer.set(key, { value: prev.value + paid, visits: prev.visits + (balance === 0 ? 1 : 0), last: payAt > prev.last ? payAt : prev.last });
    }
    for (const p of payments) {
      job.timeline = [...(job.timeline as object[]), { type: 'payment', message: `Payment of $${p.amount.toFixed(2)}${p.tip ? ` (+$${p.tip.toFixed(2)} tip)` : ''} received via ${p.method}`, at: p.at, by: owner._id }];
    }
  }

  await Job.insertMany(jobs);
  await Quote.insertMany(quotes);
  await Invoice.insertMany(invoices);
  await Counter.insertMany([
    { shop: S, key: 'job', seq: jobNumber - 1000 },
    { shop: S, key: 'quote', seq: quoteNumber - 2000 },
    { shop: S, key: 'invoice', seq: invoiceNumber - 3000 },
  ]);
  await Customer.bulkWrite(
    [...paidByCustomer.entries()].map(([id, v]) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: {
          $set: { lifetimeValue: round2(v.value), visits: v.visits, lastVisitAt: v.last, loyaltyPoints: Math.floor(v.value) },
          ...(v.visits > 1 ? { $addToSet: { tags: 'repeat' } } : {}),
        },
      },
    })),
  );

  /* ---------- certificates ---------- */
  const certJobs = jobs.filter((j) => j.stage === 'completed' && j.lineItems.some((l) => l.category === 'ceramic' || l.category === 'ppf'));
  const usedCodes = new Set<string>();
  const codeChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const certificates = certJobs.flatMap((job) =>
    job.lineItems
      .filter((l) => l.category === 'ceramic' || l.category === 'ppf')
      .map((l) => {
        let code = '';
        do code = `LX-${Array.from({ length: 6 }, () => pick(codeChars.split(''))).join('')}`;
        while (usedCodes.has(code));
        usedCodes.add(code);
        const years = /1 Year/.test(l.name) ? 1 : /5 Year/.test(l.name) ? 5 : l.category === 'ppf' ? 10 : null;
        const installedAt = job.completedAt!;
        return {
          shop: S,
          code,
          customer: job.customer,
          vehicle: job.vehicle,
          job: job._id,
          product: l.category === 'ppf' ? `XPEL Ultimate Plus — ${l.name.replace(' PPF', '')}` : `Lustra Pro ${l.name.replace('Ceramic Coating — ', '')} Ceramic`,
          coverage: l.category === 'ppf' ? l.name.replace(' PPF', '') : 'Paint, wheels faces & glass',
          installedAt,
          expiresAt: years ? new Date(installedAt.getTime() + years * 365 * DAY) : undefined,
          installer: l.assignee,
          status: 'active',
        };
      }),
  );
  await Certificate.insertMany(certificates);

  /* ---------- inspections ---------- */
  const inspectionJobs = shuffle(jobs.filter((j) => ['completed', 'in_progress', 'quality_check', 'scheduled'].includes(j.stage))).slice(0, 34);
  await Inspection.insertMany(
    inspectionJobs.map((job) => {
      const signed = job.stage !== 'scheduled';
      return {
        shop: S,
        job: job._id,
        customer: job.customer,
        vehicle: job.vehicle,
        type: 'pre',
        status: signed ? 'signed' : 'awaiting_signature',
        markers: Array.from({ length: int(1, 6) }, () => ({
          view: pick(['top', 'left', 'right', 'front', 'rear'] as const),
          x: int(12, 88),
          y: int(15, 85),
          kind: weighted([['swirl', 30], ['scratch', 25], ['chip', 25], ['dent', 8], ['stain', 7], ['crack', 5]] as const),
          severity: weighted([[1, 55], [2, 33], [3, 12]] as const),
          note: pick(['Pre-existing, documented with customer', 'Light, should polish out', 'Deep — below clear coat', 'Customer aware', '']),
        })),
        media: [],
        notes: 'Walk-around completed under LED inspection lights.',
        publicToken: nanoid(24),
        signature: signed ? { name: 'Signed via portal', signedAt: job.scheduledStart } : { name: '' },
        createdAt: job.scheduledStart ?? job.createdAt,
      };
    }),
  );

  /* ---------- inventory ---------- */
  const inventory = [
    ['Gyeon Q² Mohs EVO 50ml', 'GY-MOHS-50', 'Coatings', 'kit', 14, 6, 54, 'Gyeon USA'],
    ['CarPro CQUARTZ UK 3.0 30ml', 'CP-CQUK3', 'Coatings', 'kit', 4, 6, 49, 'CarPro'],
    ['XPEL Ultimate Plus 60" roll', 'XP-UP-60', 'Film', 'ft', 182, 100, 11.5, 'XPEL'],
    ['XPEL Prime XR Plus 40" roll', 'XP-PXR-40', 'Tint', 'ft', 64, 80, 3.8, 'XPEL'],
    ['3M Crystalline 90 windshield film', '3M-CR90', 'Tint', 'sheet', 9, 5, 68, '3M'],
    ['Avery SW900 Satin Black 60"', 'AV-SW900-SB', 'Vinyl', 'ft', 46, 25, 7.2, 'Avery Dennison'],
    ['Koch-Chemie Gsf Gentle Snow Foam 5L', 'KC-GSF-5', 'Chemicals', 'jug', 3, 4, 42, 'Koch-Chemie'],
    ['CarPro IronX 4L', 'CP-IRONX-4', 'Chemicals', 'jug', 5, 3, 78, 'CarPro'],
    ['Rupes D-A Fine Polish 1L', 'RP-DAF-1', 'Polish', 'bottle', 7, 4, 34, 'Rupes'],
    ['Rupes Zephir Compound 1L', 'RP-ZEP-1', 'Polish', 'bottle', 2, 3, 36, 'Rupes'],
    ['Lake Country HDO foam pads 5.5" (6pk)', 'LC-HDO-55', 'Pads', 'pack', 11, 5, 39, 'Lake Country'],
    ['The Rag Company Eagle Edge towels (10pk)', 'TRC-EE-10', 'Towels', 'pack', 18, 10, 29, 'The Rag Company'],
    ['Nanoskin clay mitt', 'NS-CLAY', 'Prep', 'unit', 6, 4, 24, 'Nanoskin'],
    ['P&S Xpress Interior Cleaner 1gal', 'PS-XIC-1', 'Chemicals', 'gal', 4, 2, 27, 'P&S'],
    ['Leather conditioner 16oz', 'CL-LTHR-16', 'Interior', 'bottle', 9, 4, 18, "Colonial's"],
    ['Wheel cone brushes', 'WB-CONE', 'Tools', 'unit', 12, 6, 14, 'Detail Factory'],
    ['Nitrile gloves (100ct)', 'GLV-NIT-100', 'Safety', 'box', 3, 5, 16, 'Uline'],
    ['IPA panel wipe 32oz', 'IPA-32', 'Prep', 'bottle', 10, 6, 15, 'Gyeon'],
  ] as const;
  await InventoryItem.insertMany(
    inventory.map(([name, sku, category, unit, quantity, reorderLevel, cost, supplier]) => ({
      shop: S, name, sku, category, unit, quantity, reorderLevel, cost, supplier, location: pick(['Bay 1 rack', 'Chemical room', 'Film cabinet', 'Main storage']),
      adjustments: [{ delta: quantity, reason: 'Initial stock count', at: new Date(Date.now() - 60 * DAY), by: owner._id }],
    })),
  );

  /* ---------- automations ---------- */
  await Automation.insertMany(
    AUTOMATION_TEMPLATES.map((t) => ({
      shop: S, name: t.name, description: t.description, trigger: t.trigger, conditions: t.conditions, actions: t.actions,
      enabled: t.key === 'welcome-new-customer' ? false : true, templateKey: t.key, runs: int(12, 340), lastRunAt: new Date(Date.now() - int(1, 72) * 3_600_000),
    })),
  );

  /* ---------- memberships ---------- */
  const plans = await MembershipPlan.insertMany([
    { shop: S, name: 'Gloss Club', price: 59, interval: 'month', perks: ['2 maintenance washes / month', 'Priority booking', '10% off add-ons'], discountPercent: 10, color: '#22d3ee' },
    { shop: S, name: 'Ceramic Care', price: 99, interval: 'month', perks: ['Unlimited maintenance washes', 'Annual coating inspection & topper', '15% off all services'], discountPercent: 15, color: '#a78bfa' },
    { shop: S, name: 'Collector Annual', price: 1290, interval: 'year', perks: ['Quarterly full detail', 'Free PPF touch-ups', 'Concierge pickup & delivery'], discountPercent: 20, color: '#fbbf24' },
  ]);
  const memberCustomers = shuffle([...customers]).slice(0, 27);
  await Membership.insertMany(
    memberCustomers.map((c, i) => {
      const plan = plans[i % 9 === 0 ? 2 : i % 3 === 0 ? 1 : 0];
      const startedAt = new Date(Date.now() - int(10, 200) * DAY);
      const next = new Date(startedAt);
      while (next < new Date()) plan.interval === 'year' ? next.setFullYear(next.getFullYear() + 1) : next.setMonth(next.getMonth() + 1);
      return {
        shop: S, plan: plan._id, customer: c._id, vehicle: vehiclesByCustomer.get(String(c._id))?.[0]?._id,
        status: weighted([['active', 85], ['paused', 8], ['cancelled', 7]] as const), startedAt, nextBillingAt: next, washesUsed: int(0, 2),
      };
    }),
  );
  await Customer.updateMany({ _id: { $in: memberCustomers.map((c) => c._id) } }, { $addToSet: { tags: 'member' } });

  /* ---------- messages ---------- */
  const messageDocs: Record<string, unknown>[] = [];
  const recentJobs = jobs.filter((j) => j.scheduledStart && Math.abs(j.scheduledStart.getTime() - Date.now()) < 14 * DAY).slice(0, 40);
  const REPLIES = ['Perfect, see you then!', 'Can I drop it off the night before?', 'Thank you!! It looks brand new 😍', 'Running 10 min late, sorry!', 'Is there any availability Saturday?', 'Do you guys do boats too?', 'Just paid, thanks!'];
  for (const job of recentJobs) {
    const customer = customers.find((c) => String(c._id) === String(job.customer))!;
    const vehicle = vehicles.find((v) => String(v._id) === String(job.vehicle))!;
    const base = job.createdAt.getTime();
    messageDocs.push({ shop: S, customer: customer._id, job: job._id, direction: 'outbound', channel: 'sms', body: `Hi ${customer.firstName}! You are booked with Apex Auto Spa for your ${vehicle.year} ${vehicle.make} ${vehicle.model}. Track everything live: https://lustra.app/portal/${job.portalToken}`, status: 'delivered', readAt: new Date(base), createdAt: new Date(base + 60_000) });
    if (chance(0.7)) {
      const inboundAt = new Date(Math.min(Date.now() - 600_000, base + int(1, 30) * 3_600_000));
      messageDocs.push({ shop: S, customer: customer._id, job: job._id, direction: 'inbound', channel: 'sms', body: pick(REPLIES), status: 'received', readAt: chance(0.6) ? inboundAt : undefined, createdAt: inboundAt });
    }
  }
  await Message.insertMany(messageDocs);

  /* ---------- time entries (last 14 days) ---------- */
  const timeEntries: Record<string, unknown>[] = [];
  for (let d = -14; d <= -1; d++) {
    for (const tech of techs) {
      if (weekday(at(d, 12)) === 0 || chance(0.12)) continue;
      const clockIn = at(d, pick([7, 8, 8, 9]), pick([0, 15, 30, 45]));
      const minutes = int(6 * 60, 9 * 60);
      timeEntries.push({ shop: S, user: tech._id, clockIn, clockOut: new Date(clockIn.getTime() + minutes * 60_000), minutes, tips: chance(0.4) ? int(10, 60) : 0, note: '' });
    }
  }
  await TimeEntry.insertMany(timeEntries);

  /* ---------- notifications & activity ---------- */
  const upcoming = jobs.filter((j) => j.stage === 'scheduled').slice(0, 3);
  await Notification.insertMany([
    { shop: S, title: 'New booking: Olivia Garcia', body: 'Ceramic Window Tint · tomorrow 9:00 AM', link: upcoming[0] ? `/app/jobs/${upcoming[0]._id}` : '', kind: 'booking', createdAt: new Date(Date.now() - 25 * 60_000) },
    { shop: S, title: 'Invoice paid in full', body: '$1,512.53 via card (+$75 tip)', link: '/app/invoices', kind: 'payment', createdAt: new Date(Date.now() - 2 * 3_600_000) },
    { shop: S, title: 'Low stock: Rupes Zephir Compound 1L', body: '2 bottle left (reorder at 3)', link: '/app/inventory', kind: 'warning', createdAt: new Date(Date.now() - 5 * 3_600_000), readBy: [owner._id] },
    { shop: S, title: 'Quote approved 🎉', body: 'Full Front PPF + 5 Year Ceramic approved', link: '/app/quotes', kind: 'success', createdAt: new Date(Date.now() - 26 * 3_600_000), readBy: [owner._id] },
  ]);
  await ActivityLog.insertMany(
    jobs
      .filter((j) => j.completedAt && j.completedAt.getTime() > Date.now() - 5 * DAY)
      .map((j) => ({ shop: S, actor: pick(techs)._id, action: 'job.stage_changed', entityType: 'job', entityId: j._id, summary: `Job #${j.number} moved to Completed`, createdAt: j.completedAt })),
  );

  const phase2 = await seedPhase2({ shopId: S, owner: owner._id, techs: techs.map((t) => t._id) });

  return {
    ...phase2,
    shop: shop.slug,
    users: team.length,
    customers: customers.length,
    vehicles: vehicles.length,
    jobs: jobs.length,
    quotes: quotes.length,
    invoices: invoices.length,
    certificates: certificates.length,
    inspections: inspectionJobs.length,
    messages: messageDocs.length,
    timeEntries: timeEntries.length,
  };
}

const isMain = process.argv[1] && /seed[\\/]index\.(ts|js)$/.test(process.argv[1]);
if (isMain) {
  connectDb()
    .then(seed)
    .then(async (summary) => {
      console.log('✔ Seeded demo data', summary);
      console.log(`  Login: ${DEMO.email} / ${DEMO.password}`);
      await disconnectDb();
    })
    .catch(async (err) => {
      console.error('Seed failed', err);
      await disconnectDb();
      process.exit(1);
    });
}
