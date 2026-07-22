/** Placement helpers for putting new cards near the live camera center. */

export function placeCentered(
  center: { x: number; y: number },
  width: number,
  height: number,
  index = 0,
  stagger = 28,
): { x: number; y: number } {
  return {
    x: center.x - width / 2 + index * stagger,
    y: center.y - height / 2 + index * stagger,
  };
}

export function placeAtPoint(
  point: { x: number; y: number },
  width: number,
  height: number,
  index = 0,
  stagger = 24,
): { x: number; y: number } {
  return {
    x: point.x - width / 2 + index * stagger,
    y: point.y - height / 2 + index * stagger,
  };
}
