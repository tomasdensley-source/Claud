import { BoardItem } from '../types';

export type Rect = { x: number; y: number; width: number; height: number };

export function centerRect(center: { x: number; y: number }, size: { width: number; height: number }): Rect {
  return {
    x: center.x - size.width / 2,
    y: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

export function staggerCenter(center: { x: number; y: number }, size: { width: number; height: number }, index: number, gap = 24): Rect {
  const base = centerRect(center, size);
  return { ...base, x: base.x + index * gap, y: base.y + index * gap };
}

export function placeMindChild(parent: BoardItem, siblings: BoardItem[]) {
  const branchIndex = siblings.length;
  const spread = Math.max(96, parent.height + 26);
  return {
    x: parent.x + Math.max(300, parent.width + 80),
    y: parent.y + (branchIndex - Math.max(0, siblings.length - 1) / 2) * spread,
  };
}

export function tidyMindmapTree(items: BoardItem[], rootId: string): BoardItem[] {
  const byParent = new Map<string | null, BoardItem[]>();
  items.forEach((item) => {
    if (item.type !== 'mindmap') return;
    const list = byParent.get(item.parentId) ?? [];
    list.push(item);
    byParent.set(item.parentId, list);
  });
  const root = items.find((item) => item.id === rootId && item.type === 'mindmap');
  if (!root) return items;
  const positions = new Map<string, { x: number; y: number }>();
  const walk = (parent: BoardItem, depth: number) => {
    const children = byParent.get(parent.id) ?? [];
    children.forEach((child, index) => {
      const y = parent.y + (index - (children.length - 1) / 2) * Math.max(96, child.height + 28);
      positions.set(child.id, { x: root.x + depth * 320, y });
      walk({ ...child, x: root.x + depth * 320, y }, depth + 1);
    });
  };
  walk(root, 1);
  return items.map((item) => {
    const pos = positions.get(item.id);
    return pos && !item.locked ? { ...item, ...pos } : item;
  });
}

export function clampInertiaVelocity(velocity: number, zoom: number) {
  const max = 2400 * Math.max(0.25, Math.min(1, zoom));
  return Math.max(-max, Math.min(max, velocity));
}
