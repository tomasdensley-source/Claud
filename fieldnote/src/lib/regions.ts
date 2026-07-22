import { Board, BoardItem, RegionItem } from '../types';
import { boardToJsonCanvas, stringifyJsonCanvas } from './jsonCanvas';

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

function centerInside(it: BoardItem, region: RegionItem): boolean {
  const cx = it.x + it.width / 2;
  const cy = it.y + it.height / 2;
  return (
    cx >= region.x &&
    cx <= region.x + region.width &&
    cy >= region.y &&
    cy <= region.y + region.height
  );
}

/** Region plus contained objects (by parentId or center) and connectors between them. */
export function itemsForRegion(items: BoardItem[], regionId: string): BoardItem[] {
  const region = items.find((it) => it.id === regionId && it.type === 'region');
  if (!region || region.type !== 'region') return [];

  const contained = items.filter((it) => {
    if (it.id === regionId) return true;
    if (it.type === 'connector') return false;
    if (it.parentId === regionId) return true;
    return centerInside(it, region);
  });
  const ids = new Set(contained.map((it) => it.id));
  const connectors = items.filter(
    (it) => it.type === 'connector' && ids.has(it.fromId) && ids.has(it.toId),
  );
  return [...contained, ...connectors];
}

export function regionToMarkdown(items: BoardItem[], regionId: string): string {
  const subset = itemsForRegion(items, regionId);
  const region = subset.find((it) => it.id === regionId && it.type === 'region');
  const title = region && region.type === 'region' ? region.label : 'Region';
  const lines = [`# ${title}`, ''];
  for (const it of subset) {
    if (it.type === 'text' || it.type === 'mindmap') {
      lines.push(`- ${it.text || 'Untitled'}`);
    } else if (it.type === 'task') {
      lines.push(`- [${it.done ? 'x' : ' '}] ${it.text || 'Task'}`);
    } else if (it.type === 'file' || it.type === 'folder') {
      lines.push(`- ${it.type === 'folder' ? '📁' : '📄'} ${it.name}`);
    } else if (it.type === 'image') {
      lines.push(`- Image: ${it.alt || it.uri || 'photo'}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function regionToJsonCanvas(
  board: Board,
  regionId: string,
): string {
  const items = itemsForRegion(board.items, regionId);
  const subset: Board = {
    ...board,
    id: `${board.id}-${regionId}`,
    name: `${board.name} · region`,
    items,
    updatedAt: Date.now(),
  };
  return stringifyJsonCanvas(boardToJsonCanvas(subset));
}
