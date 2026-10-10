/**
 * AI Insights: revenue forecast (linear trend + day-of-week seasonality + residual-based band),
 * churn risk from each customer's own visit cadence, data-driven opportunities and a business health score.
 */
import type { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Job } from '../models/Job.js';
import { Quote } from '../models/Quote.js';
import { Customer } from '../models/Customer.js';
import { Shop } from '../models/Shop.js';
import { InventoryItem, Membership, MembershipPlan } from '../models/misc.js';
import { Review } from '../models/growth.js';
import { round2 } from './money.js';

const DAY = 86_400_000;
const HISTORY_DAYS = 90;
const HORIZON_DAYS = 30;
const Z80 = 1.2816; // 80% prediction band

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

/** Ordinary least squares on (x, y). */
export function linearRegression(ys: number[]): { intercept: number; slope: number } {
  const n = ys.length;
  if (n < 2) return { intercept: ys[0] ?? 0, slope: 0 };
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den ? num / den : 0;
  return { intercept: yMean - slope * xMean, slope };
}

/**
 * Forecast daily revenue. `daily` holds exactly HISTORY_DAYS values (oldest first) with their weekday.
 * Model: ŷ = a + b·t + s[weekday], where s is the mean residual per weekday.
 */
export function forecastRevenue(daily: { date: string; weekday: number; revenue: number }[], futureDays: { date: string; weekday: number }[]) {
  const ys = daily.map((d) => d.revenue);
  const { intercept, slope } = linearRegression(ys);
  const trendAt = (t: number) => intercept + slope * t;

  const seasonal = Array.from({ length: 7 }, (_, wd) => {
    const residuals = daily.map((d, t) => ({ d, r: d.revenue - trendAt(t) })).filter(({ d }) => d.weekday === wd).map(({ r }) => r);
    return residuals.length ? residuals.reduce((s, r) => s + r, 0) / residuals.length : 0;
  });
  const fitted = daily.map((d, t) => Math.max(0, trendAt(t) + seasonal[d.weekday]));
  const residualStd = Math.sqrt(daily.reduce((s, d, t) => s + (d.revenue - fitted[t]) ** 2, 0) / Math.max(1, daily.length - 2));
  const band = Z80 * residualStd;

  const series: ForecastPoint[] = daily.map((d, t) => ({
    date: d.date,
    actual: round2(d.revenue),
    predicted: round2(fitted[t]),
    lower: round2(Math.max(0, fitted[t] - band)),
    upper: round2(fitted[t] + band),
  }));
  let next30 = 0;
  futureDays.forEach((d, i) => {
    const t = daily.length + i;
    const predicted = Math.max(0, trendAt(t) + seasonal[d.weekday]);
    // Uncertainty widens slowly with distance from the data.
    const width = band * (1 + i / (2 * HORIZON_DAYS));
    next30 += predicted;
    series.push({ date: d.date, predicted: round2(predicted), lower: round2(Math.max(0, predicted - width)), upper: round2(predicted + width) });
  });

  const mean = ys.reduce((s, y) => s + y, 0) / Math.max(1, ys.length);
  const trendPct = mean ? round2(((slope * 30) / mean) * 100) : 0;
  return {
    series,
    next30: round2(next30),
    trend: (trendPct > 3 ? 'up' : trendPct < -3 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
    trendPct,
    residualStd: round2(residualStd),
  };
}

function dayKeys(timeZone: string, fromDaysAgo: number, count: number) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  return Array.from({ length: count }, (_, i) => {
    const date = fmt.format(new Date(Date.now() - (fromDaysAgo - i) * DAY));
    const [y, m, d] = date.split('-').map(Number);
    return { date, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
  });
}

type RiskLevel = 'high' | 'medium' | 'low';

export async function buildInsights(shop: Types.ObjectId) {
  const shopDoc = await Shop.findById(shop).select('timezone booking name').lean();
  const tz = shopDoc?.timezone ?? 'UTC';
  const now = Date.now();

  /* ---------- Forecast ---------- */
  const history = dayKeys(tz, HISTORY_DAYS, HISTORY_DAYS); // ends yesterday
  const future = dayKeys(tz, 0, HORIZON_DAYS); // today onward
  const paymentRows = await Invoice.aggregate([
    { $match: { shop, status: { $ne: 'void' } } },
    { $unwind: '$payments' },
    { $match: { 'payments.at': { $gte: new Date(now - (HISTORY_DAYS + 2) * DAY) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payments.at', timezone: tz } }, revenue: { $sum: '$payments.amount' } } },
  ]);
  const byDay = new Map(paymentRows.map((r) => [r._id as string, r.revenue as number]));
  const forecast = forecastRevenue(
    history.map((d) => ({ ...d, revenue: byDay.get(d.date) ?? 0 })),
    future,
  );

  /* ---------- Churn risk ---------- */
  const visits = await Job.aggregate([
    { $match: { shop, stage: 'completed', completedAt: { $ne: null } } },
    { $sort: { completedAt: 1 } },
    { $group: { _id: '$customer', dates: { $push: '$completedAt' } } },
    { $match: { 'dates.1': { $exists: true } } },
  ]);
  const churnCandidates = visits
    .map((v) => {
      const dates: Date[] = v.dates;
      const gaps = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / DAY).filter((g) => g >= 1);
      if (!gaps.length) return null;
      const avgIntervalDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const lastVisitAt = dates[dates.length - 1];
      const since = (now - lastVisitAt.getTime()) / DAY;
      const daysOverdue = Math.round(since - avgIntervalDays);
      if (daysOverdue <= 0) return null;
      const ratio = since / Math.max(avgIntervalDays, 1);
      const risk: RiskLevel = ratio >= 2 ? 'high' : ratio >= 1.5 ? 'medium' : 'low';
      return { customerId: v._id as Types.ObjectId, lastVisitAt, avgIntervalDays: Math.round(avgIntervalDays), daysOverdue, risk };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const churnCustomers = await Customer.find({ _id: { $in: churnCandidates.map((c) => c.customerId) } })
    .select('firstName lastName email phone lifetimeValue tags')
    .lean();
  const custById = new Map(churnCustomers.map((c) => [String(c._id), c]));
  const riskWeight: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
  const churnRisk = churnCandidates
    .map((c) => {
      const customer = custById.get(String(c.customerId));
      return customer ? { customer, lastVisitAt: c.lastVisitAt, avgIntervalDays: c.avgIntervalDays, daysOverdue: c.daysOverdue, risk: c.risk, lifetimeValue: round2(customer.lifetimeValue ?? 0) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => riskWeight[b.risk] - riskWeight[a.risk] || b.lifetimeValue - a.lifetimeValue)
    .slice(0, 20);

  /* ---------- Opportunities ---------- */
  const [avgTicketAgg, staleQuotes, anniversaries, lowStock, unpaid, ltvSorted, frequentVisitors, members, cheapestPlan, upcoming, reviewsAgg, quoteFunnel, collections, repeatAgg] =
    await Promise.all([
      Job.aggregate([{ $match: { shop, stage: 'completed', completedAt: { $gte: new Date(now - 180 * DAY) } } }, { $group: { _id: null, avg: { $avg: '$totals.total' }, minutes: { $avg: { $sum: '$lineItems.durationMinutes' } } } }]),
      Quote.aggregate([{ $match: { shop, status: { $in: ['sent', 'viewed'] }, sentAt: { $lte: new Date(now - 2 * DAY) } } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totals.total' } } }]),
      Job.aggregate([
        { $match: { shop, stage: 'completed', completedAt: { $gte: new Date(now - 395 * DAY), $lte: new Date(now - 335 * DAY) }, 'lineItems.category': { $in: ['ceramic', 'ppf'] } } },
        { $group: { _id: '$customer' } },
        { $count: 'count' },
      ]),
      InventoryItem.find({ shop, $expr: { $lte: ['$quantity', '$reorderLevel'] } }).select('name quantity reorderLevel cost').lean(),
      Invoice.aggregate([{ $match: { shop, status: { $in: ['sent', 'partial', 'overdue'] }, 'totals.balance': { $gt: 0 } } }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totals.balance' } } }]),
      Customer.find({ shop, lifetimeValue: { $gt: 0 } }).sort({ lifetimeValue: -1 }).select('lifetimeValue lastVisitAt').lean(),
      Job.aggregate([
        { $match: { shop, stage: 'completed', completedAt: { $gte: new Date(now - 180 * DAY) } } },
        { $group: { _id: '$customer', visits: { $sum: 1 } } },
        { $match: { visits: { $gte: 3 } } },
      ]),
      Membership.distinct('customer', { shop, status: 'active' }),
      MembershipPlan.findOne({ shop, active: true }).sort({ price: 1 }).lean(),
      Job.aggregate([
        // In-bay work only; multi-day jobs count at most one working day each.
        { $match: { shop, mobile: { $ne: true }, stage: { $nin: ['cancelled', 'lead'] }, scheduledStart: { $gte: new Date(now), $lt: new Date(now + 7 * DAY) } } },
        { $group: { _id: null, minutes: { $sum: { $min: [600, { $divide: [{ $subtract: ['$scheduledEnd', '$scheduledStart'] }, 60_000] }] } } } },
      ]),
      Review.aggregate([{ $match: { shop } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
      Quote.aggregate([
        { $match: { shop, createdAt: { $gte: new Date(now - 90 * DAY) }, status: { $ne: 'draft' } } },
        { $group: { _id: null, sent: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
      ]),
      Invoice.aggregate([
        { $match: { shop, status: { $nin: ['void', 'draft'] }, createdAt: { $gte: new Date(now - 90 * DAY) } } },
        { $group: { _id: null, total: { $sum: '$totals.total' }, paid: { $sum: '$totals.paid' } } },
      ]),
      Customer.aggregate([{ $match: { shop, visits: { $gte: 1 } } }, { $group: { _id: null, buyers: { $sum: 1 }, repeat: { $sum: { $cond: [{ $gte: ['$visits', 2] }, 1, 0] } } } }]),
    ]);

  const avgTicket = avgTicketAgg[0]?.avg ?? 250;
  const avgJobMinutes = Math.max(60, avgTicketAgg[0]?.minutes ?? 180);
  const revenuePerHour = avgTicket / (avgJobMinutes / 60);

  // Capacity next 7 days from working hours × bays
  const bays = shopDoc?.booking?.bays ?? 1;
  const openMinutesByDay = new Map<number, number>();
  for (const h of shopDoc?.booking?.workingHours ?? []) {
    if (h.closed) continue;
    const [oh, om] = (h.open ?? '08:00').split(':').map(Number);
    const [ch, cm] = (h.close ?? '18:00').split(':').map(Number);
    openMinutesByDay.set(h.day, Math.max(0, ch * 60 + cm - (oh * 60 + om)));
  }
  const capacityMinutes = dayKeys(tz, 0, 7).reduce((s, d) => s + (openMinutesByDay.get(d.weekday) ?? 0) * bays, 0);
  const bookedMinutes = Math.min(capacityMinutes, upcoming[0]?.minutes ?? 0);
  const utilization = capacityMinutes ? bookedMinutes / capacityMinutes : 0;
  const idleHours = Math.max(0, (capacityMinutes - bookedMinutes) / 60);

  const topCount = Math.max(1, Math.ceil(ltvSorted.length * 0.1));
  const lapsedVips = ltvSorted.slice(0, topCount).filter((c) => !c.lastVisitAt || c.lastVisitAt.getTime() < now - 90 * DAY);
  const memberSet = new Set(members.map(String));
  const upsellable = frequentVisitors.filter((v) => !memberSet.has(String(v._id)));
  const anniversaryCount = anniversaries[0]?.count ?? 0;

  type Kind = 'followup_quotes' | 'coating_anniversary' | 'idle_capacity' | 'lapsed_vips' | 'unpaid_invoices' | 'low_stock' | 'membership_upsell';
  const opportunities: { id: string; kind: Kind; title: string; description: string; impact: number; count: number; action: { label: string; href: string } }[] = [];
  if (staleQuotes[0]?.count) {
    const { count, value } = staleQuotes[0];
    opportunities.push({
      id: 'followup_quotes', kind: 'followup_quotes', count,
      title: `${count} quote${count > 1 ? 's' : ''} waiting on a decision`,
      description: `Quotes sent more than 2 days ago are still open. A personal follow-up typically converts 1 in 3.`,
      impact: round2(value * 0.35),
      action: { label: 'Follow up on quotes', href: '/app/quotes?status=sent,viewed' },
    });
  }
  if (anniversaryCount) {
    opportunities.push({
      id: 'coating_anniversary', kind: 'coating_anniversary', count: anniversaryCount,
      title: `${anniversaryCount} coating & PPF anniversaries this month`,
      description: 'Annual inspections and coating toppers keep warranties valid — and are easy upsells.',
      impact: round2(anniversaryCount * 189 * 0.5),
      action: { label: 'Launch anniversary campaign', href: '/app/campaigns?segment=coating_anniversary' },
    });
  }
  if (idleHours >= 4 && utilization < 0.75) {
    opportunities.push({
      id: 'idle_capacity', kind: 'idle_capacity', count: Math.round(idleHours),
      title: `${Math.round(idleHours)} open bay-hours in the next 7 days`,
      description: `You're ${Math.round(utilization * 100)}% booked this week. A flash offer to lapsed customers can fill the gaps.`,
      impact: round2(idleHours * revenuePerHour * 0.25),
      action: { label: 'Fill the calendar', href: '/app/campaigns?segment=lapsed' },
    });
  }
  if (lapsedVips.length) {
    opportunities.push({
      id: 'lapsed_vips', kind: 'lapsed_vips', count: lapsedVips.length,
      title: `${lapsedVips.length} VIP customer${lapsedVips.length > 1 ? 's' : ''} haven't visited in 90+ days`,
      description: 'Your top 10% by lifetime value are drifting. A personal invite works better than a discount.',
      impact: round2(lapsedVips.length * avgTicket * 0.4),
      action: { label: 'Win back VIPs', href: '/app/campaigns?segment=vip' },
    });
  }
  if (unpaid[0]?.count) {
    opportunities.push({
      id: 'unpaid_invoices', kind: 'unpaid_invoices', count: unpaid[0].count,
      title: `$${Math.round(unpaid[0].value).toLocaleString('en-US')} in unpaid invoices`,
      description: 'Send a one-tap pay link — most customers pay within minutes of a reminder.',
      impact: round2(unpaid[0].value),
      action: { label: 'Collect payments', href: '/app/invoices?status=overdue,sent,partial' },
    });
  }
  if (lowStock.length) {
    opportunities.push({
      id: 'low_stock', kind: 'low_stock', count: lowStock.length,
      title: `${lowStock.length} supplies at or below reorder level`,
      description: `Running out mid-job costs bookings: ${lowStock.slice(0, 3).map((i) => i.name).join(', ')}${lowStock.length > 3 ? '…' : ''}.`,
      impact: round2(lowStock.length * avgTicket * 0.1),
      action: { label: 'Reorder from Marketplace', href: '/app/marketplace' },
    });
  }
  if (upsellable.length) {
    const price = cheapestPlan?.price ?? 59;
    const monthly = cheapestPlan?.interval === 'year' ? price / 12 : price;
    opportunities.push({
      id: 'membership_upsell', kind: 'membership_upsell', count: upsellable.length,
      title: `${upsellable.length} frequent visitor${upsellable.length > 1 ? 's' : ''} aren't members yet`,
      description: 'Customers who visit 3+ times in 6 months are ideal for a membership — predictable revenue for you.',
      impact: round2(upsellable.length * monthly * 12 * 0.3),
      action: { label: 'Offer memberships', href: '/app/memberships' },
    });
  }
  opportunities.sort((a, b) => b.impact - a.impact);

  /* ---------- Health score ---------- */
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const conversion = quoteFunnel[0]?.sent ? quoteFunnel[0].approved / quoteFunnel[0].sent : null;
  const collected = collections[0]?.total ? collections[0].paid / collections[0].total : null;
  const repeatRate = repeatAgg[0]?.buyers ? repeatAgg[0].repeat / repeatAgg[0].buyers : null;
  const avgRating = reviewsAgg[0]?.avg ?? null;
  const factors = [
    { label: 'Revenue trend', score: clamp(60 + forecast.trendPct * 2), hint: forecast.trend === 'up' ? `Revenue trending up ${forecast.trendPct}% per month` : forecast.trend === 'down' ? `Revenue trending down ${Math.abs(forecast.trendPct)}% per month` : 'Revenue is steady' },
    { label: 'Collections', score: collected === null ? 70 : clamp(collected * 100), hint: collected === null ? 'Not enough invoices yet' : `${Math.round(collected * 100)}% of last-90-day invoices collected` },
    { label: 'Quote conversion', score: conversion === null ? 60 : clamp(conversion * 110), hint: conversion === null ? 'Send quotes to measure conversion' : `${Math.round(conversion * 100)}% of quotes approved` },
    { label: 'Calendar utilization', score: clamp(utilization * 120), hint: `${Math.round(utilization * 100)}% of bay capacity booked for the next 7 days` },
    { label: 'Customer retention', score: repeatRate === null ? 60 : clamp(repeatRate * 160), hint: repeatRate === null ? 'Not enough repeat data yet' : `${Math.round(repeatRate * 100)}% of customers come back` },
    { label: 'Reputation', score: avgRating === null ? 60 : clamp((avgRating - 3) * 50), hint: avgRating === null ? 'Request reviews to build reputation' : `${avgRating.toFixed(1)}★ across ${reviewsAgg[0].count} reviews` },
  ];
  const score = clamp(factors.reduce((s, f) => s + f.score, 0) / factors.length);

  return {
    forecast: { series: forecast.series, next30: forecast.next30, trend: forecast.trend, trendPct: forecast.trendPct },
    churnRisk,
    opportunities,
    health: { score, factors },
  };
}
