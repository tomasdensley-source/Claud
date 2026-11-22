import type { Gig, Job, Settings } from './types';

export interface Rates {
  gross: number;
  hours: number; // shift + drive
  miles: number;
  jobs: number;
  perHour: number | null;
  perMile: number | null;
}

/** Door-to-door: gross / (shift hours + round-trip drive hours), and gross / round-trip miles. */
export function rates(jobs: Pick<Job, 'gross' | 'shiftHours' | 'driveMinutes' | 'miles'>[]): Rates {
  let gross = 0;
  let hours = 0;
  let miles = 0;
  for (const j of jobs) {
    gross += j.gross;
    hours += j.shiftHours + j.driveMinutes / 60;
    miles += j.miles;
  }
  return {
    gross,
    hours,
    miles,
    jobs: jobs.length,
    perHour: hours > 0 ? gross / hours : null,
    perMile: miles > 0 ? gross / miles : null,
  };
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The floor that applies to a gig today: its own (unless expired), else its category floor. */
export function effectiveFloor(g: Gig, settings: Settings, today = todayISO()): number | null {
  if (g.floor != null && (!g.floorUntil || today <= g.floorUntil)) return g.floor;
  const cat = settings.categoryFloors[g.category];
  return cat != null ? cat : null;
}

/**
 * Floors are filters. A gig whose measured door-to-door $/hr is under its floor
 * is hidden from Today and queue suggestions. A gig with no jobs yet is not hidden.
 */
export function belowFloor(g: Gig, settings: Settings): boolean {
  const f = effectiveFloor(g, settings);
  if (f == null) return false;
  const r = rates(g.jobs);
  return r.perHour != null && r.perHour < f;
}

export function offerClearsFloor(
  pay: { gross: number; shiftHours: number; driveMinutes: number; miles: number },
  floor: number | null,
): boolean {
  if (floor == null) return true;
  const r = rates([pay]);
  return r.perHour != null && r.perHour >= floor;
}

/** Can this gig be recommended anywhere (Today, queue suggestions)? */
export function recommendable(g: Gig): boolean {
  return !g.neverRecommend && !g.flags.closed;
}

export const money = (n: number | null | undefined, digits = 0): string =>
  n == null || !isFinite(n)
    ? '–'
    : n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const perHour = (n: number | null) => (n == null ? 'No data' : `${money(n, 2)}/hr`);
export const perMile = (n: number | null) => (n == null ? 'No data' : `${money(n, 2)}/mi`);

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function prettyTime(hhmm?: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
