/** Camera helpers: screen = world * scale + translate (origin top-left). */

/**
 * Near-infinite zoom. Soft clamps only to avoid float blow-ups /
 * invisible content — not a creative limit.
 */
export const MIN_SCALE = 0.02; // 2% — board as a distant map
export const MAX_SCALE = 64; // 6400% — deep into a card

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  scale: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
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
): { scale: number; tx: number; ty: number } {
  const safePrev = prevScale > 0 ? prevScale : 1;
  const s = clampScale(nextScale);
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
  // Fit may go very small for huge boards; avoid forced zoom-in past ~120%.
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

/** Format zoom for the control chip (supports deep zoom). */
export function formatZoomPercent(scale: number): string {
  const pct = scale * 100;
  if (pct >= 1000) return `${Math.round(pct / 100) * 100}%`;
  if (pct >= 100) return `${Math.round(pct)}%`;
  if (pct >= 10) return `${Math.round(pct)}%`;
  return `${pct.toFixed(1)}%`;
}
