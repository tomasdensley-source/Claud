import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ELASTIC_MAX,
  ELASTIC_MIN,
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  fitTransform,
  formatZoomPercent,
  isPositiveFinite,
  screenToWorld,
  softClampScale,
  worldToScreen,
  zoomAboutFocal,
  zoomAboutStartFocal,
} from './camera';

test('clampScale keeps zoom in near-infinite range', () => {
  assert.equal(clampScale(0.001), MIN_SCALE);
  assert.equal(clampScale(999), MAX_SCALE);
  assert.equal(clampScale(1), 1);
  assert.equal(clampScale(0.05), 0.05);
  assert.equal(clampScale(32), 32);
  assert.equal(clampScale(NaN), 1);
  assert.equal(clampScale(-2), 1);
  assert.equal(clampScale(Infinity), 1);
});

test('isPositiveFinite rejects NaN Infinity and non-positive', () => {
  assert.equal(isPositiveFinite(1), true);
  assert.equal(isPositiveFinite(0.01), true);
  assert.equal(isPositiveFinite(0), false);
  assert.equal(isPositiveFinite(-1), false);
  assert.equal(isPositiveFinite(NaN), false);
  assert.equal(isPositiveFinite(Infinity), false);
});

test('softClampScale allows elastic overshoot then resists', () => {
  assert.ok(softClampScale(MIN_SCALE * 0.7) < MIN_SCALE);
  assert.ok(softClampScale(MIN_SCALE * 0.7) >= ELASTIC_MIN);
  assert.ok(softClampScale(MAX_SCALE * 1.2) > MAX_SCALE);
  assert.ok(softClampScale(MAX_SCALE * 1.2) <= ELASTIC_MAX);
  assert.equal(softClampScale(1), 1);
  assert.equal(softClampScale(NaN), 1);
});

test('screen/world round-trip', () => {
  const scale = 1.2;
  const tx = 40;
  const ty = -20;
  const world = screenToWorld(200, 300, scale, tx, ty);
  const screen = worldToScreen(world.x, world.y, scale, tx, ty);
  assert.ok(Math.abs(screen.x - 200) < 0.001);
  assert.ok(Math.abs(screen.y - 300) < 0.001);
});

test('zoomAboutFocal keeps focal world point pinned at deep zoom', () => {
  const prevScale = 0.05;
  const prevTx = 10;
  const prevTy = -30;
  const focalX = 180;
  const focalY = 240;
  const next = zoomAboutFocal(12, focalX, focalY, prevScale, prevTx, prevTy);
  const before = screenToWorld(focalX, focalY, prevScale, prevTx, prevTy);
  const after = screenToWorld(focalX, focalY, next.scale, next.tx, next.ty);
  assert.ok(Math.abs(before.x - after.x) < 0.001);
  assert.ok(Math.abs(before.y - after.y) < 0.001);
});

test('zoomAboutStartFocal follows midpoint drift without losing the start world point', () => {
  const prevScale = 1;
  const prevTx = 0;
  const prevTy = 0;
  const startFx = 100;
  const startFy = 100;
  const curFx = 140;
  const curFy = 80;
  const next = zoomAboutStartFocal(
    2,
    startFx,
    startFy,
    curFx,
    curFy,
    prevScale,
    prevTx,
    prevTy,
  );
  const world = screenToWorld(startFx, startFy, prevScale, prevTx, prevTy);
  const screen = worldToScreen(world.x, world.y, next.scale, next.tx, next.ty);
  assert.ok(Math.abs(screen.x - curFx) < 0.001);
  assert.ok(Math.abs(screen.y - curFy) < 0.001);
});

test('pure two-finger drift with scale≈1 still pans via start focal', () => {
  const next = zoomAboutStartFocal(1, 200, 200, 260, 180, 1, 0, 0);
  assert.equal(next.scale, 1);
  assert.ok(Math.abs(next.tx - 60) < 0.001);
  assert.ok(Math.abs(next.ty - -20) < 0.001);
});

test('fitTransform can zoom out below the old 25% floor', () => {
  const t = fitTransform(400, 800, 0, 0, 20000, 20000, 0);
  assert.ok(t.scale < 0.25);
  assert.ok(t.scale >= MIN_SCALE);
});

test('formatZoomPercent covers deep zoom labels', () => {
  assert.equal(formatZoomPercent(1), '100%');
  assert.equal(formatZoomPercent(0.05), '5.0%');
  assert.ok(formatZoomPercent(40).endsWith('%'));
});
