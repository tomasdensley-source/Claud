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

test('migration repairs duplicate ids and broken graph references', () => {
  const boards = migrateBoards([
    {
      id: 'board',
      name: 'Repair',
      items: [
        { id: 'dup', type: 'task', text: 'A', done: false, dependsOn: ['missing', 'dup'], x: 0, y: 0, width: 100, height: 60, zIndex: 1 },
        { id: 'dup', type: 'task', text: 'B', done: false, dependsOn: ['dup'], x: 0, y: 80, width: 100, height: 60, zIndex: 2 },
        { id: 'child', type: 'mindmap', text: 'Child', parentId: 'missing', x: 0, y: 160, width: 100, height: 60, zIndex: 3 },
      ],
    },
  ]);
  const ids = boards[0].items.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const firstTask = boards[0].items.find((item) => item.type === 'task' && item.text === 'A');
  assert.deepEqual(firstTask?.type === 'task' ? firstTask.dependsOn : ['missing'], []);
  const child = boards[0].items.find((item) => item.id === 'child');
  assert.equal(child?.type === 'mindmap' ? child.parentId : 'missing', null);
});

test('migration clamps opacity and sanitizes drawing points', () => {
  const items = normalizeBoardItems([
    {
      id: 'region',
      type: 'region',
      opacity: 3,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      zIndex: 1,
    },
    {
      id: 'draw',
      type: 'drawing',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      zIndex: 2,
      paths: [{ width: 999, points: [{ x: 1, y: 2 }, { x: Number.NaN, y: 3 }, { x: 4, y: 5 }] }],
    },
  ]);
  const region = items.find((item) => item.id === 'region');
  assert.equal(region?.opacity, 1);
  const drawing = items.find((item) => item.id === 'draw');
  assert.equal(drawing?.type === 'drawing' ? drawing.paths[0].points.length : 0, 2);
  assert.equal(drawing?.type === 'drawing' ? drawing.paths[0].width : 0, 80);
});
