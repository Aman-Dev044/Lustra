import { describe, expect, it } from 'vitest';
import { checkDigit, decodeVin, decodeYear } from '../src/lib/vin.js';
import { computeTotals } from '../src/lib/money.js';
import { computeSlots, zonedTime } from '../src/lib/availability.js';
import { renderTemplate } from '../src/lib/messaging.js';
import { evaluateConditions } from '../src/lib/automations.js';
import { runCopilot, type CatalogService } from '../src/lib/copilot.js';
import { defaultServices } from '../src/seed/defaults.js';

describe('VIN decoding', () => {
  it('validates a known-good VIN check digit', () => {
    // Classic NHTSA example VIN
    expect(checkDigit('1M8GDM9AXKP042788')).toBe('X');
    const decoded = decodeVin('5YJYGDEE5MF000000'.slice(0, 8) + checkDigit('5YJYGDEE0MF000000') + 'MF000000');
    expect(decoded.valid).toBe(true);
    expect(decoded.make).toBe('Tesla');
    expect(decoded.year).toBe(2021);
  });

  it('rejects malformed VINs and bad check digits', () => {
    expect(decodeVin('NOTAVIN').valid).toBe(false);
    expect(decodeVin('1HGCM82633A00435O').valid).toBe(false); // contains O
    const good = '1HGCM82633A004352';
    const bad = good.slice(0, 8) + (good[8] === '1' ? '2' : '1') + good.slice(9);
    expect(decodeVin(good).checkDigitValid).toBe(true);
    expect(decodeVin(bad).valid).toBe(false);
  });

  it('resolves the 30-year model-year cycle', () => {
    expect(decodeYear('R', new Date('2026-01-01'))).toBe(2024);
    expect(decodeYear('9', new Date('2026-01-01'))).toBe(2009);
    expect(decodeYear('A', new Date('2026-01-01'))).toBe(2010);
  });
});

describe('money', () => {
  it('computes totals with discounts, tax and unselected optional items', () => {
    const totals = computeTotals(
      [
        { qty: 1, unitPrice: 1000, discount: 100 },
        { qty: 2, unitPrice: 50 },
        { qty: 1, unitPrice: 400, optional: true, selected: false },
      ],
      50,
      8.25,
    );
    expect(totals).toEqual({ subtotal: 1100, discount: 150, tax: 78.38, total: 1028.38 });
  });
});

describe('availability', () => {
  const booking = {
    slotMinutes: 60,
    bays: 1,
    leadTimeHours: 0,
    workingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '09:00', close: '12:00', closed: day === 0 })),
  };

  it('converts shop-local times to UTC', () => {
    expect(zonedTime('2026-07-01', '09:00', 'America/Chicago').toISOString()).toBe('2026-07-01T14:00:00.000Z');
    expect(zonedTime('2026-01-15', '09:00', 'America/Chicago').toISOString()).toBe('2026-01-15T15:00:00.000Z');
  });

  it('returns no slots on closed days and blocks busy bays', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(computeSlots({ date: '2026-01-18', timeZone: 'UTC', booking, durationMinutes: 60, busy: [], now })).toEqual([]); // Sunday
    const slots = computeSlots({
      date: '2026-01-19',
      timeZone: 'UTC',
      booking,
      durationMinutes: 60,
      busy: [{ start: new Date('2026-01-19T10:00:00Z'), end: new Date('2026-01-19T11:00:00Z') }],
      now,
    });
    expect(slots.map((s) => [s.start.slice(11, 16), s.available])).toEqual([
      ['09:00', true],
      ['10:00', false],
      ['11:00', true],
    ]);
  });
});

describe('templates & conditions', () => {
  it('renders nested placeholders and money', () => {
    expect(renderTemplate('Hi {{customer.firstName}}, total {{invoice.total}} {{missing.value}}!', { customer: { firstName: 'Ada' }, invoice: { total: 1234.5 } })).toBe(
      'Hi Ada, total $1,234.50 !',
    );
  });

  it('evaluates automation conditions', () => {
    const ctx = { stage: 'in_progress', job: { title: 'Ceramic Coating — 5 Year', total: 900 }, customer: { tags: ['vip'] } };
    expect(evaluateConditions([{ field: 'stage', op: 'eq', value: 'in_progress' }], ctx)).toBe(true);
    expect(evaluateConditions([{ field: 'job.title', op: 'contains', value: 'ceramic' }], ctx)).toBe(true);
    expect(evaluateConditions([{ field: 'job.total', op: 'gt', value: 1000 }], ctx)).toBe(false);
    expect(evaluateConditions([{ field: 'customer.tags', op: 'contains', value: 'vip' }], ctx)).toBe(true);
  });
});

describe('Quote Copilot', () => {
  const catalog: CatalogService[] = defaultServices('detailing').map((s, i) => ({ ...s, _id: `svc${i}` }));

  it('builds a ceramic + PPF + correction quote for a swirled Model Y', () => {
    const result = runCopilot('2021 Tesla Model Y heavy swirls wants ceramic coating and front PPF', catalog);
    const names = result.items.filter((i) => i.selected).map((i) => i.name);
    expect(names).toContain('Full Front PPF');
    expect(names.some((n) => n.startsWith('Ceramic Coating'))).toBe(true);
    expect(names).toContain('Paint Correction — Stage 2');
    expect(result.detected.vehicle).toMatchObject({ year: 2021, make: 'Tesla', model: 'Model Y' });
    expect(result.detected.condition).toBe('heavy');
    expect(result.total).toBeGreaterThan(2500);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('prices trucks as large and treats "ceramic tint" as tint', () => {
    const result = runCopilot('Ford F-150 needs ceramic tint all around', catalog);
    expect(result.detected.size).toBe('large');
    expect(result.items.filter((i) => i.selected).map((i) => i.category)).toEqual(['tint']);
    const tint = catalog.find((s) => s.name === 'Ceramic Window Tint')!;
    expect(result.items[0].unitPrice).toBe(Math.round((tint.basePrice * 1.3) / 5) * 5);
  });

  it('falls back to a sensible default when nothing matches', () => {
    const result = runCopilot('make it shiny please', catalog);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
