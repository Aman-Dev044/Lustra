/**
 * Quote Copilot: a deterministic, explainable estimator that turns a free-text job description
 * ("2021 Tesla Model Y, heavy swirls, wants ceramic + front PPF") into priced line items using the
 * shop's own service catalog and size multipliers.
 */
import type { Types } from 'mongoose';
import type { ServiceCategory, VehicleSize, VehicleType } from '../models/common.js';
import { round2 } from './money.js';

export interface CatalogService {
  _id: Types.ObjectId | string;
  name: string;
  category: ServiceCategory | string;
  description?: string | null;
  basePrice: number;
  durationMinutes: number;
  keywords?: string[] | null;
  sizeMultipliers?: Partial<Record<VehicleSize, number | null>> | null;
}

export interface CopilotItem {
  service: string;
  name: string;
  description: string;
  category: string;
  qty: number;
  unitPrice: number;
  discount: number;
  durationMinutes: number;
  optional: boolean;
  selected: boolean;
}

export interface CopilotResult {
  items: CopilotItem[];
  durationMinutes: number;
  total: number;
  confidence: number;
  reasoning: string[];
  detected: {
    size: VehicleSize;
    vehicleType: VehicleType;
    condition: 'new' | 'light' | 'moderate' | 'heavy';
    categories: string[];
    vehicle: { year?: number; make?: string; model?: string };
  };
}

const MAKES = [
  'tesla', 'porsche', 'bmw', 'mercedes', 'audi', 'ford', 'chevrolet', 'chevy', 'toyota', 'lexus', 'honda', 'acura', 'nissan',
  'jeep', 'ram', 'dodge', 'gmc', 'cadillac', 'rivian', 'lucid', 'land rover', 'range rover', 'ferrari', 'lamborghini',
  'mclaren', 'subaru', 'mazda', 'hyundai', 'kia', 'genesis', 'volkswagen', 'vw', 'volvo', 'lincoln', 'corvette', 'mini',
];

const SIZE_RULES: { size: VehicleSize; type: VehicleType; words: string[] }[] = [
  { size: 'xl', type: 'van', words: ['sprinter', 'transit', 'box truck', 'motorhome', ' rv', 'dually', 'f-350', 'f350', '3500', 'suburban', 'yukon xl', 'escalade esv', 'expedition max', 'lifted'] },
  { size: 'large', type: 'truck', words: ['truck', 'pickup', 'f-150', 'f150', 'f-250', 'silverado', 'sierra', 'tundra', 'tacoma', 'ram 1500', 'cybertruck', 'r1t', 'raptor', 'gladiator'] },
  { size: 'large', type: 'suv', words: ['suv', 'model x', 'g-wagon', 'g wagon', 'g63', 'g-class', '4runner', 'tahoe', 'range rover', 'r1s', 'escalade', 'navigator', 'land cruiser', 'cayenne', 'x5', 'x7', 'gle', 'gls', 'q7', 'bronco', 'wrangler', 'minivan', 'van'] },
  { size: 'small', type: 'car', words: ['coupe', 'miata', '911', 'cayman', 'boxster', 'corvette', 'mini', 'convertible', 'hatchback', 'civic', 'model 3', 'm2', 'brz', 'gr86', 'supra'] },
  { size: 'small', type: 'motorcycle', words: ['motorcycle', 'bike', 'harley'] },
  { size: 'medium', type: 'car', words: ['sedan', 'model y', 'model s', 'crossover', 'm3', 'm4', 'camry', 'accord', 'cx-5', 'rav4'] },
];

const CATEGORY_WORDS: Record<string, string[]> = {
  ceramic: ['ceramic coating', 'ceramic', 'coating', 'coat', '9h', 'graphene', 'sealant'],
  ppf: ['ppf', 'paint protection', 'clear bra', 'clearbra', 'film', 'xpel', 'full front', 'front end', 'track pack', 'full body', 'rock chip'],
  tint: ['tint', 'window', 'windshield', 'windows', 'heat rejection'],
  wrap: ['wrap', 'color change', 'chrome delete', 'vinyl', 'satin', 'matte', 'dechrome'],
  correction: ['correction', 'polish', 'swirl', 'swirls', 'scratch', 'scratches', 'buff', 'compound', 'paint enhancement', 'holograms', 'water spots'],
  interior: ['interior', 'seats', 'carpet', 'pet hair', 'dog hair', 'stain', 'stains', 'odor', 'smell', 'leather', 'vacuum', 'shampoo', 'upholstery'],
  detailing: ['detail', 'full detail', 'wash', 'exterior', 'decon', 'clay', 'hand wash', 'engine bay'],
  maintenance: ['maintenance', 'upkeep', 'monthly wash', 'membership'],
  marine: ['boat', 'yacht', 'marine', 'gelcoat', 'hull', 'pontoon'],
  lawn: ['lawn', 'mow', 'mowing', 'yard', 'landscap', 'hedge', 'mulch', 'aeration'],
};

