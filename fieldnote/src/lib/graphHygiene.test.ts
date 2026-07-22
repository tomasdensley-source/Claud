import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ensureUniqueIds,
  expandMindMapSelection,
  pruneDeletedIds,
  remapIds,
} from './graphHygiene';
import { BoardItem } from '../types';

const base = (partial: Partial<BoardItem> & Pick<BoardItem, 'id' | 'type'>): BoardItem =>
  ({
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    zIndex: 1,
    ...partial,
  }) as BoardItem;

test('pruneDeletedIds drops connectors and scrubs dependsOn/children', () => {
  const items: BoardItem[] = [
    base({ id: 't1', type: 'task', text: 'A', done: true, dependsOn: [] }),
    base({ id: 't2', type: 'task', text: 'B', done: false, dependsOn: ['t1', 'gone'] }),
    base({
      id: 'c1',
      type: 'connector',
      fromId: 't1',
      toId: 't2',
      width: 1,
      height: 1,
    }),
    base({
      id: 'm1',
      type: 'mindmap',
      text: 'R',
      children: ['m2', 'gone'],
    }),
    base({ id: 'm2', type: 'mindmap', text: 'C', children: [] }),
  ];
  const next = pruneDeletedIds(items, new Set(['t1']));
  assert.equal(next.find((i) => i.id === 't1'), undefined);
  assert.equal(next.find((i) => i.id === 'c1'), undefined);
  const t2 = next.find((i) => i.id === 't2');
  assert.ok(t2 && t2.type === 'task');
  assert.deepEqual(t2.dependsOn, ['gone']);
});

test('ensureUniqueIds remaps collisions', () => {
  const incoming: BoardItem[] = [
    base({ id: 'a', type: 'text', text: 'x', fontSize: 16, role: 'body' }),
  ];
  const { items, idMap } = ensureUniqueIds(incoming, new Set(['a']));
  assert.ok(idMap.has('a'));
  assert.notEqual(items[0].id, 'a');
});

test('remapIds rewrites connector endpoints', () => {
  const items: BoardItem[] = [
    base({
      id: 'c1',
      type: 'connector',
      fromId: 'a',
      toId: 'b',
      width: 1,
      height: 1,
    }),
  ];
  const mapped = remapIds(items, new Map([['a', 'a2'], ['b', 'b2'], ['c1', 'c2']]));
  assert.equal(mapped[0].id, 'c2');
  assert.ok(mapped[0].type === 'connector');
  if (mapped[0].type === 'connector') {
    assert.equal(mapped[0].fromId, 'a2');
    assert.equal(mapped[0].toId, 'b2');
  }
});

test('expandMindMapSelection includes descendants', () => {
  const items: BoardItem[] = [
    base({ id: 'r', type: 'mindmap', text: 'R', children: ['c'] }),
    base({ id: 'c', type: 'mindmap', text: 'C', children: [] }),
  ];
  assert.deepEqual(expandMindMapSelection(items, ['r']).sort(), ['c', 'r']);
});
