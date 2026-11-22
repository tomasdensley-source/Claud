// Live state as of Sun Nov 22, 2026 (brief sections 5 and 6), layered on top of
// the Appendix A records. Keys are exact record names. Stages are not changed:
// Appendix A stages are kept exactly as registered.
import type { FlagKey, GigEvent } from '../types';

export interface Overlay {
  flags?: Partial<Record<FlagKey, boolean>>;
  nextStep?: string;
  floor?: number;
  floorUntil?: string;
  dailyCap?: number;
  events?: Omit<GigEvent, 'id'>[];
  neverRecommendReason?: string;
}

export const OVERLAY: Record<string, Overlay> = {
  // 6.1 Earning / active now
  Taggr: { nextStep: 'Paid weekly on Wednesdays. Work in the app when lots are busy.' },
  Instawork: {
    floor: 20,
    floorUntil: '2026-12-25',
    nextStep: 'Take holiday shifts only if they clear $20/hr door-to-door (through Dec 25).',
  },
  AmRide: { nextStep: 'One job so far: $350 + $50 tip, about 6 hours. Watch for more rides.' },
  'Papa Pal': { nextStep: 'About 2 jobs so far. Pay is low; take only when nothing better is open.' },

  // 6.2 Waitlisted
  WeGoLook: {
    flags: { waitlisted: true, waitingOnThem: true },
    nextStep: 'Waitlisted since Oct 11. Inspector spots are full. They email when one opens.',
  },
  ShareTown: {
    flags: { waitlisted: true, waitingOnThem: true },
    nextStep: 'Waitlisted Nov 22: no openings in your area. Loads are big; a Corolla may not qualify.',
  },
  Instacart: { flags: { waitlisted: true, waitingOnThem: true }, nextStep: 'On the waitlist.' },
  Grubhub: { flags: { waitlisted: true, waitingOnThem: true }, nextStep: 'On the waitlist.' },

  // 6.3 Applied / paperwork pipeline
  Respondent: {
    flags: { waitingOnMe: true },
    dailyCap: 3,
    nextStep:
      'Finish About me and Professional background (profile is about 12%). Pick up to 3 studies a day from the 15 strong matches.',
  },
  UserTesting: {
    flags: { waitingOnMe: true, blocked: true },
    nextStep:
      'Profile cannot save: the form needs a computer, and you have none. Your steps: confirm email, PayPal, spoken practice test.',
  },
  'Market Force': {
    flags: { waitingOnMe: true },
    nextStep: 'In the app: add government photo ID and a payment method. Then you can take a first assignment.',
  },
  'Mapillary Marketplace': {
    flags: { waitingOnMe: true },
    nextStep: 'Tap the email verification link.',
  },
  Wyzant: {
    flags: { waitingOnMe: true },
    nextStep:
      'Stopped at step 2 of 6: the "How Wyzant Works" quiz (yours). Then Basic info, Profile, Terms, Email confirm. Subject: Piano.',
  },
  'ABC Legal Process Serving': {
    flags: { waitingOnMe: true },
    nextStep:
      'Mon Nov 23: court appointment at the Salt Lake County Clerk, 10:00 AM. Training at 1:00 PM. Background check last (your consent).',
    events: [
      { date: '2026-11-23', time: '10:00', title: 'Court appointment, Salt Lake County Clerk', confirmed: true },
      { date: '2026-11-23', time: '13:00', title: 'ABC Legal training block', confirmed: true },
    ],
  },
  Backstage: { nextStep: 'Account reported created Nov 21 but not checked. Sign in once to confirm it works.' },
  'Terraboost Poster Installation': {
    flags: { waitingOnThem: true },
    nextStep: 'Applied Sep 26. Screening answers sent Oct 13. Nudge sent Nov 22. Waiting on the recruiter.',
  },
  HONK: {
    flags: { blocked: true },
    nextStep: 'Dead end: the partner portal needs a towing license. Only useful with a towing business.',
  },
  TryMyUI: {
    flags: { waitingOnMe: true },
    nextStep: 'TryMyUI is dead. Its successor is QuestionPro UX. Sign up on your phone; stop before the spoken test.',
  },
  'User Interviews': {
    flags: { blocked: true },
    nextStep: 'On hold by your order (Nov 22). Do not pursue.',
  },
  dscout: {
    flags: { waitingOnMe: true },
    nextStep: 'No account yet: the human check blocked the assistant. Sign up on your phone.',
  },
  OnlineVerdict: {
    flags: { waitingOnMe: true },
    nextStep: 'Form is parked. Enter date of birth and demographics, then e-sign consent and Register.',
  },
  'Bunny Studio': {
    flags: { waitingOnMe: true },
    nextStep: 'Parked at the Creator Agreement. There is a $5 fee (your call) and a voice test (yours).',
  },
  'Remote Dream Interpreter': {
    flags: { waitingOnMe: true },
    nextStep: 'Keen application barely started. Needs your own experience answers and a resume upload.',
  },
  MobilAds: {
    flags: { waitingOnMe: true },
    nextStep: 'Now Good Traffic. Not applied yet. Needs car color and "how did you hear" answers.',
  },
  ToursByLocals: { nextStep: 'Form was filled Nov 21 but never sent and not saved. Treat as not applied.' },
  iVueit: {
    flags: { waitingOnMe: true },
    nextStep: 'Sign up in the iVueit app (answers are ready). Payouts are PayPal only.',
  },
  'CDS (Club Demonstration Services)': {
    flags: { waitingOnMe: true },
    nextStep: 'Application is at the review screen, not sent. Submitting is your decision. $17.50/hr, West Valley Costco.',
  },

  // Section 5: closed is closed, and Amazon Flex is blocked
  'Walmart Spark': { flags: { closed: true }, nextStep: 'Closed: denied on driving record. Do not reapply.' },
  Roadie: { flags: { closed: true }, nextStep: 'Closed: denied on driving record. Do not reapply.' },
  'Poplin Laundry Pro': { flags: { closed: true }, nextStep: 'Closed: banned over a duplicate account. Do not reapply.' },
  Shipt: { flags: { closed: true }, nextStep: 'Closed: removed for late deliveries. Appeals are closed.' },
  DeliverThat: { flags: { closed: true }, nextStep: 'Closed: background check failed. Do not reapply.' },
  TakeLessons: { flags: { closed: true }, nextStep: 'Closed: the platform shut down Nov 15, 2024.' },
  'Amazon Flex': {
    flags: { blocked: true },
    nextStep: 'Blocked by identity theft (someone used your SSN). Escalation in progress. Do not just reapply.',
  },
};

