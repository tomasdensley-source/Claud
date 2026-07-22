/**
 * Fieldnote gesture priority (Android blueprint).
 *
 * Highest → lowest:
 * 1. Two-finger navigation (pan + pinch) — always wins, even over objects/UI chrome.
 * 2. One-finger object manipulation (drag / resize / connector).
 * 3. One-finger empty-space marquee (select mode) or draw stroke (draw mode).
 * 4. Long-press empty → contextual add (movement-tolerant ~0.5s).
 * 5. Tap empty → clear selection / dismiss edit.
 */

import { MAX_SCALE, MIN_SCALE } from './camera';

export const GESTURE = {
  LONG_PRESS_MS: 480,
  LONG_PRESS_MAX_DIST: 22,
  MARQUEE_MIN_DIST: 10,
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
  | 'draw'
  | 'contextual'
  | 'tap';

export function isTwoFingerNav(pointerCount: number): boolean {
  return pointerCount >= GESTURE.NAV_MIN_POINTERS;
}
