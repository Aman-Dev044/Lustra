import { Router } from 'express';
import { z } from 'zod';
import type { Types } from 'mongoose';
import { Job, type JobDoc } from '../models/Job.js';
import { Shop } from '../models/Shop.js';
import { User } from '../models/User.js';
import { ctx, requireRole } from '../lib/auth.js';
import { JOB_POPULATE, broadcastJob } from '../lib/jobs.js';
import { zonedTime, weekday } from '../lib/availability.js';
import { optimizeOrder, roadKm, timeRoute, type Point } from '../lib/routing.js';
import { USER_FIELDS } from '../lib/http.js';

export const routesRouter = Router();

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

function serviceMinutes(job: JobDoc): number {
  if (job.scheduledStart && job.scheduledEnd) return Math.max(15, (job.scheduledEnd.getTime() - job.scheduledStart.getTime()) / 60_000);
  return Math.max(30, job.lineItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0));
}

const hasGeo = (job: JobDoc) => job.geo?.lat != null && job.geo?.lng != null;
const pointOf = (job: JobDoc): Point => ({ lat: job.geo!.lat, lng: job.geo!.lng });
const firstAssignee = (job: JobDoc) => {
  const a = job.assignees?.[0] as unknown as { _id?: Types.ObjectId } | Types.ObjectId | undefined;
  if (!a) return undefined;
  return String((a as { _id?: Types.ObjectId })._id ?? a);
};

/**
 * Plan a day of mobile work. Without `optimize` the current order (routeOrder, then scheduled start) is timed;
 * with it, unassigned jobs can be balanced across technicians and each route is re-ordered (NN + 2-opt) and persisted.
 */
async function planDay(shopId: Types.ObjectId, date: string, opts: { optimize: boolean; assignUnassigned: boolean }) {
  const shop = await Shop.findById(shopId).select('timezone depot booking address').lean();
  const tz = shop?.timezone ?? 'UTC';
  const dayStart = zonedTime(date, '00:00', tz);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const hours = shop?.booking?.workingHours?.find((h) => h.day === weekday(date));
  const departAt = zonedTime(date, hours && !hours.closed ? hours.open ?? '08:00' : '08:00', tz);

  const jobs = await Job.find({ shop: shopId, mobile: true, stage: { $nin: ['cancelled'] }, scheduledStart: { $gte: dayStart, $lt: dayEnd } })
    .sort({ routeOrder: 1, scheduledStart: 1 })
    .populate(JOB_POPULATE);

  const routable = jobs.filter(hasGeo);
  const depot: Point & { address: string } =
    shop?.depot?.lat != null && shop.depot.lng != null
      ? { address: shop.depot.address ?? '', lat: shop.depot.lat, lng: shop.depot.lng }
      : routable.length
        ? {
            address: shop?.address ?? '',
            lat: routable.reduce((s, j) => s + j.geo!.lat, 0) / routable.length,
            lng: routable.reduce((s, j) => s + j.geo!.lng, 0) / routable.length,
          }
        : { address: shop?.address ?? '', lat: 0, lng: 0 };

  // Group by technician (first assignee).
  const byTech = new Map<string, JobDoc[]>();
  const unassigned: JobDoc[] = [];
  for (const job of jobs) {
    const tech = firstAssignee(job);
    if (!tech || !hasGeo(job)) unassigned.push(job);
    else byTech.set(tech, [...(byTech.get(tech) ?? []), job]);
  }

  let techIds = [...byTech.keys()];
  if (opts.optimize && opts.assignUnassigned) {
    let pool = await User.find({ shop: shopId, active: true, role: 'technician' }).select('_id').lean();
    if (!pool.length) pool = await User.find({ shop: shopId, active: true }).select('_id').lean();
    for (const u of pool) if (!byTech.has(String(u._id))) byTech.set(String(u._id), []);
    techIds = [...byTech.keys()];
    const toAssign = unassigned.filter(hasGeo).sort((a, b) => roadKm(depot, pointOf(b)) - roadKm(depot, pointOf(a)));
    for (const job of toAssign) {
      const centroid = (list: JobDoc[]) =>
        list.length ? { lat: list.reduce((s, j) => s + j.geo!.lat, 0) / list.length, lng: list.reduce((s, j) => s + j.geo!.lng, 0) / list.length } : depot;
      const target = techIds
        .map((id) => ({ id, load: byTech.get(id)!.length, km: roadKm(centroid(byTech.get(id)!), pointOf(job)) }))
        .sort((a, b) => a.load - b.load || a.km - b.km)[0];
      if (!target) break;
      byTech.get(target.id)!.push(job);
      job.set('assignees', [target.id]);
      unassigned.splice(unassigned.indexOf(job), 1);
    }
  }

  const users = await User.find({ _id: { $in: [...byTech.keys()] } }).select(USER_FIELDS).lean();
  const technicians = [];
  for (const [techId, list] of byTech) {
    let ordered = list;
    if (opts.optimize && list.length) {
      const order = optimizeOrder(depot, list.map(pointOf));
      ordered = order.map((i) => list[i]);
    }
    const timing = timeRoute(depot, ordered.map((j) => ({ ...pointOf(j), serviceMinutes: serviceMinutes(j) })), departAt);
    if (opts.optimize) {
      for (const [i, job] of ordered.entries()) {
        job.routeOrder = i + 1;
        job.eta = timing.legs[i].eta;
        await job.save();
        await broadcastJob(shopId, job._id);
      }
    }
    const user = users.find((u) => String(u._id) === techId);
    if (!user || (!list.length && !opts.optimize)) continue;
    technicians.push({
      user,
      stops: ordered.map((job, i) => ({
        job: job.toJSON(),
        order: i + 1,
        lat: job.geo!.lat,
        lng: job.geo!.lng,
        eta: timing.legs[i].eta,
        legKm: timing.legs[i].legKm,
        legMinutes: timing.legs[i].legMinutes,
      })),
      totalKm: timing.totalKm,
      totalMinutes: timing.totalMinutes,
    });
  }
  technicians.sort((a, b) => a.user.name.localeCompare(b.user.name));

  // Re-populate assignees for jobs that were just assigned.
  if (opts.optimize) for (const t of technicians) for (const s of t.stops) s.job = { ...s.job, assignees: [t.user] } as never;

  return { date, depot, technicians, unassigned: unassigned.map((j) => j.toJSON()) };
}

routesRouter.get('/', async (req, res) => {
  const { date } = z.object({ date: dateParam }).parse(req.query);
  res.json(await planDay(ctx(req).shop, date, { optimize: false, assignUnassigned: false }));
});

routesRouter.post('/optimize', requireRole('manager'), async (req, res) => {
  const body = z.object({ date: dateParam, assignUnassigned: z.boolean().default(false) }).parse(req.body);
  res.json(await planDay(ctx(req).shop, body.date, { optimize: true, assignUnassigned: body.assignUnassigned }));
});