const HEAVY = ['heavy', 'neglected', 'oxidation', 'oxidized', 'deep scratch', 'bad shape', 'never been', 'faded', 'severe'];
const MODERATE = ['swirl', 'swirls', 'light scratch', 'water spots', 'dull', 'holograms', 'moderate', 'some scratches'];
const NEW = ['brand new', 'new car', 'delivery', 'just bought', 'just picked up', 'new purchase', '0 miles', 'zero miles'];

/** Words must start at a word boundary (`text` is space-padded and normalized). */
function includesAny(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(` ${w.trim()}`));
}

function priceFor(service: CatalogService, size: VehicleSize): number {
  const mult = service.sizeMultipliers?.[size] ?? { small: 1, medium: 1.15, large: 1.3, xl: 1.5 }[size];
  return Math.round((service.basePrice * mult) / 5) * 5;
}

function durationFor(service: CatalogService, size: VehicleSize): number {
  const factor = { small: 1, medium: 1.1, large: 1.25, xl: 1.45 }[size];
  return Math.round((service.durationMinutes * factor) / 15) * 15;
}

/** How strongly a service matches the prompt (keywords, then name tokens). */
function scoreService(service: CatalogService, text: string): number {
  let score = 0;
  for (const kw of service.keywords ?? []) {
    const k = kw.toLowerCase().trim();
    if (k && text.includes(k)) score += 2 + k.split(' ').length;
  }
  const tokens = service.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  for (const t of tokens) if (text.includes(t)) score += 1;
  return score;
}

function detectVehicle(text: string) {
  const yearMatch = text.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  const make = MAKES.find((m) => text.includes(m));
  let model: string | undefined;
  if (make) {
    const after = text.slice(text.indexOf(make) + make.length).trim().split(/[\s,.;]+/).slice(0, 2);
    if (after[0] === 'model' && after[1]) model = `Model ${after[1].toUpperCase()}`;
    else if (after[0]) model = after[0].toUpperCase().length <= 4 ? after[0].toUpperCase() : after[0][0].toUpperCase() + after[0].slice(1);
  }
  return {
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    make: make ? make.replace(/\b\w/g, (c) => c.toUpperCase()).replace('Bmw', 'BMW').replace('Vw', 'VW').replace('Gmc', 'GMC') : undefined,
    model,
  };
}

