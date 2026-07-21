import { describe, expect, it } from 'vitest';
import { PlacementEngine } from './placement';

describe('PlacementEngine', () => {
  it('places without overlapping registered floats', () => {
    const engine = new PlacementEngine();
    engine.setViewport(400, 800);
    engine.register('toolbar', { x: 12, y: 72, w: 54, h: 400 });
    const panel = engine.place({
      id: 'panel',
      w: 280,
      h: 200,
      prefer: 'tr',
      anchor: { x: 380, y: 80 },
      protect: [{ id: 'dot', x: 200, y: 40, w: 48, h: 48 }],
    });
    expect(panel.w).toBe(280);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    const toolbar = engine.get('toolbar')!;
    const overlap =
      !(
        panel.x + panel.w + 10 <= toolbar.x ||
        toolbar.x + toolbar.w + 10 <= panel.x ||
        panel.y + panel.h + 10 <= toolbar.y ||
        toolbar.y + toolbar.h + 10 <= panel.y
      );
    expect(overlap).toBe(false);
  });

  it('snaps toolbar to nearest edge', () => {
    const engine = new PlacementEngine();
    engine.setViewport(390, 844);
    const left = engine.snapToolbar(40, 100, 54, 400);
    expect(left.x).toBe(10);
    const right = engine.snapToolbar(300, 100, 54, 400);
    expect(right.x).toBe(390 - 54 - 10);
  });
});
