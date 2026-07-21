import type { BoardObject, BoardSnapshot, Camera } from '../types';
import { BRANCH_COLORS, COLORS } from './theme';

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function createSeedObjects(): BoardObject[] {
  return [
    {
      id: 'hero',
      type: 'text',
      x: 80,
      y: 90,
      width: 720,
      height: 150,
      zIndex: 2,
      fill: COLORS.paper,
      text: 'A place for unfinished ideas.\n\nCollect the pieces. Move them until they make sense.',
      fontSize: 36,
      fontWeight: 500,
      color: COLORS.ink,
      align: 'left',
    },
    {
      id: 'human',
      type: 'text',
      x: 520,
      y: 300,
      width: 340,
      height: 180,
      zIndex: 2,
      fill: COLORS.clay,
      text: 'Keep it human.\nKeep it useful.',
      fontSize: 34,
      fontWeight: 400,
      color: COLORS.ink,
    },
    {
      id: 'palette',
      type: 'text',
      x: 700,
      y: 560,
      width: 300,
      height: 140,
      zIndex: 2,
      fill: COLORS.paper,
      text: 'Palette\n\nwarm · useful · unforced',
      fontSize: 22,
      fontWeight: 400,
      color: COLORS.ink,
    },
    {
      id: 'region-1',
      type: 'region',
      x: 40,
      y: 250,
      width: 440,
      height: 360,
      zIndex: 0,
      fill: 'rgba(233,178,127,0.18)',
      label: 'Studio',
      pattern: 'solid',
      opacity: 1,
    },
  ];
}

export function createMainBoard(): BoardSnapshot {
  return {
    id: 'main',
    name: 'Main board',
    updatedAt: Date.now(),
    camera: { x: 40, y: 40, scale: 0.85 },
    objects: createSeedObjects(),
  };
}

export function defaultCamera(): Camera {
  return { x: 0, y: 0, scale: 1 };
}

/** Scientific method mind-map template (19 nodes) — Add → Scientific method */
export function scientificMethodMindMap(origin: { x: number; y: number }): BoardObject[] {
  const rootId = uid('mm');
  const nodes: { id: string; text: string; parent: string | null; dx: number; dy: number; color: string }[] = [
    { id: rootId, text: 'Scientific method', parent: null, dx: 0, dy: 0, color: COLORS.clay },
  ];

  const branches = [
    { text: 'Ask a question', kids: ['Observe', 'Wonder'] },
    { text: 'Background research', kids: ['Read sources', 'Note gaps'] },
    { text: 'Hypothesis', kids: ['Predict'] },
    { text: 'Experiment', kids: ['Controls', 'Variables', 'Procedure'] },
    { text: 'Analyze data', kids: ['Charts', 'Errors'] },
    { text: 'Conclude', kids: ['Support / reject', 'Next questions'] },
  ];

  branches.forEach((b, i) => {
    const bid = uid('mm');
    const angle = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
    const r = 220;
    nodes.push({
      id: bid,
      text: b.text,
      parent: rootId,
      dx: Math.cos(angle) * r,
      dy: Math.sin(angle) * r,
      color: BRANCH_COLORS[i % BRANCH_COLORS.length],
    });
    b.kids.forEach((k, j) => {
      const kid = uid('mm');
      nodes.push({
        id: kid,
        text: k,
        parent: bid,
        dx: Math.cos(angle) * (r + 140) + (j - 1) * 28,
        dy: Math.sin(angle) * (r + 140) + (j - 1) * 36,
        color: BRANCH_COLORS[i % BRANCH_COLORS.length],
      });
    });
  });

  const objects: BoardObject[] = [];
  const connectors: BoardObject[] = [];

  nodes.forEach((n, i) => {
    const w = Math.min(220, Math.max(120, n.text.length * 9 + 40));
    const h = n.parent ? 44 : 56;
    objects.push({
      id: n.id,
      type: 'mindmap',
      x: origin.x + n.dx - w / 2,
      y: origin.y + n.dy - h / 2,
      width: w,
      height: h,
      zIndex: 5 + i,
      fill: n.parent ? COLORS.paperStrong : n.color,
      text: n.text,
      parentId: n.parent,
      branchColor: n.color,
      collapsed: false,
    });
    if (n.parent) {
      connectors.push({
        id: uid('conn'),
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: 4,
        fromId: n.parent,
        toId: n.id,
        fromSide: 'right',
        toSide: 'left',
        kind: 'mindmap',
        curved: true,
        stroke: n.color,
      });
    }
  });

  return [...objects, ...connectors];
}

export function boundsOf(objects: BoardObject[]) {
  const items = objects.filter((o) => o.type !== 'connector');
  if (!items.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 700 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const o of items) {
    minX = Math.min(minX, o.x);
    minY = Math.min(minY, o.y);
    maxX = Math.max(maxX, o.x + o.width);
    maxY = Math.max(maxY, o.y + o.height);
  }
  return { minX, minY, maxX, maxY };
}

export function sidePoint(
  o: { x: number; y: number; width: number; height: number },
  side: 'top' | 'right' | 'bottom' | 'left',
) {
  switch (side) {
    case 'top':
      return { x: o.x + o.width / 2, y: o.y };
    case 'right':
      return { x: o.x + o.width, y: o.y + o.height / 2 };
    case 'bottom':
      return { x: o.x + o.width / 2, y: o.y + o.height };
    case 'left':
      return { x: o.x, y: o.y + o.height / 2 };
  }
}
