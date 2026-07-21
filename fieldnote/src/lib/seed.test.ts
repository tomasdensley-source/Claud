import assert from 'node:assert/strict';
import test from 'node:test';
import { createMainBoard, createScientificMethodItems, createSeedItems, uid } from './seed';

test('seed board includes demo content', () => {
  const items = createSeedItems();
  assert.ok(items.length >= 11);
  assert.ok(items.some((i) => i.type === 'text' && i.id === 'hero-title'));
  assert.ok(items.some((i) => i.type === 'image' && i.assetKey === 'pottery'));
  assert.ok(items.some((i) => i.type === 'image' && i.assetKey === 'wildflower'));
  assert.ok(items.some((i) => i.type === 'task' && i.dependsOn.length > 0));
  assert.ok(items.some((i) => i.type === 'mindmap' && i.parentId));
  assert.ok(items.some((i) => i.type === 'pdf'));
  assert.ok(items.some((i) => i.type === 'audio'));
  assert.ok(items.some((i) => i.type === 'markdown' && i.text?.includes('## Observation')));
  assert.ok(items.some((i) => i.type === 'file' && i.name.includes('Working file')));
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

test('scientific template has exactly 19 mindmap nodes', () => {
  const items = createScientificMethodItems(0, 0);
  assert.equal(items.filter((item) => item.type === 'mindmap').length, 19);
});
