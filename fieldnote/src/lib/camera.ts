/**
 * Fieldnote camera model
 * ----------------------
 * screen = world * scale + translate  (origin: top-left of world)
 *
 * Architecture:
 * - Shared values (scale, tx, ty) live on the canvas gesture plane (NOT transformed).
 * - World layer uses static transformOrigin 'top left' + animated translate/scale.
 * - Pinch always zooms about the focal point (finger midpoint).
 * - Soft rubber-band past MIN/MAX during gesture; spring-back on release.
 * - Two-finger pan supports velocity decay (momentum).
 * - Soft clamps exist only to avoid float blow-ups — range is effectively infinite.
 */

export const MIN_SCALE = 0.01; // 1% — map of the whole board
export const MAX_SCALE = 80; // 8000% — deep into ink/type

/** How far past the hard limit the rubber-band may travel during a gesture. */
export const ELASTIC_MIN = MIN_SCALE * 0.55;
export const ELASTIC_MAX = MAX_SCALE * 1.35;

export function clampScale(scale: number): number {
  'worklet';
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Allow temporary overshoot while pinching; still bounds catastrophic values. */
export function softClampScale(scale: number): number {
  'worklet';
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  if (scale < MIN_SCALE) {
    const t = (MIN_SCALE - scale) / Math.max(MIN_SCALE - ELASTIC_MIN, 0.001);
    const resisted = MIN_SCALE - (MIN_SCALE - ELASTIC_MIN) * Math.min(1, t) * 0.45;
    return Math.max(ELASTIC_MIN, resisted);
  }
  if (scale > MAX_SCALE) {
    const t = (scale - MAX_SCALE) / Math.max(ELASTIC_MAX - MAX_SCALE, 0.001);
    const resisted = MAX_SCALE + (ELASTIC_MAX - MAX_SCALE) * Math.min(1, t) * 0.45;
    return Math.min(ELASTIC_MAX, resisted);
  }
  return scale;
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  scale: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  'worklet';
  const s = scale === 0 ? MIN_SCALE : scale;
  return {
    x: (screenX - tx) / s,
    y: (screenY - ty) / s,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  scale: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  'worklet';
  return {
    x: worldX * scale + tx,
    y: worldY * scale + ty,
  };
}

/** Zoom toward a screen focal point while keeping that world point pinned. */
export function zoomAboutFocal(
  nextScale: number,
  focalX: number,
  focalY: number,
  prevScale: number,
  prevTx: number,
  prevTy: number,
  soft = false,
): { scale: number; tx: number; ty: number } {
  'worklet';
  const safePrev = prevScale > 0 ? prevScale : 1;
  const s = soft ? softClampScale(nextScale) : clampScale(nextScale);
  const worldX = (focalX - prevTx) / safePrev;
  const worldY = (focalY - prevTy) / safePrev;
  return {
    scale: s,
    tx: focalX - worldX * s,
    ty: focalY - worldY * s,
  };
}

export function fitTransform(
  viewportWidth: number,
  viewportHeight: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  pad = 72,
): { scale: number; tx: number; ty: number } {
  const w = Math.max(240, maxX - minX + pad * 2);
  const h = Math.max(240, maxY - minY + pad * 2);
  const raw = Math.min(viewportWidth / w, viewportHeight / h);
  const scale = clampScale(Math.min(raw, 1.2));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    scale,
    tx: viewportWidth / 2 - cx * scale,
    ty: viewportHeight / 2 - cy * scale,
  };
}

export function centerOnPoint(
  worldX: number,
  worldY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
): { scale: number; tx: number; ty: number } {
  const s = clampScale(scale);
  return {
    scale: s,
    tx: viewportWidth / 2 - worldX * s,
    ty: viewportHeight / 2 - worldY * s,
  };
}

export function formatZoomPercent(scale: number): string {
  const pct = scale * 100;
  if (pct >= 1000) return `${Math.round(pct / 100) * 100}%`;
  if (pct >= 100) return `${Math.round(pct)}%`;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}
