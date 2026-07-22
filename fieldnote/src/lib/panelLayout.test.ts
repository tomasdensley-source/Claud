import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampRectToSafeArea, intersects, resolveCollisions } from './panelLayout';

test('clampRectToSafeArea keeps panels inside insets', () => {
  const r = clampRectToSafeArea(
    { x: -40, y: -20, width: 100, height: 40 },
    { width: 400, height: 800 },
    { top: 24, right: 8, bottom: 16, left: 8 },
  );
  assert.ok(r.x >= 18);
  assert.ok(r.y >= 34);
});

test('intersects detects overlap with gap', () => {
  assert.equal(
    intersects(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 40, y: 40, width: 50, height: 50 },
    ),
    true,
  );
  assert.equal(
    intersects(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 100, y: 100, width: 20, height: 20 },
    ),
    false,
  );
});

test('resolveCollisions nudges overlapping panel', () => {
  const moving = { x: 20, y: 20, width: 80, height: 40 };
  const blocker = { x: 20, y: 20, width: 80, height: 40 };
  const next = resolveCollisions(
    moving,
    [blocker],
    { width: 400, height: 800 },
    { top: 0, right: 0, bottom: 0, left: 0 },
  );
  assert.equal(intersects(next, blocker), false);
});
