/** Snap / alignment helpers for deliberate placement. */

export const GRID_SIZE = 20;

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
