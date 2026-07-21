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

test('migration sanitizes text formatting task metadata and file sizes', () => {
  const boards = migrateBoards([
    {
      id: 'board',
      name: 42,
      updatedAt: Number.NaN,
      items: [
        { id: 't', type: 'text', text: 'Bad', fontSize: 999, fontWeight: '900', textAlign: 'middle', color: 'url(bad)', x: 0, y: 0, width: 100, height: 60, zIndex: 1 },
        { id: 'task', type: 'task', text: 'Task', done: false, priority: 'urgent', dueDate: 'tomorrow', dependsOn: [], x: 0, y: 80, width: 100, height: 60, zIndex: 2 },
        { id: 'pdf', type: 'pdf', name: 'a.pdf', size: Number.POSITIVE_INFINITY, x: 0, y: 160, width: 100, height: 60, zIndex: 3 },
      ],
    },
  ]);
  assert.equal(boards[0].name, 'Board 1');
  assert.ok(Number.isFinite(boards[0].updatedAt));
  const text = boards[0].items.find((item) => item.id === 't');
  assert.equal(text?.type === 'text' ? text.fontSize : 0, 96);
  assert.equal(text?.type === 'text' ? text.fontWeight : 'bad', undefined);
  assert.equal(text?.type === 'text' ? text.textAlign : 'bad', 'left');
  assert.equal(text?.color, undefined);
  const task = boards[0].items.find((item) => item.id === 'task');
  assert.equal(task?.type === 'task' ? task.priority : 'bad', 'normal');
  assert.equal(task?.type === 'task' ? task.dueDate : 'bad', undefined);
  const pdf = boards[0].items.find((item) => item.id === 'pdf');
  assert.equal(pdf?.type === 'pdf' ? pdf.size : 1, undefined);
});

test('legacy mindmap children use regenerated parent ids', () => {
  const items = normalizeBoardItems([
    { id: 'dup', type: 'mindmap', text: 'Root A', x: 0, y: 0, width: 100, height: 60, zIndex: 1 },
    { id: 'dup', type: 'mindmap', text: 'Root B', children: ['Child'], x: 0, y: 80, width: 100, height: 60, zIndex: 2 },
  ]);
  const rootB = items.find((item) => item.type === 'mindmap' && item.text === 'Root B');
  const child = items.find((item) => item.type === 'mindmap' && item.text === 'Child');
  assert.equal(child?.type === 'mindmap' ? child.parentId : null, rootB?.id);
});
