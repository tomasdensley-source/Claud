import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateBoards, normalizeBoardItems } from './migration';

test('legacy mindmap children migrate to parent-linked nodes', () => {
  const items = normalizeBoardItems([
    {
      id: 'root',
      type: 'mindmap',
      x: 100,
      y: 100,
      width: 220,
      height: 90,
      zIndex: 1,
      text: 'Root',
      children: ['Branch A', 'Branch B'],
    },
  ]);
  const root = items.find((item) => item.id === 'root');
  assert.equal(root?.type, 'mindmap');
  assert.equal(root?.type === 'mindmap' ? root.parentId : 'missing', null);
  const migratedChildren = items.filter((item) => item.type === 'mindmap' && item.parentId === 'root');
  assert.equal(migratedChildren.length, 2);
  assert.deepEqual(migratedChildren.map((item) => item.type === 'mindmap' ? item.text : ''), ['Branch A', 'Branch B']);
});

test('task states are derived from dependencies during migration', () => {
  const boards = migrateBoards([
    {
      id: 'board',
      name: 'Board',
      updatedAt: 1,
      items: [
        { id: 'a', type: 'task', text: 'A', done: true, dependsOn: [], x: 0, y: 0, width: 100, height: 60, zIndex: 1 },
        { id: 'b', type: 'task', text: 'B', done: false, dependsOn: ['a'], x: 0, y: 80, width: 100, height: 60, zIndex: 2 },
        { id: 'c', type: 'task', text: 'C', done: false, dependsOn: ['b'], x: 0, y: 160, width: 100, height: 60, zIndex: 3 },
      ],
    },
  ]);
  const ready = boards[0].items.find((item) => item.id === 'b');
  const blocked = boards[0].items.find((item) => item.id === 'c');
  assert.equal(ready?.type === 'task' ? ready.state : 'missing', 'ready');
  assert.equal(blocked?.type === 'task' ? blocked.state : 'missing', 'blocked');
});
