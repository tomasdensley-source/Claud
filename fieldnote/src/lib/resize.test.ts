import assert from 'node:assert/strict';
import test from 'node:test';
import { computeResizeRect, ResizeRect } from './resize';

const start: ResizeRect = { x: 100, y: 100, width: 200, height: 150 };

test('bottom-right handle grows width/height, anchor at top-left', () => {
  const r = computeResizeRect('br', start, 40, 20, 80, 60);
  assert.deepEqual(r, { x: 100, y: 100, width: 240, height: 170 });
});

test('top-left handle moves x/y and shrinks from the opposite side', () => {
  const r = computeResizeRect('tl', start, 30, 10, 80, 60);
  assert.deepEqual(r, { x: 130, y: 110, width: 170, height: 140 });
});

test('top-right handle keeps left edge, moves top edge', () => {
  const r = computeResizeRect('tr', start, -20, 15, 80, 60);
  assert.deepEqual(r, { x: 100, y: 115, width: 180, height: 135 });
});

test('bottom-left handle keeps top edge, moves left edge', () => {
  const r = computeResizeRect('bl', start, 25, -10, 80, 60);
  assert.deepEqual(r, { x: 125, y: 100, width: 175, height: 140 });
});

test('clamps to minimum width without moving the opposite (anchor) corner', () => {
  // Dragging tl far to the right would shrink width past the minimum.
  const r = computeResizeRect('tl', start, 190, 0, 80, 60);
  assert.equal(r.x + r.width, start.x + start.width);
  assert.equal(r.width, 80);
});

test('clamps to minimum height without moving the anchor corner', () => {
  // Dragging tl far down would shrink height past the minimum.
  const r = computeResizeRect('tl', start, 0, 120, 80, 60);
  assert.equal(r.y + r.height, start.y + start.height);
  assert.equal(r.height, 60);
});

test('br handle clamps directly since its own corner is the anchor', () => {
  const r = computeResizeRect('br', start, -190, -120, 80, 60);
  assert.equal(r.x, start.x);
  assert.equal(r.y, start.y);
  assert.equal(r.width, 80);
  assert.equal(r.height, 60);
});
