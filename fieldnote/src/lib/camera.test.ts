import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  fitTransform,
  formatZoomPercent,
  screenToWorld,
  worldToScreen,
  zoomAboutFocal,
} from './camera';

test('clampScale keeps zoom in near-infinite range', () => {
  assert.equal(clampScale(0.001), MIN_SCALE);
  assert.equal(clampScale(999), MAX_SCALE);
  assert.equal(clampScale(1), 1);
  assert.equal(clampScale(0.05), 0.05);
  assert.equal(clampScale(32), 32);
  assert.equal(clampScale(NaN), 1);
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
