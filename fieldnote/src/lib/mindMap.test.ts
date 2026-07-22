import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMindMapTree, visibleMindMapIds } from './mindMap';
import { BoardItem } from '../types';

test('createMindMapTree wires real child ids', () => {
  let n = 0;
  const tree = createMindMapTree({ x: 10, y: 20 }, undefined, () => `id-${n++}`);
  assert.equal(tree.length, 3);
  assert.deepEqual(tree[0].children, ['id-1', 'id-2']);
  assert.ok(tree.every((t) => t.type === 'mindmap'));
});

test('collapsed root hides children at depth all', () => {
  const items: BoardItem[] = [
    {
      id: 'r',
      type: 'mindmap',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      zIndex: 1,
      text: 'R',
      children: ['c'],
      collapsed: true,
    },
    {
      id: 'c',
      type: 'mindmap',
      x: 0,
      y: 50,
      width: 100,
      height: 40,
      zIndex: 1,
      text: 'C',
      children: [],
    },
  ];
  const vis = visibleMindMapIds(items, 'all');
  assert.ok(vis.has('r'));
  assert.ok(!vis.has('c'));
});
