/**
 * Fieldnote gesture priority (Android).
 *
 * Default (select tool):
 * 1. Pinch zoom — sole two-finger camera writer (scale + focal drift pan).
 * 2. One-finger empty-space pan (map-like).
 * 3. One-finger object drag / resize / task hold.
 * 4. Long-press empty → contextual add.
 * 5. Tap empty → clear selection.
 *
 * Multi tool ON (opt-in):
 * 1. Pinch zoom (same sole writer).
 * 2. One-finger empty-space marquee / additive select.
 * 3. Long-press empty → contextual add.
 * 4. Tap empty → clear selection.
 *
 * Draw tool:
 * 1. Pinch for navigation (zoom + drift).
 * 2. One-finger ink stroke.
 *
 * Never Simultaneous(pinch, twoFingerPan) — both wrote tx/ty and made zoom unusable.
 */

import { MAX_SCALE, MIN_SCALE } from './camera';

export const GESTURE = {
  LONG_PRESS_MS: 480,
  LONG_PRESS_MAX_DIST: 22,
  MARQUEE_MIN_DIST: 10,
  /** Empty-space one-finger pan (select mode). */
  PAN_MIN_DIST: 2,
  OBJECT_DRAG_MIN_DIST: 4,
  /** Tasks: require more travel before drag steals the 3s hold. */
  TASK_DRAG_MIN_DIST: 18,
  TASK_HOLD_MS: 3000,
  TASK_HOLD_MAX_DIST: 36,
  NAV_MIN_POINTERS: 2,
  PINCH_MIN_SCALE: MIN_SCALE,
  PINCH_MAX_SCALE: MAX_SCALE,
} as const;

export type GestureLane =
  | 'navigation'
  | 'object'
  | 'marquee'
  | 'pan'
  | 'draw'
  | 'contextual'
  | 'tap';

export function isTwoFingerNav(pointerCount: number): boolean {
  return pointerCount >= GESTURE.NAV_MIN_POINTERS;
}
