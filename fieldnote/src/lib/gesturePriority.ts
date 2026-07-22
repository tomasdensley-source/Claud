/**
 * Fieldnote gesture priority (Android).
 *
 * Default (select tool):
 * 1. Pinch zoom — owns scale + translate about start focal (no sideways fight).
 * 2. One-finger empty-space pan (map-like). Two-finger pan also works when not pinching.
 * 3. One-finger object drag / resize / task hold.
 * 4. Long-press empty → contextual add.
 * 5. Tap empty → clear selection.
 *
 * Multi tool ON (opt-in):
 * 1. Pinch zoom (same focal math).
 * 2. Two-finger pan (one-finger pan disabled).
 * 3. One-finger empty-space marquee / additive select.
 * 4. Long-press empty → contextual add.
 * 5. Tap empty → clear selection.
 *
 * Draw tool:
 * 1. Pinch + two-finger pan for navigation.
 * 2. One-finger ink stroke.
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
