import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeAlignmentGuides, pointInPolygon, snapPoint, snapToGrid } from './snap';

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

test('computeAlignmentGuides snaps to neighbor center', () => {
  const moving = { id: 'a', x: 102, y: 50, width: 100, height: 80 };
  const other = { id: 'b', x: 0, y: 40, width: 100, height: 80 };
  const { dx, guides } = computeAlignmentGuides(moving, [other], 8);
  assert.ok(Math.abs(dx) <= 8);
  assert.ok(guides.some((g) => g.axis === 'x'));
});

test('pointInPolygon detects interior', () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  assert.equal(pointInPolygon({ x: 50, y: 50 }, poly), true);
  assert.equal(pointInPolygon({ x: 150, y: 50 }, poly), false);
});
