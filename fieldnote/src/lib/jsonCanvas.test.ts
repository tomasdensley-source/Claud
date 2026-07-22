import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boardToJsonCanvas,
  jsonCanvasToItems,
  parseJsonCanvas,
  repairAiJson,
  stringifyJsonCanvas,
} from './jsonCanvas';
import { canCompleteTask, syncConnectorGlow } from './taskGraph';
import { BoardItem } from '../types';

test('json canvas round-trip keeps text and edges', () => {
  const items: BoardItem[] = [
    {
      id: 'a',
      type: 'text',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      zIndex: 1,
      text: 'Hello',
      fontSize: 18,
    },
    {
      id: 'b',
      type: 'task',
      x: 200,
      y: 20,
      width: 120,
      height: 80,
      zIndex: 2,
      text: 'Do it',
      done: false,
      dependsOn: ['a'],
    },
    {
      id: 'e1',
      type: 'connector',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zIndex: 3,
      fromId: 'a',
      toId: 'b',
      thickness: 2,
    },
  ];
  const doc = boardToJsonCanvas({
    id: 'main',
    name: 'Main',
    items,
    updatedAt: 1,
  });
  const raw = stringifyJsonCanvas(doc);
  const parsed = parseJsonCanvas(raw);
  const back = jsonCanvasToItems(parsed);
  assert.ok(back.some((it) => it.type === 'text'));
  assert.ok(back.some((it) => it.type === 'connector'));
  const task = back.find((it) => it.type === 'task');
  assert.ok(task && task.type === 'task');
  assert.deepEqual(task.dependsOn, ['a']);
});

test('fieldnote metadata round-trips drawing shape mindmap', () => {
  const items: BoardItem[] = [
    {
      id: 'd1',
      type: 'drawing',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      zIndex: 1,
      paths: [{ color: '#111', width: 3, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
    },
    {
      id: 's1',
      type: 'shape',
      x: 10,
      y: 10,
      width: 80,
      height: 60,
      zIndex: 2,
      shape: 'ellipse',
    },
    {
      id: 'm1',
      type: 'mindmap',
      x: 40,
      y: 40,
      width: 120,
      height: 64,
      zIndex: 3,
      text: 'Root',
      children: ['m2'],
      collapsed: true,
    },
  ];
  const doc = boardToJsonCanvas({ id: 'b', name: 'B', items, updatedAt: 1 });
  assert.equal(doc.nodes?.length, 3);
  assert.ok(doc.nodes?.every((n) => n.metadata?.fieldnote));
  const back = jsonCanvasToItems(doc);
  assert.ok(back.some((it) => it.type === 'drawing'));
  assert.ok(back.some((it) => it.type === 'shape' && it.shape === 'ellipse'));
  const mm = back.find((it) => it.type === 'mindmap');
  assert.ok(mm && mm.type === 'mindmap');
  assert.deepEqual(mm.children, ['m2']);
  assert.equal(mm.collapsed, true);
});

test('repairAiJson extracts object from prose', () => {
  const raw = 'Sure!\n{"nodes":[],"edges":[]}\nThanks';
  const fixed = repairAiJson(raw);
  assert.equal(fixed.startsWith('{'), true);
  parseJsonCanvas(fixed);
});

test('water-flow blocks dependent until source done', () => {
  const items: BoardItem[] = [
    {
      id: 'root',
      type: 'task',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      zIndex: 1,
      text: 'Root',
      done: false,
      dependsOn: [],
    },
    {
      id: 'child',
      type: 'task',
      x: 0,
      y: 100,
      width: 100,
      height: 60,
      zIndex: 2,
      text: 'Child',
      done: false,
      dependsOn: ['root'],
    },
    {
      id: 'edge',
      type: 'connector',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zIndex: 3,
      fromId: 'root',
      toId: 'child',
      glowing: false,
    },
  ];
  const child = items[1];
  assert.equal(child.type === 'task' && canCompleteTask(child, items), false);
  const doneRoot = items.map((it) =>
    it.id === 'root' && it.type === 'task' ? { ...it, done: true } : it,
  );
  assert.equal(doneRoot[1].type === 'task' && canCompleteTask(doneRoot[1], doneRoot), true);
  const synced = syncConnectorGlow(doneRoot);
  const edge = synced.find((it) => it.id === 'edge');
  assert.equal(edge && edge.type === 'connector' && edge.glowing, true);
});
