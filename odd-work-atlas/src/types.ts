export const STAGES = ['not_started', 'researching', 'signed_up', 'active', 'first_job', 'earning'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  not_started: 'Not started',
  researching: 'Researching',
  signed_up: 'Signed up',
  active: 'Active',
  first_job: 'First job done',
  earning: 'Earning',
};

export type FlagKey = 'waitlisted' | 'blocked' | 'closed' | 'waitingOnMe' | 'waitingOnThem';
export const FLAG_KEYS: FlagKey[] = ['waitingOnMe', 'waitingOnThem', 'waitlisted', 'blocked', 'closed'];
export const FLAG_LABEL: Record<FlagKey, string> = {
  waitingOnMe: 'Waiting on me',
  waitingOnThem: 'Waiting on them',
  waitlisted: 'Waitlisted',
  blocked: 'Blocked',
  closed: 'Closed',
};

export type NoSkillTier = 1 | 2 | 'excluded' | null;

/** One worked job. Drive time and miles are the full round trip from home. */
export interface Job {
  id: string;
  date: string; // YYYY-MM-DD
  gross: number;
  shiftHours: number;
  driveMinutes: number;
  miles: number;
  memo?: string;
}

/** A dated item. Only confirmed events appear on calendar surfaces. */
export interface GigEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM, 24h
  title: string;
  confirmed: boolean;
  /** Optional pay for a shift offer, used for the floor test. */
  pay?: { gross: number; shiftHours: number; driveMinutes: number; miles: number };
}

export interface Gig {
  id: string;
  name: string;
  platform: string;
  category: string;
  stage: Stage;
  description: string;
  note: string;
  appUrl: string | null;
  appName: string | null;
  appSweepNote: string;
  reviewUrl: string | null;
  floor: number | null;
  floorUntil: string | null; // YYYY-MM-DD, floor stops applying after this day
  pinned: boolean;
  queuePosition: number | null;
  flags: Record<FlagKey, boolean>;
  neverRecommend: boolean;
  neverRecommendReason: string;
  nextStep: string;
  noSkillTier: NoSkillTier;
  lists: string[];
  dailyCap: number | null;
  jobs: Job[];
  events: GigEvent[];
  createdAt: number;
  updatedAt: number;
}

export interface Profile {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  device: string;
  license: string;
  vehicle: string;
  radius: string;
  availability: string;
  householdIncome: string;
  computer: string;
  extra: string;
}

export interface Settings {
  home: string;
  categoryFloors: Record<string, number>;
  lastBackupAt: number | null;
}

export interface AppState {
  schema: 1;
  seededAt: number;
  gigs: Gig[];
  profile: Profile;
  settings: Settings;
  /** Applications sent per gig per day, for gigs with a daily cap. key = gigId|YYYY-MM-DD */
  dailyCounts: Record<string, number>;
}
