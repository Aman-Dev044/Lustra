import type { Types } from 'mongoose';
import { Shop } from '../models/Shop.js';
import { Service } from '../models/Service.js';
import { Automation } from '../models/misc.js';
import type { Industry } from '../models/common.js';
import { AUTOMATION_TEMPLATES, defaultServices } from '../seed/defaults.js';

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'shop'
  );
}

export async function uniqueShopSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await Shop.exists({ slug }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Give a brand-new shop a ready-to-use service catalog and automation templates. */
export async function provisionShop(shop: Types.ObjectId, industry: Industry): Promise<void> {
  await Service.insertMany(defaultServices(industry).map((s) => ({ ...s, shop })));
  await Automation.insertMany(
    AUTOMATION_TEMPLATES.map((t) => ({
      shop,
      name: t.name,
      description: t.description,
      trigger: t.trigger,
      conditions: t.conditions,
      actions: t.actions,
      enabled: t.enabledByDefault,
      templateKey: t.key,
    })),
  );
}
