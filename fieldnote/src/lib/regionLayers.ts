import { BoardItem, RegionItem } from '../types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function area(r: Rect): number {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

// How many other regions fully contain this one — 0 for a top-level region,
// 1 for one nested a level in, and so on. Purely geometric (bounding-box
// containment + area), so no parentId or stored hierarchy is needed and no
// existing board needs migrating.
export function computeRegionDepth(region: RegionItem, allRegions: RegionItem[]): number {
  return allRegions.filter(
    (other) => other.id !== region.id && area(other) > area(region) && contains(other, region),
  ).length;
}

// Render order: every region first (largest area first, so a smaller nested
// region paints on top of the larger one it sits inside), then every other
// item type in its existing zIndex order. Previously regions were
// interleaved with everything else purely by creation-order zIndex, so two
// regions didn't reliably layer as distinct nested background sections
// (bug #14) — a region drawn later could end up on top regardless of size.
export function sortItemsForRender(items: BoardItem[]): BoardItem[] {
  const regions: RegionItem[] = [];
  const rest: BoardItem[] = [];
  items.forEach((it) => (it.type === 'region' ? regions.push(it) : rest.push(it)));
  const sortedRegions = [...regions].sort((a, b) => area(b) - area(a));
  const sortedRest = [...rest].sort((a, b) => a.zIndex - b.zIndex);
  return [...sortedRegions, ...sortedRest];
}
