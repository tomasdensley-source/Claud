// Pure geometry for corner-handle resizing: given which corner is being
// dragged, the item's rect at drag start, and the drag delta so far (in the
// same units as the rect), returns the new rect. The opposite corner always
// stays fixed, and a minimum size is enforced without letting that anchor
// corner drift — clamping only ever moves the dragged edge back to the
// minimum distance from the anchor.

// Single source of truth for the smallest a card can be resized to, shared
// between the handle math below and BoardContext's own clamp.
export const MIN_ITEM_WIDTH = 80;
export const MIN_ITEM_HEIGHT = 60;

export type ResizeCorner = 'tl' | 'tr' | 'bl' | 'br';

export interface ResizeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeResizeRect(
  corner: ResizeCorner,
  start: ResizeRect,
  dx: number,
  dy: number,
  minWidth: number,
  minHeight: number,
): ResizeRect {
  const affectsLeft = corner === 'tl' || corner === 'bl';
  const affectsTop = corner === 'tl' || corner === 'tr';

  let x = start.x;
  let width: number;
  if (affectsLeft) {
    width = start.width - dx;
    x = start.x + dx;
    if (width < minWidth) {
      width = minWidth;
      x = start.x + start.width - minWidth;
    }
  } else {
    width = Math.max(minWidth, start.width + dx);
  }

  let y = start.y;
  let height: number;
  if (affectsTop) {
    height = start.height - dy;
    y = start.y + dy;
    if (height < minHeight) {
      height = minHeight;
      y = start.y + start.height - minHeight;
    }
  } else {
    height = Math.max(minHeight, start.height + dy);
  }

  return { x, y, width, height };
}