export function runCopilot(
  prompt: string,
  catalog: CatalogService[],
  opts: { vehicleSize?: VehicleSize; vehicleType?: VehicleType } = {},
): CopilotResult {
  const text = ` ${prompt.toLowerCase().replace(/[^a-z0-9'-]+/g, ' ').trim()} `;
  const reasoning: string[] = [];

  // 1. Vehicle & size
  let size: VehicleSize = 'medium';
  let vehicleType: VehicleType = 'car';
  const rule = SIZE_RULES.find((r) => includesAny(text, r.words).length > 0);
  if (rule) {
    size = rule.size;
    vehicleType = rule.type;
  }
  const boatFeet = text.match(/(\d{2})\s?(?:ft|foot|feet|')/);
  if (includesAny(text, CATEGORY_WORDS.marine).length) {
    vehicleType = 'boat';
    const feet = boatFeet ? Number(boatFeet[1]) : 24;
    size = feet >= 35 ? 'xl' : feet >= 25 ? 'large' : 'medium';
  }
  if (opts.vehicleType) vehicleType = opts.vehicleType;
  if (opts.vehicleSize) size = opts.vehicleSize;
  const vehicle = detectVehicle(text);
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  reasoning.push(
    `${vehicleLabel ? `Detected ${vehicleLabel}` : 'No specific vehicle detected'} → priced as a ${size.toUpperCase()} ${vehicleType}${opts.vehicleSize ? ' (size provided)' : ''}.`,
  );

  // 2. Condition
  const condition: CopilotResult['detected']['condition'] = includesAny(text, NEW).length
    ? 'new'
    : includesAny(text, HEAVY).length
      ? 'heavy'
      : includesAny(text, MODERATE).length
        ? 'moderate'
        : 'light';
  reasoning.push(`Paint/interior condition assessed as "${condition}".`);

  // 3. Requested categories
  const requested = Object.entries(CATEGORY_WORDS)
    .filter(([, words]) => includesAny(text, words).length > 0)
    .map(([cat]) => cat);
  // "ceramic tint" is a tint product, not a coating.
  if (requested.includes('tint') && requested.includes('ceramic') && /ceramic (window )?tint/.test(text) && !/ceramic coat/.test(text)) {
    requested.splice(requested.indexOf('ceramic'), 1);
  }
  // Swirl/scratch language implies correction work.
  if (['moderate', 'heavy'].includes(condition) && !requested.includes('correction')) requested.push('correction');

  const active = catalog.filter((s) => s.basePrice >= 0);
  const byCategory = (cat: string) => active.filter((s) => s.category === cat);
  const items: CopilotItem[] = [];
  const used = new Set<string>();

  const add = (service: CatalogService, why: string, optional = false) => {
    const id = String(service._id);
    if (used.has(id)) return;
    used.add(id);
    items.push({
      service: id,
      name: service.name,
      description: service.description ?? '',
      category: String(service.category),
      qty: 1,
      unitPrice: priceFor(service, size),
      discount: 0,
      durationMinutes: durationFor(service, size),
      optional,
      selected: !optional,
    });
    reasoning.push(`${optional ? 'Suggested upsell' : 'Added'} "${service.name}" — ${why}`);
  };

  // 4. Pick the best service per requested category
  for (const cat of requested) {
    const pool = byCategory(cat);
    if (!pool.length) continue;
    const scored = pool.map((s) => ({ s, score: scoreService(s, text) })).sort((a, b) => b.score - a.score || a.s.basePrice - b.s.basePrice);
    const sortedByPrice = [...pool].sort((a, b) => a.basePrice - b.basePrice);
    let pick = scored[0].s;
    let why = scored[0].score > 0 ? 'matched your description' : 'best fit in this category';

    if (cat === 'correction' && scored[0].score <= 2) {
      pick = condition === 'heavy' ? sortedByPrice[Math.min(1, sortedByPrice.length - 1)] : sortedByPrice[0];
      why = condition === 'heavy' ? 'heavy defects need a multi-step correction' : 'light defects only need a one-step polish';
    } else if (scored[0].score === 0) {
      pick = sortedByPrice[Math.floor((sortedByPrice.length - 1) / 2)];
      why = 'mid-tier option chosen (no tier specified)';
    }
    // PPF: when several PPF packages match, "full body" beats "front".
    if (cat === 'ppf') {
      const fullBody = pool.find((s) => /full body/i.test(s.name));
      const front = pool.find((s) => /front/i.test(s.name) && !/full body/i.test(s.name));
      if (/full body|whole car|entire car/.test(text) && fullBody) pick = fullBody;
      else if (/front|bumper|hood/.test(text) && front) pick = front;
    }
    add(pick, why);
  }

  // A coating without correction locks in defects — recommend prep on anything not brand new.
  if (requested.includes('ceramic') && !requested.includes('correction') && condition !== 'new') {
    const prep = byCategory('correction').sort((a, b) => a.basePrice - b.basePrice)[0];
    if (prep) add(prep, 'coatings lock in the current finish, so a one-step correction is recommended first');
  }

  // Fallback when nothing matched
  if (!items.length) {
    const fallback =
      active.find((s) => /full detail/i.test(s.name)) ?? byCategory('detailing')[0] ?? active.sort((a, b) => b.basePrice - a.basePrice)[0];
    if (fallback) add(fallback, 'no specific service detected, so the most popular package was used as a starting point');
  }

  // 5. Upsells (max 2, unselected)
  const upsells: [boolean, () => CatalogService | undefined, string][] = [
    [
      requested.includes('ppf') && !requested.includes('ceramic'),
      () => byCategory('ceramic').sort((a, b) => a.basePrice - b.basePrice)[0],
      'coating the unfilmed panels makes upkeep effortless',
    ],
    [
      (requested.includes('ceramic') || requested.includes('ppf')) && !requested.includes('tint') && vehicleType !== 'boat',
      () => byCategory('tint').find((s) => /ceramic/i.test(s.name)) ?? byCategory('tint')[0],
      'customers protecting paint usually add heat-rejecting tint',
    ],
    [
      condition === 'heavy' && !requested.includes('interior'),
      () => byCategory('interior')[0],
      'vehicles with neglected paint usually need interior attention too',
    ],
    [
      requested.includes('ceramic'),
      () => byCategory('maintenance')[0],
      'a maintenance wash plan keeps the coating warranty valid',
    ],
  ];
  let upsellCount = 0;
  for (const [when, find, why] of upsells) {
    if (upsellCount >= 2 || !when) continue;
    const s = find();
    if (s && !used.has(String(s._id))) {
      add(s, why, true);
      upsellCount++;
    }
  }

  const selected = items.filter((i) => i.selected);
  const total = round2(selected.reduce((sum, i) => sum + i.unitPrice * i.qty, 0));
  const durationMinutes = selected.reduce((sum, i) => sum + i.durationMinutes, 0);
  const explicit = requested.length;
  const confidence = Math.min(
    0.97,
    round2((explicit ? 0.55 : 0.3) + Math.min(explicit, 3) * 0.1 + (vehicleLabel ? 0.08 : 0) + (opts.vehicleSize ? 0.05 : 0)),
  );

  return {
    items,
    durationMinutes,
    total,
    confidence,
    reasoning,
    detected: { size, vehicleType, condition, categories: requested, vehicle },
  };
}
