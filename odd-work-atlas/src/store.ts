import { useSyncExternalStore } from 'react';
import seed from './data/seed.json';
import {
  ADDED_RECORDS,
  LIST_TOP10,
  LIST_TOP25,
  NEEDLE_CATEGORY,
  NEEDLE_REASON,
  OVERLAY,
  TOP_10,
  TOP_25,
} from './data/liveState';
import type { AppState, Gig, Profile, Stage } from './types';
import { todayISO } from './metrics';
import { readAutoBackup, writeAutoBackup } from './native';

const KEY = 'owa.state.v1';

type SeedRecord = {
  name: string;
  category: string;
  stage: string;
  description: string;
  note: string;
  appUrl: string | null;
  appName: string | null;
  appSweepNote: string;
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function buildSeedState(): AppState {
  const now = Date.now();
  const records = [...(seed as SeedRecord[]), ...ADDED_RECORDS];
  const gigs: Gig[] = records.map((r) => {
    const o = OVERLAY[r.name] ?? {};
    const needle = r.category === NEEDLE_CATEGORY;
    const top10 = TOP_10.indexOf(r.name);
    const lists: string[] = [];
    if (top10 >= 0) lists.push(LIST_TOP10);
    if (TOP_25.includes(r.name)) lists.push(LIST_TOP25);
    const closed = !!o.flags?.closed;
    return {
      id: slug(r.name),
      name: r.name,
      platform: r.name,
      category: r.category,
      stage: r.stage as Stage,
      description: r.description,
      note: r.note,
      appUrl: r.appUrl,
      appName: r.appName,
      appSweepNote: r.appSweepNote,
      reviewUrl: null,
      floor: o.floor ?? null,
      floorUntil: o.floorUntil ?? null,
      pinned: false,
      queuePosition: top10 >= 0 && !closed && !needle ? top10 : null,
      flags: {
        waitlisted: !!o.flags?.waitlisted,
        blocked: !!o.flags?.blocked,
        closed,
        waitingOnMe: !!o.flags?.waitingOnMe,
        waitingOnThem: !!o.flags?.waitingOnThem,
      },
      neverRecommend: needle,
      neverRecommendReason: needle ? NEEDLE_REASON : '',
      nextStep: o.nextStep ?? '',
      noSkillTier: null,
      lists,
      dailyCap: o.dailyCap ?? null,
      jobs: [],
      events: (o.events ?? []).map((e) => ({ ...e, id: uid() })),
      createdAt: now,
      updatedAt: now,
    };
  });
  const ids = new Set(gigs.map((g) => g.id));
  if (ids.size !== gigs.length) throw new Error('Duplicate gig ids in seed');

  const profile: Profile = {
    fullName: 'Thomas Densley',
    dateOfBirth: '',
    address: '933 E 300 S, Salt Lake City, UT 84102',
    phone: '',
    email: '',
    device: 'Samsung Galaxy S24 Ultra',
    license: 'Valid driver license (number never stored here)',
    vehicle: '2024 Toyota Corolla Hybrid',
    radius: '100 miles, if it pays',
    availability: 'Full time',
    householdIncome: '$40,000 to $59,999',
    computer: 'No computer owned (phone only)',
    extra: '',
  };

  return {
    schema: 1,
    seededAt: now,
    gigs,
    profile,
    settings: { home: '933 E 300 S, Salt Lake City, UT 84102', categoryFloors: {}, lastBackupAt: null },
    dailyCounts: {},
  };
}

let loadedFromStorage = false;

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    loadedFromStorage = !!raw;
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.schema === 1 && Array.isArray(parsed.gigs)) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return buildSeedState();
}

let state: AppState = load();

/** If app storage was wiped but the private auto-backup survived, bring it back. */
export async function restoreFromAutoBackupIfNeeded(): Promise<boolean> {
  if (loadedFromStorage) return false;
  const raw = await readAutoBackup();
  if (raw) {
    try {
      setState(validateImport(raw));
      return true;
    } catch {
      /* unreadable backup: keep the fresh seed */
    }
  }
  // First run: save the seed so it exists on disk from the start.
  persist();
  return false;
}
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(KEY, json);
    } catch {
      /* storage full or blocked; the auto-backup file still gets a copy */
    }
    void writeAutoBackup(json);
  }, 250);
}

export function getState() {
  return state;
}

export function setState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** The whole state; the reference only changes when something changes. Derive with useMemo. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

export function updateGig(id: string, patch: Partial<Gig> | ((g: Gig) => Partial<Gig>)) {
  setState({
    ...state,
    gigs: state.gigs.map((g) =>
      g.id === id ? { ...g, ...(typeof patch === 'function' ? patch(g) : patch), updatedAt: Date.now() } : g,
    ),
  });
}

export function addToQueue(id: string) {
  const max = Math.max(-1, ...state.gigs.map((g) => g.queuePosition ?? -1));
  updateGig(id, { queuePosition: max + 1 });
}

export function removeFromQueue(id: string) {
  updateGig(id, { queuePosition: null, pinned: false });
}

/** Re-number the queue to match the given order of ids. */
export function reorderQueue(orderedIds: string[]) {
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  setState({
    ...state,
    gigs: state.gigs.map((g) => (pos.has(g.id) ? { ...g, queuePosition: pos.get(g.id)! } : g)),
  });
}

export function updateProfile(patch: Partial<Profile>) {
  setState({ ...state, profile: { ...state.profile, ...patch } });
}

export function setCategoryFloor(category: string, value: number | null) {
  const floors = { ...state.settings.categoryFloors };
  if (value == null) delete floors[category];
  else floors[category] = value;
  setState({ ...state, settings: { ...state.settings, categoryFloors: floors } });
}

export function dailyCount(gigId: string, day = todayISO()) {
  return state.dailyCounts[`${gigId}|${day}`] ?? 0;
}

export function bumpDailyCount(gigId: string, delta: number, day = todayISO()) {
  const key = `${gigId}|${day}`;
  const next = Math.max(0, (state.dailyCounts[key] ?? 0) + delta);
  setState({ ...state, dailyCounts: { ...state.dailyCounts, [key]: next } });
}

export function markBackedUp() {
  setState({ ...state, settings: { ...state.settings, lastBackupAt: Date.now() } });
}

export function replaceAll(next: AppState) {
  setState(next);
}

export function exportJSON(): string {
  return JSON.stringify(state, null, 2);
}

export function validateImport(text: string): AppState {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.schema !== 1 || !Array.isArray(parsed.gigs) || !parsed.profile || !parsed.settings) {
    throw new Error('This file is not an Odd-Work Atlas backup.');
  }
  return parsed as AppState;
}

export function categories(s: AppState): string[] {
  return [...new Set(s.gigs.map((g) => g.category))].sort();
}
