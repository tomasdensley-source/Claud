import { BoardItem, RegionItem } from '../types';

export function isRegion(item: BoardItem): item is RegionItem {
  return item.type === 'region';
}

/** Assign parentId for items whose center lies inside a region (deepest/smallest wins). */
export function assignRegionParents(items: BoardItem[]): BoardItem[] {
  const regions = items
    .filter(isRegion)
    .slice()
    .sort((a, b) => a.width * a.height - b.width * b.height);

  return items.map((it) => {
    if (it.type === 'region' || it.type === 'connector') return it;
    const cx = it.x + it.width / 2;
    const cy = it.y + it.height / 2;
    const parent = regions.find(
      (r) => r.id !== it.id && cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height,
    );
    const parentId = parent?.id ?? null;
    return it.parentId === parentId ? it : { ...it, parentId };
  });
}

/** When zoomed into a region, treat it as the active background frame. */
export function regionAtPoint(
  items: BoardItem[],
  worldX: number,
  worldY: number,
): RegionItem | null {
  const hits = items
    .filter(isRegion)
    .filter(
      (r) =>
        worldX >= r.x &&
        worldX <= r.x + r.width &&
        worldY >= r.y &&
        worldY <= r.y + r.height,
    )
    .sort((a, b) => a.width * a.height - b.width * b.height);
  return hits[0] ?? null;
}
