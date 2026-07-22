/**
 * Fieldnote camera model
 * ----------------------
 * screen = world * scale + translate  (origin: top-left of world)
 *
 * Architecture:
 * - Shared values (scale, tx, ty) live on the canvas gesture plane (NOT transformed).
 * - World layer uses static transformOrigin 'top left' + animated translate/scale.
 * - Pinch is the ONLY two-finger camera writer (scale + focal follow = pan-while-zoom).
 * - Soft rubber-band past MIN/MAX during gesture; hard clamp on release.
 */

export const MIN_SCALE = 0.01; // 1% — map of the whole board
export const MAX_SCALE = 80; // 8000% — deep into ink/type

/** How far past the hard limit the rubber-band may travel during a gesture. */
export const ELASTIC_MIN = MIN_SCALE * 0.55;
export const ELASTIC_MAX = MAX_SCALE * 1.35;

/** Worklet-safe finite check — avoid Number.isFinite on the UI thread. */
export function isPositiveFinite(n: number): boolean {
  'worklet';
  return n === n && n !== Infinity && n !== -Infinity && n > 0;
}

export function clampScale(scale: number): number {
  'worklet';
  if (!isPositiveFinite(scale)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Allow temporary overshoot while pinching; still bounds catastrophic values. */
export function softClampScale(scale: number): number {
  'worklet';
  if (!isPositiveFinite(scale)) return 1;
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
  const s = isPositiveFinite(scale) ? scale : 1;
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
  const s = isPositiveFinite(scale) ? scale : 1;
  return {
    x: worldX * s + tx,
    y: worldY * s + ty,
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
  return zoomAboutStartFocal(
    nextScale,
    focalX,
    focalY,
    focalX,
    focalY,
    prevScale,
    prevTx,
    prevTy,
    soft,
  );
}

/**
 * Pinch zoom that also follows finger midpoint drift.
 * Pins the world point under the START focal to the CURRENT focal so scale
 * and two-finger translation share one writer — no separate pan gesture needed.
 */
export function zoomAboutStartFocal(
  nextScale: number,
  startFocalX: number,
  startFocalY: number,
  currentFocalX: number,
  currentFocalY: number,
  prevScale: number,
  prevTx: number,
  prevTy: number,
  soft = false,
): { scale: number; tx: number; ty: number } {
  'worklet';
  const safePrev = isPositiveFinite(prevScale) ? prevScale : 1;
  const s = soft ? softClampScale(nextScale) : clampScale(nextScale);
  const worldX = (startFocalX - prevTx) / safePrev;
  const worldY = (startFocalY - prevTy) / safePrev;
  const fx = currentFocalX === currentFocalX ? currentFocalX : startFocalX;
  const fy = currentFocalY === currentFocalY ? currentFocalY : startFocalY;
  return {
    scale: s,
    tx: fx - worldX * s,
    ty: fy - worldY * s,
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
