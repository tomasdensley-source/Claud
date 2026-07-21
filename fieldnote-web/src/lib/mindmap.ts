import type { BoardObject, ConnectorObject, MindMapObject } from '../types';
import { uid } from './seed';
import { BRANCH_COLORS, COLORS } from './theme';

const CHILD_GAP_X = 120;
const SIBLING_GAP_Y = 72;
const TIDY_BRANCH_RADIUS = 220;
const TIDY_DEPTH_GAP = 170;
const TIDY_FAN_GAP = 82;

export function getMindChildren(objects: BoardObject[], parentId: string): MindMapObject[] {
  return objects.filter((obj): obj is MindMapObject => obj.type === 'mindmap' && obj.parentId === parentId);
}

export function getMindSubtreeIds(objects: BoardObject[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length) {
    const parentId = queue.shift();
    if (!parentId) continue;

    getMindChildren(objects, parentId).forEach((child) => {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        queue.push(child.id);
      }
    });
  }

  return ids;
}

export function isMindCollapsedHidden(objects: BoardObject[], obj: BoardObject): boolean {
  if (obj.type !== 'mindmap') return false;

  const byId = mindById(objects);
  const seen = new Set<string>();
  let parentId = obj.parentId;

  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return false;
    if (parent.collapsed) return true;
    parentId = parent.parentId;
  }

  return false;
}

export function toggleCollapse(objects: BoardObject[], id: string): BoardObject[] {
  return objects.map((obj) => (obj.type === 'mindmap' && obj.id === id ? { ...obj, collapsed: !obj.collapsed } : obj));
}

export function addMindChild(
  objects: BoardObject[],
  parentId: string,
  text = 'New idea',
): { objects: BoardObject[]; newId: string } {
  const parent = objects.find((obj): obj is MindMapObject => obj.type === 'mindmap' && obj.id === parentId);
  if (!parent) return { objects, newId: '' };

  const siblings = getMindChildren(objects, parentId);
  const newId = uid('mm');
  const branchColor = parent.parentId === null ? BRANCH_COLORS[siblings.length % BRANCH_COLORS.length] : parent.branchColor;
  const node = makeMindNode({
    id: newId,
    parentId,
    text,
    x: parent.x + parent.width + CHILD_GAP_X,
    y: parent.y + siblings.length * SIBLING_GAP_Y,
    branchColor,
    zIndex: nextZIndex(objects),
  });
  const connector = makeMindConnector(parent.id, node.id, branchColor);

  return { objects: [...objects, node, connector], newId };
}

export function addMindSibling(
  objects: BoardObject[],
  id: string,
  text = 'New idea',
): { objects: BoardObject[]; newId: string } {
  const current = objects.find((obj): obj is MindMapObject => obj.type === 'mindmap' && obj.id === id);
  if (!current?.parentId) return { objects, newId: '' };

  const parent = objects.find((obj): obj is MindMapObject => obj.type === 'mindmap' && obj.id === current.parentId);
  if (!parent) return { objects, newId: '' };

  const siblings = getMindChildren(objects, parent.id);
  const newId = uid('mm');
  const branchColor = parent.parentId === null ? BRANCH_COLORS[siblings.length % BRANCH_COLORS.length] : current.branchColor;
  const node = makeMindNode({
    id: newId,
    parentId: parent.id,
    text,
    x: current.x,
    y: Math.max(current.y + current.height + 28, parent.y + siblings.length * SIBLING_GAP_Y),
    branchColor,
    zIndex: nextZIndex(objects),
  });
  const connector = makeMindConnector(parent.id, node.id, branchColor);

  return { objects: [...objects, node, connector], newId };
}

export function tidyMindMap(objects: BoardObject[], rootId: string): BoardObject[] {
  const byId = mindById(objects);
  const root = byId.get(rootId);
  if (!root) return objects;

  const subtreeIds = getMindSubtreeIds(objects, rootId);
  const positions = new Map<string, { x: number; y: number }>();
  const rootCenter = centerOf(root);
  const branches = sortedChildren(objects, root.id);

  branches.forEach((branch, index) => {
    const angle = branches.length === 1 ? 0 : (index / branches.length) * Math.PI * 2 - Math.PI / 2;
    placeNode(branch, rootCenter, angle, 1, index, branches.length, positions);
    placeDescendants(objects, branch.id, rootCenter, angle, 2, positions);
  });

  return objects.map((obj) => {
    if (!subtreeIds.has(obj.id) || obj.type !== 'mindmap') return obj;
    const position = positions.get(obj.id);
    return position ? { ...obj, ...position } : obj;
  });
}

