import { describe, expect, it } from 'vitest';
import {
  addMindChild,
  getMindSubtreeIds,
  isMindCollapsedHidden,
  moveMindSubtree,
  simplifyMindDepth,
  tidyMindMap,
  toggleCollapse,
} from './mindmap';
import { scientificMethodMindMap } from './seed';
import type { BoardObject, MindMapObject } from '../types';

describe('scientificMethodMindMap', () => {
  it('creates exactly 19 mind-map nodes', () => {
    const objects = scientificMethodMindMap({ x: 0, y: 0 });
    const nodes = objects.filter((o) => o.type === 'mindmap');
    const connectors = objects.filter((o) => o.type === 'connector');
    expect(nodes).toHaveLength(19);
    expect(connectors).toHaveLength(18);
  });
});

describe('mindmap helpers', () => {
  const base = (): BoardObject[] => {
    const root: MindMapObject = {
      id: 'root',
      type: 'mindmap',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      zIndex: 1,
      text: 'Root',
      parentId: null,
      branchColor: '#E9B27F',
      collapsed: false,
    };
    return [root];
  };

  it('adds a child and connector', () => {
    const { objects, newId } = addMindChild(base(), 'root', 'Child');
    expect(newId).toBeTruthy();
    expect(objects.filter((o) => o.type === 'mindmap')).toHaveLength(2);
    expect(objects.some((o) => o.type === 'connector' && o.toId === newId)).toBe(true);
  });

  it('hides descendants when collapsed', () => {
    let objects = base();
    const child = addMindChild(objects, 'root', 'Child');
    objects = child.objects;
    const grand = addMindChild(objects, child.newId, 'Grand');
    objects = grand.objects;
    objects = toggleCollapse(objects, 'root');
    const grandNode = objects.find((o) => o.id === grand.newId)!;
    expect(isMindCollapsedHidden(objects, grandNode)).toBe(true);
  });

  it('moves an entire subtree', () => {
    let objects = base();
    const child = addMindChild(objects, 'root', 'Child');
    objects = child.objects;
    const before = objects.find((o) => o.id === child.newId)!;
    objects = moveMindSubtree(objects, 'root', 40, 20);
    const after = objects.find((o) => o.id === child.newId)!;
    expect(after.x).toBe(before.x + 40);
    expect(after.y).toBe(before.y + 20);
  });

  it('tidies and simplifies depth', () => {
    let objects = scientificMethodMindMap({ x: 100, y: 100 });
    const root = objects.find((o) => o.type === 'mindmap' && o.parentId === null)!;
    objects = tidyMindMap(objects, root.id);
    objects = simplifyMindDepth(objects, root.id, 1);
    const depth2 = objects.filter(
      (o): o is MindMapObject => o.type === 'mindmap' && o.parentId !== null && o.parentId !== root.id,
    );
    expect(depth2.every((o) => o.collapsed === true || isMindCollapsedHidden(objects, o))).toBe(true);
    expect(getMindSubtreeIds(objects, root.id).size).toBe(19);
  });
});
