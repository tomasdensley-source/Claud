import assert from 'node:assert/strict';
import test from 'node:test';
import { createMainBoard, createSeedItems, uid } from './seed';

test('seed board includes demo content', () => {
  const items = createSeedItems();
  assert.equal(items.length, 5);
  assert.ok(items.some((i) => i.type === 'text' && i.id === 'hero-title'));
  assert.ok(items.some((i) => i.type === 'image' && i.assetKey === 'pottery'));
  assert.ok(items.some((i) => i.type === 'image' && i.assetKey === 'wildflower'));
});

test('main board defaults', () => {
  const board = createMainBoard();
  assert.equal(board.id, 'main');
  assert.equal(board.name, 'Main board');
  assert.ok(board.items.length > 0);
});

test('uid is unique-ish', () => {
  const a = uid('x');
  const b = uid('x');
  assert.notEqual(a, b);
  assert.match(a, /^x-/);
});
