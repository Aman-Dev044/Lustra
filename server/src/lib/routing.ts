/** Mobile route planning: haversine × road factor distances, nearest-neighbour + 2-opt ordering. */

export interface Point {
  lat: number;
  lng: number;
}

export const ROAD_FACTOR = 1.3;
export const AVG_SPEED_KMH = 40;

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const roadKm = (a: Point, b: Point) => haversineKm(a, b) * ROAD_FACTOR;
export const driveMinutes = (km: number) => (km / AVG_SPEED_KMH) * 60;

/** Length of an open path depot → stops[order[0]] → … → stops[order[n-1]]. */
export function pathKm(depot: Point, stops: Point[], order: number[]): number {
  let km = 0;
  let prev = depot;
  for (const i of order) {
    km += roadKm(prev, stops[i]);
    prev = stops[i];
  }
  return km;
}

export function nearestNeighbour(depot: Point, stops: Point[]): number[] {
  const remaining = new Set(stops.map((_, i) => i));
  const order: number[] = [];
  let current = depot;
  while (remaining.size) {
    let best = -1;
    let bestKm = Infinity;
    for (const i of remaining) {
      const km = roadKm(current, stops[i]);
      if (km < bestKm) {
        bestKm = km;
        best = i;
      }
    }
    order.push(best);
    remaining.delete(best);
    current = stops[best];
  }
  return order;
}

/** 2-opt improvement for an open path anchored at the depot. */
export function twoOpt(depot: Point, stops: Point[], initial: number[]): number[] {
  let order = [...initial];
  let best = pathKm(depot, stops, order);
  let improved = true;
  for (let pass = 0; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        const km = pathKm(depot, stops, candidate);
        if (km + 1e-9 < best) {
          order = candidate;
          best = km;
          improved = true;
        }
      }
    }
  }
  return order;
}

export function optimizeOrder(depot: Point, stops: Point[]): number[] {
  if (stops.length <= 1) return stops.map((_, i) => i);
  return twoOpt(depot, stops, nearestNeighbour(depot, stops));
}

export interface TimedStop extends Point {
  serviceMinutes: number;
  /** Earliest time the customer expects us (scheduled start). */
  notBefore?: Date | null;
}

export interface Leg {
  legKm: number;
  legMinutes: number;
  eta: Date;
}

/**
 * Walk an ordered route from `departAt`, adding drive time between stops and on-site service time.
 * Arrival never precedes a stop's scheduled start (the tech waits).
 */
export function timeRoute(depot: Point, stops: TimedStop[], departAt: Date): { legs: Leg[]; totalKm: number; totalMinutes: number } {
  let clock = departAt.getTime();
  let prev: Point = depot;
  let totalKm = 0;
  const legs = stops.map((stop) => {
    const legKm = roadKm(prev, stop);
    const legMinutes = driveMinutes(legKm);
    clock += legMinutes * 60_000;
    if (stop.notBefore && stop.notBefore.getTime() > clock) clock = stop.notBefore.getTime();
    const eta = new Date(clock);
    clock += stop.serviceMinutes * 60_000;
    totalKm += legKm;
    prev = stop;
    return { legKm: Math.round(legKm * 10) / 10, legMinutes: Math.round(legMinutes), eta };
  });
  return {
    legs,
    totalKm: Math.round(totalKm * 10) / 10,
    totalMinutes: Math.round((clock - departAt.getTime()) / 60_000),
  };
}