export function moveMindSubtree(objects: BoardObject[], rootId: string, dx: number, dy: number): BoardObject[] {
  const subtreeIds = getMindSubtreeIds(objects, rootId);

  return objects.map((obj) => {
    if (!subtreeIds.has(obj.id) || obj.type !== 'mindmap') return obj;
    return { ...obj, x: obj.x + dx, y: obj.y + dy };
  });
}

export function simplifyMindDepth(objects: BoardObject[], rootId: string, maxDepth: number): BoardObject[] {
  const subtreeIds = getMindSubtreeIds(objects, rootId);
  const rootDepth = mindDepth(objects, rootId);

  return objects.map((obj) => {
    if (obj.type !== 'mindmap' || !subtreeIds.has(obj.id)) return obj;
    return mindDepth(objects, obj.id) - rootDepth > maxDepth ? { ...obj, collapsed: true } : obj;
  });
}

export function mindDepth(objects: BoardObject[], id: string): number {
  const byId = mindById(objects);
  let current = byId.get(id);
  let depth = 0;
  const seen = new Set<string>();

  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }

  return depth;
}

function makeMindNode(input: {
  id: string;
  parentId: string;
  text: string;
  x: number;
  y: number;
  branchColor: string;
  zIndex: number;
}): MindMapObject {
  const width = Math.min(220, Math.max(120, input.text.length * 9 + 40));

  return {
    id: input.id,
    type: 'mindmap',
    x: input.x,
    y: input.y,
    width,
    height: 44,
    zIndex: input.zIndex,
    fill: COLORS.paperStrong,
    text: input.text,
    parentId: input.parentId,
    collapsed: false,
    branchColor: input.branchColor,
  };
}

function makeMindConnector(fromId: string, toId: string, stroke: string): ConnectorObject {
  return {
    id: uid('conn'),
    type: 'connector',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    zIndex: 4,
    fromId,
    toId,
    fromSide: 'right',
    toSide: 'left',
    kind: 'mindmap',
    curved: true,
    stroke,
  };
}

function placeDescendants(
  objects: BoardObject[],
  parentId: string,
  rootCenter: { x: number; y: number },
  angle: number,
  depth: number,
  positions: Map<string, { x: number; y: number }>,
): void {
  const children = sortedChildren(objects, parentId);

  children.forEach((child, index) => {
    placeNode(child, rootCenter, angle, depth, index, children.length, positions);
    placeDescendants(objects, child.id, rootCenter, angle, depth + 1, positions);
  });
}

function placeNode(
  node: MindMapObject,
  rootCenter: { x: number; y: number },
  angle: number,
  depth: number,
  index: number,
  siblingCount: number,
  positions: Map<string, { x: number; y: number }>,
): void {
  const radius = TIDY_BRANCH_RADIUS + (depth - 1) * TIDY_DEPTH_GAP;
  const fan = (index - (siblingCount - 1) / 2) * TIDY_FAN_GAP;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const x = rootCenter.x + ux * radius + px * fan - node.width / 2;
  const y = rootCenter.y + uy * radius + py * fan - node.height / 2;

  positions.set(node.id, { x, y });
}

function sortedChildren(objects: BoardObject[], parentId: string): MindMapObject[] {
  return getMindChildren(objects, parentId).sort((a, b) => a.y - b.y || a.x - b.x);
}

function mindById(objects: BoardObject[]): Map<string, MindMapObject> {
  const byId = new Map<string, MindMapObject>();

  objects.forEach((obj) => {
    if (obj.type === 'mindmap') byId.set(obj.id, obj);
  });

  return byId;
}

function centerOf(obj: MindMapObject): { x: number; y: number } {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}

function nextZIndex(objects: BoardObject[]): number {
  return objects.reduce((max, obj) => Math.max(max, obj.zIndex), 0) + 1;
}
