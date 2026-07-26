// Camera math for the infinite canvas.
//
// The camera is a single affine transform applied to the world layer:
//   screen = world * scale + translate
// Everything (pan, pinch, zoom controls, fit) funnels through the same clamp so
// the zoom range is consistent no matter which control drives it.

// Wide but stable zoom range. 0.01x lets you see an entire large board at a
// glance; 50x lets you work on fine detail. Values outside this range make the
// SVG transform numerically unstable, so we always clamp.
export const MIN_SCALE = 0.01;
export const MAX_SCALE = 50;

// Clamp a proposed scale into the supported range. Marked as a worklet so it can
// be called from inside gesture handlers on the UI thread as well as from JS.
export function clampScale(s: number): number {
  'worklet';
  if (!Number.isFinite(s)) return 1;
  if (s < MIN_SCALE) return MIN_SCALE;
  if (s > MAX_SCALE) return MAX_SCALE;
  return s;
}

export interface Point {
  x: number;
  y: number;
}

// Convert a screen-space point to world space given the current camera.
export function screenToWorld(
  sx: number,
  sy: number,
  scale: number,
  tx: number,
  ty: number,
): Point {
  'worklet';
  return { x: (sx - tx) / scale, y: (sy - ty) / scale };
}

// Convert a world-space point to screen space given the current camera.
export function worldToScreen(
  wx: number,
  wy: number,
  scale: number,
  tx: number,
  ty: number,
): Point {
  'worklet';
  return { x: wx * scale + tx, y: wy * scale + ty };
}
