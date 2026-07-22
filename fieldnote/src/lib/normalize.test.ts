import assert from 'node:assert/strict';
import test from 'node:test';
import { repairBoardItems } from './normalize';
import { BoardItem, TextItem } from '../types';

function textItem(overrides: Partial<TextItem>): TextItem {
  return {
    id: 'a',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 1,
    text: 'hello',
    fontSize: 20,
    ...overrides,
  };
}

test('leaves a healthy board untouched', () => {
  const items: BoardItem[] = [textItem({ id: 'a', x: 0, y: 0 }), textItem({ id: 'b', x: 400, y: 0 })];
  const result = repairBoardItems(items);
  assert.equal(result.changed, false);
  assert.deepEqual(result.items, items);
});

test('fixes missing or non-finite coordinates and sizes', () => {
  const broken = textItem({
    id: 'a',
    x: Number.NaN,
    y: undefined as unknown as number,
    width: -10,
    height: 0,
  });
  const result = repairBoardItems([broken]);
  assert.equal(result.changed, true);
  const [fixed] = result.items;
  assert.equal(Number.isFinite(fixed.x), true);
  assert.equal(Number.isFinite(fixed.y), true);
  assert.ok(fixed.width > 0);
  assert.ok(fixed.height > 0);
  assert.ok(result.issues.length > 0);
});

test('rescales an absurdly large AI-generated layout', () => {
  const items: BoardItem[] = [
    textItem({ id: 'a', x: 0, y: 0 }),
    textItem({ id: 'b', x: 5_000_000, y: 5_000_000 }),
  ];
  const result = repairBoardItems(items);
  assert.equal(result.changed, true);
  const xs = result.items.map((it) => it.x);
  const ys = result.items.map((it) => it.y);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= 2000);
  assert.ok(Math.max(...ys) - Math.min(...ys) <= 2000);
});

test('spreads cards stacked exactly on top of each other', () => {
  const items: BoardItem[] = [
    textItem({ id: 'a', x: 100, y: 100 }),
    textItem({ id: 'b', x: 100, y: 100 }),
    textItem({ id: 'c', x: 100, y: 100 }),
  ];
  const result = repairBoardItems(items);
  assert.equal(result.changed, true);
  const positions = result.items.map((it) => `${it.x}:${it.y}`);
  assert.equal(new Set(positions).size, 3);
});