/**
 * "Your active gigs" was a list, not a kind of work, and CDS had a one-off
 * category. These put each one in the Atlas category that matches its work.
 */
export const CATEGORY_FIX: Record<string, string> = {
  AmRide: 'Drive & Courier',
  'Facebook Marketplace Selling': 'Selling & Creator',
  Instawork: 'Shift Work & Staffing',
  'TaskRabbit (general)': 'Home, Yard & Assets',
  'TaskRabbit — Christmas Lights Setup': 'Home, Yard & Assets',
  'CDS (Club Demonstration Services)': 'Shift Work & Staffing',
};

/** Needle rule: these exist as records only and are never recommended. */
export const NEEDLE_CATEGORY = 'Health & Plasma';
export const NEEDLE_REASON = 'Needle rule: plasma donation is never recommended.';

/** The standing Top 10 (Nov 18, 2026), seeded as the priority queue in this order. */
export const TOP_10 = [
  'ezCater Relay',
  'Traba',
  'GigPro',
  'WorkWhile',
  'BetterTrucks',
  'CDS (Club Demonstration Services)',
  'Wingz',
  'Respondent',
  'ProxyPics',
  'Jitjatjo',
];

/** Top-25 "apply first" novelty ranking (Nov 21, 2026). */
export const TOP_25 = [
  'OnlineVerdict',
  'Respondent',
  'User Interviews',
  'dscout',
  'UserTesting',
  'TryMyUI',
  'Bunny Studio',
  'Backstage',
  'Remote Dream Interpreter',
  'Field Agent',
  'iVueit',
  'ProxyPics',
  'Market Force',
  'Wingz',
  'Utah Private Ride',
  'Dryver',
  'HONK',
  'ShareTown',
  'Terraboost Poster Installation',
  'SigningOrder',
  'TakeLessons',
  'ToursByLocals',
  'Mapillary Marketplace',
  'MobilAds',
  'Jitjatjo',
];

export const LIST_TOP10 = 'Top 10 next (Nov 18)';
export const LIST_TOP25 = 'Top 25 apply first (Nov 21)';

/** Section 6.4: the one record added to the registry. */
export const ADDED_RECORDS = [
  {
    name: 'CDS (Club Demonstration Services)',
    category: 'Field Services / Product Demonstration',
    stage: 'researching',
    description:
      "Costco's in-store product demonstration company; demonstrators run sampling/cooking demos inside Costco warehouses.",
    note:
      "Thomas's application for Part Time Product Demonstrator, Costco 3747 South 2700 West, West Valley, UT 84119 ($17.50/hr, Req. PDX_ASI_4642DE44-E5EB-4F30-ACBE-AC2BEAFF79F4) was filled to the review screen on Nov 21, 2026 and is NOT submitted; submitting is Thomas's decision alone. No background-check consent has been given.",
    appUrl: null,
    appName: null,
    appSweepNote:
      'No app. The Play listing "Complete Delivery Solution" is a different company. Do not link it.',
  },
];
