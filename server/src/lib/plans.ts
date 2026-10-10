import type { RequestHandler } from 'express';
import { Shop } from '../models/Shop.js';
import { AppError, unauthorized } from './errors.js';

export type Plan = 'express' | 'pro' | 'enterprise';

export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  express: { monthly: 70, yearly: 840 },
  pro: { monthly: 110, yearly: 1320 },
  enterprise: { monthly: 183, yearly: 2200 },
};
export const VISUALIZER_ADDON_PRICE = 150;

export const PRO_FEATURES = [
  'online_booking', 'lead_forms', 'followups', 'documents', 'marketplace', 'quickbooks',
  'profit_analytics', 'quote_copilot', 'customer_portal', 'campaigns', 'reviews', 'ai_insights',
] as const;

export const ENTERPRISE_FEATURES = [
  'memberships', 'video_inspections', 'automations', 'payment_reminders', 'commissions',
  'line_item_scheduling', 'capacity_planner', 'multi_location', 'api_access',
] as const;

export type Feature = (typeof PRO_FEATURES)[number] | (typeof ENTERPRISE_FEATURES)[number] | 'visualizer';

const RANK: Record<Plan, number> = { express: 0, pro: 1, enterprise: 2 };

export function requiredPlan(feature: Feature): Plan | 'addon' {
  if (feature === 'visualizer') return 'addon';
  if ((ENTERPRISE_FEATURES as readonly string[]).includes(feature)) return 'enterprise';
  return 'pro';
}

export function hasFeature(
  shop: { plan?: string | null; addOns?: { visualizer?: boolean | null } | null },
  feature: Feature,
): boolean {
  const needed = requiredPlan(feature);
  if (needed === 'addon') return Boolean(shop.addOns?.visualizer);
  return RANK[(shop.plan as Plan) ?? 'express'] >= RANK[needed];
}

export function planRequiredError(feature: Feature): AppError {
  const needed = requiredPlan(feature);
  const label = needed === 'addon' ? 'the 3D Visualizer add-on' : `the ${needed[0].toUpperCase()}${needed.slice(1)} plan`;
  return new AppError(403, 'PLAN_REQUIRED', `This feature requires ${label}`, { feature, requiredPlan: needed });
}

export function requireFeature(feature: Feature): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    const shop = await Shop.findById(req.auth.shopId).select('plan addOns').lean();
    if (!shop || !hasFeature(shop, feature)) return next(planRequiredError(feature));
    next();
  };
}
