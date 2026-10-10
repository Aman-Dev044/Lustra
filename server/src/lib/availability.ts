/** Booking slot computation in the shop's local timezone. */

export interface WorkingHour {
  day: number;
  open?: string | null;
  close?: string | null;
  closed?: boolean | null;
}

export interface BookingSettings {
  leadTimeHours?: number | null;
  slotMinutes?: number | null;
  bays?: number | null;
  workingHours?: WorkingHour[] | null;
}

export interface BusyBlock {
  start: Date;
  end: Date;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - instant.getTime();
}

/** Convert a wall-clock date/time in `timeZone` to a UTC Date. */
export function zonedTime(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  // Second pass corrects for DST transitions between guess and result.
  result = guess - tzOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD calendar date. */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function computeSlots(opts: {
  date: string;
  timeZone: string;
  booking: BookingSettings;
  durationMinutes: number;
  busy: BusyBlock[];
  now?: Date;
}): Slot[] {
  const { date, timeZone, booking, busy } = opts;
  const now = opts.now ?? new Date();
  const hours = booking.workingHours?.find((h) => h.day === weekday(date));
  if (!hours || hours.closed) return [];

  const open = zonedTime(date, hours.open ?? '08:00', timeZone);
  const close = zonedTime(date, hours.close ?? '18:00', timeZone);
  const dayMinutes = (close.getTime() - open.getTime()) / 60_000;
  if (dayMinutes <= 0) return [];

  const step = Math.max(15, booking.slotMinutes ?? 30);
  const bays = Math.max(1, booking.bays ?? 1);
  // Multi-day work (e.g. full-body PPF) only needs to fit the remainder of the first day.
  const blockMinutes = Math.min(Math.max(step, opts.durationMinutes || step), dayMinutes);
  const earliest = now.getTime() + (booking.leadTimeHours ?? 0) * 3_600_000;

  const slots: Slot[] = [];
  for (let t = open.getTime(); t + blockMinutes * 60_000 <= close.getTime(); t += step * 60_000) {
    const start = new Date(t);
    const end = new Date(t + blockMinutes * 60_000);
    const overlapping = busy.filter((b) => b.start < end && b.end > start).length;
    slots.push({ start: start.toISOString(), end: end.toISOString(), available: t >= earliest && overlapping < bays });
  }
  return slots;
}
