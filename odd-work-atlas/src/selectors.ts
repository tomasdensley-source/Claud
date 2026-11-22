import type { AppState, Gig, GigEvent } from './types';
import { belowFloor, effectiveFloor, offerClearsFloor, rates, recommendable, todayISO } from './metrics';

const EARN_STAGES = new Set(['active', 'first_job', 'earning']);

export function earnNow(s: AppState): Gig[] {
  return s.gigs
    .filter(
      (g) =>
        EARN_STAGES.has(g.stage) &&
        !g.flags.blocked &&
        !g.flags.closed &&
        recommendable(g) &&
        !belowFloor(g, s.settings),
    )
    .sort((a, b) => (rates(b.jobs).perHour ?? -1) - (rates(a.jobs).perHour ?? -1) || a.name.localeCompare(b.name));
}

const queueOrder = (a: Gig, b: Gig) =>
  Number(b.pinned) - Number(a.pinned) ||
  (a.queuePosition ?? 1e9) - (b.queuePosition ?? 1e9) ||
  b.updatedAt - a.updatedAt;

export function waitingOnMe(s: AppState): Gig[] {
  return s.gigs.filter((g) => g.flags.waitingOnMe && !g.flags.closed && !g.neverRecommend).sort(queueOrder);
}

export function waitingOnThem(s: AppState): Gig[] {
  return s.gigs.filter((g) => g.flags.waitingOnThem && !g.flags.closed).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function queue(s: AppState): Gig[] {
  return s.gigs.filter((g) => g.queuePosition != null && recommendable(g)).sort(queueOrder);
}

export interface DatedEvent {
  gig: Gig;
  event: GigEvent;
}

/** Calendar surfaces show confirmed events only, and never a shift offer under its floor. */
export function upcoming(s: AppState, fromISO = todayISO(), days = 14): DatedEvent[] {
  const end = new Date();
  end.setDate(end.getDate() + days);
  const endISO = todayISO(end);
  const out: DatedEvent[] = [];
  for (const g of s.gigs) {
    if (g.flags.closed || g.neverRecommend) continue;
    const floor = effectiveFloor(g, s.settings);
    for (const e of g.events) {
      if (!e.confirmed) continue;
      if (e.date < fromISO || e.date > endISO) continue;
      if (e.pay && !offerClearsFloor(e.pay, floor)) continue;
      out.push({ gig: g, event: e });
    }
  }
  return out.sort((a, b) => (a.event.date + (a.event.time ?? '')).localeCompare(b.event.date + (b.event.time ?? '')));
}

export function haystack(g: Gig): string {
  return [g.name, g.platform, g.category, g.description, g.note, g.nextStep, g.appName ?? '', g.appSweepNote, g.lists.join(' ')]
    .join(' \n ')
    .toLowerCase();
}

export function matches(g: Gig, query: string, cache?: Map<string, string>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  let h = cache?.get(g.id);
  if (h == null) {
    h = haystack(g);
    cache?.set(g.id, h);
  }
  return q.split(/\s+/).every((t) => h!.includes(t));
}
