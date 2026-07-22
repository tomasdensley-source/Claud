/** Camera helpers: screen = world * scale + translate (origin top-left). */

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 2.5;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  scale: number,
  tx: number,
  ty: number,
): { x: number; y: number } {
  return {
    x: (screenX - tx) / scale,
    y: (screenY - ty) / scale,
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
  const s = clampScale(nextScale);
  const worldX = (focalX - prevTx) / prevScale;
  const worldY = (focalY - prevTy) / prevScale;
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
  const scale = clampScale(Math.min(viewportWidth / w, viewportHeight / h, 1.2));
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
