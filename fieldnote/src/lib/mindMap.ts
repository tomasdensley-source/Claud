import { BoardItem, MindMapItem } from '../types';

export function isMindMap(item: BoardItem): item is MindMapItem {
  return item.type === 'mindmap';
}

export function visibleMindMapIds(
  items: BoardItem[],
  depth: number | 'all',
): Set<string> {
  const maps = items.filter(isMindMap);
  const byId = new Map(maps.map((m) => [m.id, m]));
  const roots = maps.filter(
    (m) => !maps.some((other) => other.children.includes(m.id)),
  );

  const visible = new Set<string>();
  const walk = (id: string, level: number) => {
    const node = byId.get(id);
    if (!node) return;
    if (depth !== 'all' && level > depth) return;
    visible.add(id);
    if (node.collapsed) return;
    node.children.forEach((childId) => walk(childId, level + 1));
  };
  roots.forEach((r) => walk(r.id, 1));
  // Do NOT re-add collapsed/hidden children when depth === 'all'.
  // Roots with no parent links are already walked above.
  return visible;
}

export function toggleCollapsed(items: BoardItem[], id: string): BoardItem[] {
  return items.map((it) =>
    it.id === id && it.type === 'mindmap' ? { ...it, collapsed: !it.collapsed } : it,
  );
}

/** Simple tidy: stack children under parent with even spacing. */
export function tidyMindMap(items: BoardItem[], rootId: string): BoardItem[] {
  const maps = items.filter(isMindMap);
  const root = maps.find((m) => m.id === rootId);
  if (!root) return items;

  const byId = new Map(maps.map((m) => [m.id, m]));
  const nextPos = new Map<string, { x: number; y: number }>();
  nextPos.set(root.id, { x: root.x, y: root.y });

  const layout = (id: string, depth: number) => {
    const node = byId.get(id);
    if (!node || node.collapsed) return;
    const kids = node.children.filter((c) => byId.has(c));
    if (kids.length === 0) return;
    const gapX = 220;
    const gapY = 120;
    const totalW = (kids.length - 1) * gapX;
    const startX = (nextPos.get(id)?.x ?? node.x) - totalW / 2;
    const parentY = nextPos.get(id)?.y ?? node.y;
    kids.forEach((childId, i) => {
      nextPos.set(childId, {
        x: startX + i * gapX,
        y: parentY + gapY,
      });
      layout(childId, depth + 1);
    });
  };
  layout(root.id, 0);

  return items.map((it) => {
    const pos = nextPos.get(it.id);
    if (!pos || it.type !== 'mindmap') return it;
    return { ...it, x: pos.x, y: pos.y };
  });
}

export function descendantCount(item: MindMapItem, items: BoardItem[]): number {
  const byId = new Map(items.filter(isMindMap).map((m) => [m.id, m]));
  let count = 0;
  const walk = (id: string) => {
    const n = byId.get(id);
    if (!n) return;
    n.children.forEach((c) => {
      if (byId.has(c)) {
        count += 1;
        walk(c);
      }
    });
  };
  walk(item.id);
  return count;
}

/** Create a root + real child mind-map nodes (never fake label ids). */
export function createMindMapTree(
  anchor: { x: number; y: number },
  labels?: { root?: string; branches?: string[] },
  makeId: (prefix: string) => string = (p) =>
    `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
): MindMapItem[] {
  const branches = labels?.branches ?? ['Branch', 'Branch'];
  const rootId = makeId('mindmap');
  const childIds = branches.map(() => makeId('mindmap'));
  const root: MindMapItem = {
    id: rootId,
    type: 'mindmap',
    x: anchor.x,
    y: anchor.y,
    width: 200,
    height: 72,
    zIndex: 1,
    backgroundColor: '#faf6ee',
    text: labels?.root ?? 'Idea',
    children: childIds,
  };
  const kids: MindMapItem[] = childIds.map((id, i) => ({
    id,
    type: 'mindmap',
    x: anchor.x + (i - (childIds.length - 1) / 2) * 160,
    y: anchor.y + 110,
    width: 160,
    height: 64,
    zIndex: 1,
    backgroundColor: '#faf6ee',
    text: branches[i] ?? 'Branch',
    children: [],
  }));
  return [root, ...kids];
}
