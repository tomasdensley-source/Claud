/** Snap / alignment helpers for deliberate placement. */

export const GRID_SIZE = 20;
export const GUIDE_THRESHOLD = 8;

export function snapToGrid(value: number, grid = GRID_SIZE): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / grid) * grid;
}

export function snapPoint(
  point: { x: number; y: number },
  grid = GRID_SIZE,
): { x: number; y: number } {
  return { x: snapToGrid(point.x, grid), y: snapToGrid(point.y, grid) };
}

export type GuideLine =
  | { axis: 'x'; value: number; kind: 'left' | 'center' | 'right' }
  | { axis: 'y'; value: number; kind: 'top' | 'center' | 'bottom' };

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Compute alignment guides + snapped dx/dy for a moving box against others. */
export function computeAlignmentGuides(
  moving: Box,
  others: Box[],
  threshold = GUIDE_THRESHOLD,
): { dx: number; dy: number; guides: GuideLine[] } {
  const left = moving.x;
  const right = moving.x + moving.width;
  const cx = moving.x + moving.width / 2;
  const top = moving.y;
  const bottom = moving.y + moving.height;
  const cy = moving.y + moving.height / 2;

  let bestDx = 0;
  let bestDy = 0;
  let bestAbsX = threshold + 1;
  let bestAbsY = threshold + 1;
  let guideX: GuideLine | null = null;
  let guideY: GuideLine | null = null;

  for (const o of others) {
    if (o.id === moving.id) continue;
    const oL = o.x;
    const oR = o.x + o.width;
    const oCx = o.x + o.width / 2;
    const oT = o.y;
    const oB = o.y + o.height;
    const oCy = o.y + o.height / 2;

    const xCandidates: { delta: number; value: number; kind: Extract<GuideLine, { axis: 'x' }>['kind'] }[] = [
      { delta: oL - left, value: oL, kind: 'left' },
      { delta: oCx - cx, value: oCx, kind: 'center' },
      { delta: oR - right, value: oR, kind: 'right' },
      { delta: oL - right, value: oL, kind: 'right' },
      { delta: oR - left, value: oR, kind: 'left' },
    ];
    for (const c of xCandidates) {
      const a = Math.abs(c.delta);
      if (a <= threshold && a < bestAbsX) {
        bestAbsX = a;
        bestDx = c.delta;
        guideX = { axis: 'x', value: c.value, kind: c.kind };
      }
    }

    const yCandidates: { delta: number; value: number; kind: Extract<GuideLine, { axis: 'y' }>['kind'] }[] = [
      { delta: oT - top, value: oT, kind: 'top' },
      { delta: oCy - cy, value: oCy, kind: 'center' },
      { delta: oB - bottom, value: oB, kind: 'bottom' },
      { delta: oT - bottom, value: oT, kind: 'bottom' },
      { delta: oB - top, value: oB, kind: 'top' },
    ];
    for (const c of yCandidates) {
      const a = Math.abs(c.delta);
      if (a <= threshold && a < bestAbsY) {
        bestAbsY = a;
        bestDy = c.delta;
        guideY = { axis: 'y', value: c.value, kind: c.kind };
      }
    }
  }

  const guides: GuideLine[] = [];
  if (guideX && bestAbsX <= threshold) guides.push(guideX);
  if (guideY && bestAbsY <= threshold) guides.push(guideY);

  return {
    dx: bestAbsX <= threshold ? bestDx : 0,
    dy: bestAbsY <= threshold ? bestDy : 0,
    guides,
  };
}

/** Point-in-polygon (ray cast) for lasso selection. */
export function pointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[],
): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
