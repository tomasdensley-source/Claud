import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampScale,
  fitTransform,
  screenToWorld,
  worldToScreen,
  zoomAboutFocal,
} from './camera';

test('clampScale keeps zoom in range', () => {
  assert.equal(clampScale(0.01), 0.25);
  assert.equal(clampScale(9), 2.5);
  assert.equal(clampScale(1), 1);
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

test('zoomAboutFocal keeps focal world point pinned', () => {
  const prevScale = 1;
  const prevTx = 0;
  const prevTy = 0;
  const focalX = 180;
  const focalY = 240;
  const next = zoomAboutFocal(2, focalX, focalY, prevScale, prevTx, prevTy);
  const before = screenToWorld(focalX, focalY, prevScale, prevTx, prevTy);
  const after = screenToWorld(focalX, focalY, next.scale, next.tx, next.ty);
  assert.ok(Math.abs(before.x - after.x) < 0.001);
  assert.ok(Math.abs(before.y - after.y) < 0.001);
});

test('fitTransform centers content', () => {
  const t = fitTransform(400, 800, 0, 0, 200, 200, 0);
  assert.ok(t.scale > 0);
  const cx = screenToWorld(200, 400, t.scale, t.tx, t.ty);
  assert.ok(Math.abs(cx.x - 100) < 0.5);
  assert.ok(Math.abs(cx.y - 100) < 0.5);
});
