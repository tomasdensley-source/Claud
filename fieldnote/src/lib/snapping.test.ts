import assert from 'node:assert/strict';
import test from 'node:test';
import { computeSnapDelta, Rect } from './snapping';

const other: Rect = { x: 200, y: 200, width: 100, height: 100 };

test('returns no snap when nothing is within threshold', () => {
  const moving: Rect = { x: 0, y: 0, width: 50, height: 50 };
  const result = computeSnapDelta(moving, [other]);
  assert.deepEqual(result, { dx: 0, dy: 0 });
});

test('snaps a left edge to a nearby left edge', () => {
  const moving: Rect = { x: 203, y: 500, width: 50, height: 50 };
  const result = computeSnapDelta(moving, [other]);
  assert.equal(result.dx, -3);
});

test('snaps a center to a nearby center', () => {
  // other center x = 250. moving center x = moving.x + 25.
  const moving: Rect = { x: 223, y: 500, width: 50, height: 50 };
  const result = computeSnapDelta(moving, [other]);
  assert.equal(result.dx, 2); // 250 - (223+25) = 2
});

test('picks the closest candidate among several', () => {
  const near: Rect = { x: 100, y: 0, width: 20, height: 20 };
  const far: Rect = { x: 500, y: 0, width: 20, height: 20 };
  const moving: Rect = { x: 104, y: 0, width: 20, height: 20 };
  const result = computeSnapDelta(moving, [near, far]);
  assert.equal(result.dx, -4);
});

test('axes are independent', () => {
  const moving: Rect = { x: 202, y: 900, width: 50, height: 50 };
  const result = computeSnapDelta(moving, [other]);
  assert.equal(result.dx, -2);
  assert.equal(result.dy, 0);
});

test('respects a custom threshold', () => {
  const moving: Rect = { x: 210, y: 500, width: 50, height: 50 };
  assert.deepEqual(computeSnapDelta(moving, [other], 5), { dx: 0, dy: 0 });
  assert.equal(computeSnapDelta(moving, [other], 15).dx, -10);
});
