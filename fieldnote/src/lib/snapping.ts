// Gentle alignment snapping for item dragging: on drop, if the moved item's
// edges or center land close to another item's edges or center, nudge it
// into exact alignment rather than leaving it a few pixels off.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
}

export const DEFAULT_SNAP_THRESHOLD = 6;

function closestOffset(movingLines: number[], targetLines: number[], threshold: number): number {
  let best = 0;
  let bestDist = threshold;
  movingLines.forEach((line) => {
    targetLines.forEach((target) => {
      const dist = Math.abs(target - line);
      if (dist < bestDist) {
        bestDist = dist;
        best = target - line;
      }
    });
  });
  return best;
}

// Computes the (dx, dy) that would snap `moving` onto the nearest edge or
// center line of any rect in `others`, independently per axis. Returns
// {dx: 0, dy: 0} on an axis with nothing within `threshold` world units.
export function computeSnapDelta(
  moving: Rect,
  others: Rect[],
  threshold: number = DEFAULT_SNAP_THRESHOLD,
): SnapResult {
  const targetsX: number[] = [];
  const targetsY: number[] = [];
  others.forEach((r) => {
    targetsX.push(r.x, r.x + r.width / 2, r.x + r.width);
    targetsY.push(r.y, r.y + r.height / 2, r.y + r.height);
  });

  const movingXs = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const movingYs = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];

  return {
    dx: closestOffset(movingXs, targetsX, threshold),
    dy: closestOffset(movingYs, targetsY, threshold),
  };
}
