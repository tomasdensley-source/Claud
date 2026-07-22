/**
 * Shared floating-panel placement engine.
 * Keeps chrome inside safe areas with minimum gaps and basic collision avoidance.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const PANEL_GAP = 10;

export function clampRectToSafeArea(
  rect: Rect,
  viewport: { width: number; height: number },
  insets: SafeInsets,
  gap = PANEL_GAP,
): Rect {
  const minX = insets.left + gap;
  const minY = insets.top + gap;
  const maxX = viewport.width - insets.right - gap - rect.width;
  const maxY = viewport.height - insets.bottom - gap - rect.height;
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(rect.y, minY), Math.max(minY, maxY)),
  };
}

export function intersects(a: Rect, b: Rect, gap = PANEL_GAP): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

/** Nudge `moving` away from `blockers` preferring upward then sideways. */
export function resolveCollisions(
  moving: Rect,
  blockers: Rect[],
  viewport: { width: number; height: number },
  insets: SafeInsets,
): Rect {
  let next = clampRectToSafeArea(moving, viewport, insets);
  for (let pass = 0; pass < 6; pass++) {
    let hit = false;
    for (const b of blockers) {
      if (!intersects(next, b)) continue;
      hit = true;
      // Prefer shifting above the blocker.
      const up = { ...next, y: b.y - next.height - PANEL_GAP };
      const down = { ...next, y: b.y + b.height + PANEL_GAP };
      const left = { ...next, x: b.x - next.width - PANEL_GAP };
      const right = { ...next, x: b.x + b.width + PANEL_GAP };
      const candidates = [up, left, right, down].map((c) =>
        clampRectToSafeArea(c, viewport, insets),
      );
      next =
        candidates.find((c) => !blockers.some((blk) => intersects(c, blk))) ??
        candidates[0];
    }
    if (!hit) break;
  }
  return next;
}

export function anchorTopCenter(
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
): Rect {
  return clampRectToSafeArea(
    {
      x: (viewport.width - width) / 2,
      y: insets.top + PANEL_GAP,
      width,
      height,
    },
    viewport,
    insets,
  );
}

export function anchorTopRight(
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
): Rect {
  return clampRectToSafeArea(
    {
      x: viewport.width - insets.right - PANEL_GAP - width,
      y: insets.top + PANEL_GAP,
      width,
      height,
    },
    viewport,
    insets,
  );
}

export function anchorBottomRight(
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
): Rect {
  return clampRectToSafeArea(
    {
      x: viewport.width - insets.right - PANEL_GAP - width,
      y: viewport.height - insets.bottom - PANEL_GAP - height,
      width,
      height,
    },
    viewport,
    insets,
  );
}

export function anchorLeftRail(
  width: number,
  height: number,
  viewport: { width: number; height: number },
  insets: SafeInsets,
  belowY?: number,
): Rect {
  return clampRectToSafeArea(
    {
      x: insets.left + PANEL_GAP,
      y: belowY ?? insets.top + PANEL_GAP + 44,
      width,
      height,
    },
    viewport,
    insets,
  );
}

export interface LayoutSlot {
  id: string;
  preferred: Rect;
  priority: number;
  visible: boolean;
}

/** Place visible slots high-priority first; lower priority yields to blockers. */
export function resolveAll(
  slots: LayoutSlot[],
  viewport: { width: number; height: number },
  insets: SafeInsets,
): Map<string, Rect> {
  const ordered = slots
    .filter((s) => s.visible)
    .slice()
    .sort((a, b) => b.priority - a.priority);
  const placed: { id: string; rect: Rect }[] = [];
  const out = new Map<string, Rect>();
  for (const slot of ordered) {
    const rect = resolveCollisions(
      slot.preferred,
      placed.map((p) => p.rect),
      viewport,
      insets,
    );
    placed.push({ id: slot.id, rect });
    out.set(slot.id, rect);
  }
  return out;
}
