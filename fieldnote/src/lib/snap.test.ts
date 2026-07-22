import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapPoint, snapToGrid } from './snap';

test('snaps values to the default 20px grid', () => {
  assert.equal(snapToGrid(0), 0);
  assert.equal(snapToGrid(9), 0);
  assert.equal(snapToGrid(10), 20);
  assert.equal(snapToGrid(31), 40);
});

test('snaps points', () => {
  assert.deepEqual(snapPoint({ x: 14, y: 26 }), { x: 20, y: 20 });
});

test('handles non-finite input', () => {
  assert.equal(snapToGrid(Number.NaN), 0);
});
